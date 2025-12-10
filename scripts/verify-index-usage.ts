/**
 * Script para verificar uso de índices en queries críticas
 *
 * Ejecuta EXPLAIN ANALYZE en queries importantes para verificar que los índices
 * se están utilizando correctamente.
 */

import { db } from '../packages/db/src/index.js';
import {
  contacts,
  tasks,
  notes,
  aumImportRows,
  brokerAccounts,
  aumSnapshots,
  dailyMetricsUser,
} from '../packages/db/src/schema.js';
import { eq, and, isNull, inArray, sql, gte } from 'drizzle-orm';

async function verifyIndexUsage() {
  console.log('🔍 Verificando uso de índices en queries críticas...\n');

  try {
    // Obtener algunos IDs de ejemplo de la base de datos
    const [sampleContact] = await db().select({ id: contacts.id }).from(contacts).limit(1);
    const [sampleUser] = await db()
      .select({ id: contacts.assignedAdvisorId })
      .from(contacts)
      .where(sql`${contacts.assignedAdvisorId} IS NOT NULL`)
      .limit(1);
    const [sampleAumRow] = await db()
      .select({ accountNumber: aumImportRows.accountNumber })
      .from(aumImportRows)
      .where(sql`${aumImportRows.accountNumber} IS NOT NULL`)
      .limit(1);

    const contactId = sampleContact?.id || '00000000-0000-0000-0000-000000000000';
    const userId = sampleUser?.assignedAdvisorId || '00000000-0000-0000-0000-000000000000';
    const accountNumber = sampleAumRow?.accountNumber || 'TEST123';

    console.log('📊 Query 1: GET /contacts (listado principal)');
    console.log('Índice esperado: idx_contacts_advisor_deleted_updated\n');
    const explain1 = await db().execute(sql`
      EXPLAIN ANALYZE
      SELECT *
      FROM contacts
      WHERE assigned_advisor_id = ${userId}
        AND deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 50
    `);
    console.log(explain1.rows.map((r: { 'QUERY PLAN': string }) => r['QUERY PLAN']).join('\n'));
    console.log('\n');

    console.log('📊 Query 2: GET /tasks (tareas abiertas por usuario)');
    console.log('Índice esperado: idx_tasks_open_by_user\n');
    const explain2 = await db().execute(sql`
      EXPLAIN ANALYZE
      SELECT *
      FROM tasks
      WHERE assigned_to_user_id = ${userId}
        AND status IN ('open', 'in_progress')
        AND deleted_at IS NULL
      ORDER BY due_date
      LIMIT 50
    `);
    console.log(explain2.rows.map((r: { 'QUERY PLAN': string }) => r['QUERY PLAN']).join('\n'));
    console.log('\n');

    console.log('📊 Query 3: GET /contacts/:id/detail (timeline de notas)');
    console.log('Índice esperado: idx_notes_contact_created_desc\n');
    const explain3 = await db().execute(sql`
      EXPLAIN ANALYZE
      SELECT *
      FROM notes
      WHERE contact_id = ${contactId}
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    `);
    console.log(explain3.rows.map((r: { 'QUERY PLAN': string }) => r['QUERY PLAN']).join('\n'));
    console.log('\n');

    console.log('📊 Query 4: AUM Matching (por status y account)');
    console.log('Índice esperado: idx_aum_rows_match_status_account\n');
    const explain4 = await db().execute(sql`
      EXPLAIN ANALYZE
      SELECT *
      FROM aum_import_rows
      WHERE match_status = 'unmatched'
        AND account_number = ${accountNumber}
        AND is_preferred = true
      LIMIT 100
    `);
    console.log(explain4.rows.map((r: { 'QUERY PLAN': string }) => r['QUERY PLAN']).join('\n'));
    console.log('\n');

    console.log('📊 Query 5: Broker Accounts por Contacto');
    console.log('Índice esperado: idx_broker_accounts_contact_status\n');
    const explain5 = await db().execute(sql`
      EXPLAIN ANALYZE
      SELECT *
      FROM broker_accounts
      WHERE contact_id = ${contactId}
        AND status = 'active'
        AND deleted_at IS NULL
    `);
    console.log(explain5.rows.map((r: { 'QUERY PLAN': string }) => r['QUERY PLAN']).join('\n'));
    console.log('\n');

    console.log('📊 Query 6: AUM Snapshots por Contacto');
    console.log('Índice esperado: idx_aum_snapshots_contact_date\n');
    const explain6 = await db().execute(sql`
      EXPLAIN ANALYZE
      SELECT *
      FROM aum_snapshots
      WHERE contact_id = ${contactId}
      ORDER BY date DESC
      LIMIT 30
    `);
    console.log(explain6.rows.map((r: { 'QUERY PLAN': string }) => r['QUERY PLAN']).join('\n'));
    console.log('\n');

    console.log('📊 Query 7: Daily Metrics por Usuario');
    console.log('Índice esperado: idx_daily_metrics_user_date\n');
    const explain7 = await db().execute(sql`
      EXPLAIN ANALYZE
      SELECT *
      FROM daily_metrics_user
      WHERE user_id = ${userId}
      ORDER BY date DESC
      LIMIT 30
    `);
    console.log(explain7.rows.map((r: { 'QUERY PLAN': string }) => r['QUERY PLAN']).join('\n'));
    console.log('\n');

    // Verificar índices no utilizados
    console.log('📊 Verificando índices no utilizados...\n');
    const unusedIndexes = await db().execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size
      FROM pg_stat_user_indexes
      WHERE idx_scan = 0
        AND indexname LIKE 'idx_%'
      ORDER BY pg_relation_size(indexrelid) DESC
      LIMIT 20
    `);

    if (unusedIndexes.rows.length > 0) {
      console.log('⚠️  Índices no utilizados encontrados:');
      console.table(unusedIndexes.rows);
    } else {
      console.log('✅ Todos los índices han sido utilizados al menos una vez\n');
    }

    // Verificar uso de índices específicos agregados
    console.log('📊 Verificando uso de índices específicos agregados...\n');
    const newIndexesUsage = await db().execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes
      WHERE indexname IN (
        'idx_contacts_advisor_deleted_updated',
        'idx_tasks_open_by_user',
        'idx_notes_contact_created_desc',
        'idx_aum_rows_match_status_account',
        'idx_broker_accounts_contact_status',
        'idx_aum_snapshots_contact_date',
        'idx_daily_metrics_user_date'
      )
      ORDER BY idx_scan DESC
    `);

    console.log('Uso de índices nuevos:');
    console.table(newIndexesUsage.rows);

    // Generar reporte completo
    const report = {
      timestamp: new Date().toISOString(),
      unusedIndexes: unusedIndexes.rows,
      indexUsage: newIndexesUsage.rows,
      summary: {
        totalUnusedIndexes: unusedIndexes.rows.length,
        totalIndexesChecked: newIndexesUsage.rows.length,
        indexesWithScans: newIndexesUsage.rows.filter((r: any) => r.idx_scan > 0).length,
      },
    };

    // Guardar reporte JSON
    const { writeFileSync } = await import('fs');
    const { join } = await import('path');
    const reportPath = join(process.cwd(), 'docs', 'INDEX_USAGE_REPORT.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n✅ Reporte guardado en: ${reportPath}`);

    // Generar reporte de texto
    const textReport = generateTextReport(report);
    const textReportPath = join(process.cwd(), 'docs', 'INDEX_USAGE_REPORT.txt');
    writeFileSync(textReportPath, textReport, 'utf-8');
    console.log(`✅ Reporte de texto guardado en: ${textReportPath}`);

    console.log('\n✅ Verificación completada');
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
    throw error;
  }
}

function generateTextReport(report: any): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push('REPORTE DE USO DE ÍNDICES');
  lines.push(`Generado: ${report.timestamp}`);
  lines.push('='.repeat(80));
  lines.push('');

  lines.push('RESUMEN:');
  lines.push(`  Total de índices no utilizados: ${report.summary.totalUnusedIndexes}`);
  lines.push(`  Total de índices verificados: ${report.summary.totalIndexesChecked}`);
  lines.push(`  Índices con uso: ${report.summary.indexesWithScans}`);
  lines.push('');

  if (report.unusedIndexes.length > 0) {
    lines.push('ÍNDICES NO UTILIZADOS:');
    lines.push('-'.repeat(80));
    report.unusedIndexes.forEach((idx: any) => {
      lines.push(`  ${idx.indexname} (${idx.tablename})`);
      lines.push(`    Tamaño: ${idx.index_size}`);
      lines.push('');
    });
  }

  lines.push('USO DE ÍNDICES ESPECÍFICOS:');
  lines.push('-'.repeat(80));
  report.indexUsage.forEach((idx: any) => {
    lines.push(`  ${idx.indexname} (${idx.tablename})`);
    lines.push(`    Escaneos: ${idx.idx_scan}`);
    lines.push(`    Tuplas leídas: ${idx.idx_tup_read}`);
    lines.push(`    Tuplas obtenidas: ${idx.idx_tup_fetch}`);
    lines.push('');
  });

  return lines.join('\n');
}

// Ejecutar verificación
verifyIndexUsage()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
