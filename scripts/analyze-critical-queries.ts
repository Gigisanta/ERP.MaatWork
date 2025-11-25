/**
 * Script para analizar queries críticas con EXPLAIN ANALYZE
 * 
 * Ejecuta EXPLAIN ANALYZE en las queries más lentas y genera reporte
 * con planes de ejecución y recomendaciones.
 */

import { db } from '../packages/db/src/index.js';
import { contacts, tasks, notes, brokerAccounts, aumSnapshots, brokerTransactions, brokerPositions, activityEvents } from '../packages/db/src/schema.js';
import { eq, and, isNull, sql, desc, inArray } from 'drizzle-orm';
import { explainQuery } from '../apps/api/src/utils/explain-analyzer.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface QueryAnalysis {
  name: string;
  description: string;
  query: string;
  explainResult: Awaited<ReturnType<typeof explainQuery>>;
}

async function analyzeCriticalQueries() {
  console.log('🔍 Analizando queries críticas con EXPLAIN ANALYZE...\n');

  try {
    // Obtener IDs de ejemplo de la base de datos
    const [sampleContact] = await db().select({ id: contacts.id }).from(contacts).limit(1);
    const [sampleUser] = await db()
      .select({ id: contacts.assignedAdvisorId })
      .from(contacts)
      .where(sql`${contacts.assignedAdvisorId} IS NOT NULL`)
      .limit(1);
    const [sampleAccount] = await db()
      .select({ id: brokerAccounts.id })
      .from(brokerAccounts)
      .limit(1);

    const contactId = sampleContact?.id || '00000000-0000-0000-0000-000000000000';
    const userId = sampleUser?.assignedAdvisorId || '00000000-0000-0000-0000-000000000000';
    const accountId = sampleAccount?.id || '00000000-0000-0000-0000-000000000000';

    const analyses: QueryAnalysis[] = [];

    // Query 1: Listado de contactos por advisor
    console.log('📊 Analizando Query 1: Listado de contactos por advisor...');
    const query1 = `
      SELECT *
      FROM contacts
      WHERE assigned_advisor_id = '${userId}'
        AND deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 50
    `;
    const explain1 = await explainQuery(query1);
    analyses.push({
      name: 'Listado de contactos por advisor',
      description: 'Query principal del endpoint GET /contacts',
      query: query1,
      explainResult: explain1
    });

    // Query 2: Timeline de notas por contacto
    console.log('📊 Analizando Query 2: Timeline de notas...');
    const query2 = `
      SELECT *
      FROM notes
      WHERE contact_id = '${contactId}'
        AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const explain2 = await explainQuery(query2);
    analyses.push({
      name: 'Timeline de notas por contacto',
      description: 'Query del endpoint GET /contacts/:id/detail (sección notas)',
      query: query2,
      explainResult: explain2
    });

    // Query 3: Tareas abiertas por usuario
    console.log('📊 Analizando Query 3: Tareas abiertas por usuario...');
    const query3 = `
      SELECT *
      FROM tasks
      WHERE assigned_to_user_id = '${userId}'
        AND status IN ('open', 'in_progress')
        AND deleted_at IS NULL
      ORDER BY due_date ASC
      LIMIT 50
    `;
    const explain3 = await explainQuery(query3);
    analyses.push({
      name: 'Tareas abiertas por usuario',
      description: 'Query del endpoint GET /tasks (dashboard)',
      query: query3,
      explainResult: explain3
    });

    // Query 4: Broker accounts por contacto
    console.log('📊 Analizando Query 4: Broker accounts por contacto...');
    const query4 = `
      SELECT *
      FROM broker_accounts
      WHERE contact_id = '${contactId}'
        AND status = 'active'
        AND deleted_at IS NULL
    `;
    const explain4 = await explainQuery(query4);
    analyses.push({
      name: 'Broker accounts por contacto',
      description: 'Query del endpoint GET /contacts/:id/detail (sección cuentas)',
      query: query4,
      explainResult: explain4
    });

    // Query 5: Transacciones por cuenta (histórico)
    console.log('📊 Analizando Query 5: Transacciones por cuenta...');
    const query5 = `
      SELECT *
      FROM broker_transactions
      WHERE broker_account_id = '${accountId}'
      ORDER BY trade_date DESC
      LIMIT 100
    `;
    const explain5 = await explainQuery(query5);
    analyses.push({
      name: 'Transacciones por cuenta',
      description: 'Query del endpoint GET /broker-accounts/:id/transactions',
      query: query5,
      explainResult: explain5
    });

    // Query 6: Posiciones por cuenta
    console.log('📊 Analizando Query 6: Posiciones por cuenta...');
    const query6 = `
      SELECT *
      FROM broker_positions
      WHERE broker_account_id = '${accountId}'
        AND as_of_date = (
          SELECT MAX(as_of_date)
          FROM broker_positions
          WHERE broker_account_id = '${accountId}'
        )
    `;
    const explain6 = await explainQuery(query6);
    analyses.push({
      name: 'Posiciones por cuenta (última fecha)',
      description: 'Query para obtener posiciones actuales de una cuenta',
      query: query6,
      explainResult: explain6
    });

    // Query 7: AUM snapshots por contacto
    console.log('📊 Analizando Query 7: AUM snapshots por contacto...');
    const query7 = `
      SELECT *
      FROM aum_snapshots
      WHERE contact_id = '${contactId}'
      ORDER BY date DESC
      LIMIT 30
    `;
    const explain7 = await explainQuery(query7);
    analyses.push({
      name: 'AUM snapshots por contacto',
      description: 'Query del endpoint GET /contacts/:id/aum-history',
      query: query7,
      explainResult: explain7
    });

    // Query 8: Activity events por usuario
    console.log('📊 Analizando Query 8: Activity events por usuario...');
    const query8 = `
      SELECT *
      FROM activity_events
      WHERE user_id = '${userId}'
      ORDER BY occurred_at DESC
      LIMIT 50
    `;
    const explain8 = await explainQuery(query8);
    analyses.push({
      name: 'Activity events por usuario',
      description: 'Query para timeline de actividad de usuario',
      query: query8,
      explainResult: explain8
    });

    // Generar reporte
    const report = {
      timestamp: new Date().toISOString(),
      analyses: analyses.map(a => ({
        name: a.name,
        description: a.description,
        query: a.query,
        executionTime: a.explainResult.executionTime,
        planningTime: a.explainResult.planningTime,
        totalCost: a.explainResult.totalCost,
        sequentialScans: a.explainResult.sequentialScans,
        indexScans: a.explainResult.indexScans,
        recommendations: a.explainResult.recommendations,
        plan: a.explainResult.plan
      }))
    };

    // Guardar reporte JSON
    const reportPath = join(process.cwd(), 'docs', 'EXPLAIN_ANALYSIS.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n✅ Reporte JSON guardado en: ${reportPath}`);

    // Generar reporte de texto legible
    const textReport = generateTextReport(report);
    const textReportPath = join(process.cwd(), 'docs', 'EXPLAIN_ANALYSIS.txt');
    writeFileSync(textReportPath, textReport, 'utf-8');
    console.log(`✅ Reporte de texto guardado en: ${textReportPath}`);

    // Mostrar resumen en consola
    console.log('\n📈 RESUMEN DEL ANÁLISIS:');
    console.log('='.repeat(80));
    report.analyses.forEach((a, i) => {
      console.log(`\n${i + 1}. ${a.name}`);
      console.log(`   Tiempo de ejecución: ${a.executionTime.toFixed(2)}ms`);
      console.log(`   Sequential scans: ${a.sequentialScans}`);
      console.log(`   Index scans: ${a.indexScans}`);
      if (a.recommendations.length > 0) {
        console.log(`   Recomendaciones: ${a.recommendations.length}`);
        a.recommendations.forEach(rec => console.log(`     - ${rec}`));
      }
    });

    console.log('\n✅ Análisis completado exitosamente');
  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
    throw error;
  }
}

function generateTextReport(report: any): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(80));
  lines.push('ANÁLISIS EXPLAIN ANALYZE DE QUERIES CRÍTICAS');
  lines.push(`Generado: ${report.timestamp}`);
  lines.push('='.repeat(80));
  lines.push('');

  report.analyses.forEach((a: any, i: number) => {
    lines.push(`${i + 1}. ${a.name}`);
    lines.push('-'.repeat(80));
    lines.push(`Descripción: ${a.description}`);
    lines.push(`Tiempo de ejecución: ${a.executionTime.toFixed(2)}ms`);
    lines.push(`Tiempo de planificación: ${a.planningTime.toFixed(2)}ms`);
    lines.push(`Costo total: ${a.totalCost.toFixed(2)}`);
    lines.push(`Sequential scans: ${a.sequentialScans}`);
    lines.push(`Index scans: ${a.indexScans}`);
    lines.push('');
    
    if (a.recommendations.length > 0) {
      lines.push('Recomendaciones:');
      a.recommendations.forEach((rec: string) => {
        lines.push(`  - ${rec}`);
      });
      lines.push('');
    }
    
    lines.push('Plan de ejecución:');
    lines.push(a.plan);
    lines.push('');
    lines.push('');
  });

  return lines.join('\n');
}

// Ejecutar análisis
analyzeCriticalQueries()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

