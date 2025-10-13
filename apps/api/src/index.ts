// IMPORTANTE: Cargar variables de entorno PRIMERO antes de cualquier otro import
import { config } from 'dotenv';
import { resolve } from 'node:path';

// Cargar .env desde el directorio local de la API
config();
console.log(`Current working directory: ${process.cwd()}`);

console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);

import { env } from './config/env';
import express, { type Request, type Response, type NextFunction } from 'express';
import pino from 'pino';
import pinoHttp from 'pino-http';
import usersRouter from './routes/users';
import authRouter from './routes/auth';
import etlRouter from './routes/etl';
import matchingPendingRouter from './routes/matching-pending';
import dataQueriesRouter from './routes/data-queries';
import kpiRouter from './routes/kpi';
import jobsRouter from './routes/jobs';
import contactsRouter from './routes/contacts';
import tasksRouter from './routes/tasks';
import tagsRouter from './routes/tags';
import pipelineRouter from './routes/pipeline';
import notificationsRouter from './routes/notifications';
import attachmentsRouter from './routes/attachments';
import notesRouter from './routes/notes';
import comparacionMensualRouter from './routes/comparacion-mensual';
import cors, { type CorsOptions } from 'cors';
import helmet from 'helmet';

const isProduction = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          singleLine: false
        }
      }
    : undefined
});

const app = express();
app.use(express.json());

// CORS config
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true); // allow non-browser or same-origin
    if (!isProduction) return callback(null, true);
    if (allowedOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};
app.use(cors(corsOptions));

// Helmet config (disable CSP by default unless provided)
app.use(helmet({
  contentSecurityPolicy: process.env.CSP_ENABLED === 'true' ? undefined : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(
  pinoHttp({
    logger,
    autoLogging: true,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers.set-cookie'],
      remove: true
    }
  })
);

app.get('/health', (req, res) => {
  req.log.info({ route: '/health' }, 'healthcheck');
  res.json({ ok: true });
});

app.get('/test-env', (req, res) => {
  res.json({
    cwd: process.cwd(),
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 30),
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT
  });
});

app.get('/test-db', async (req, res) => {
  try {
    // Test directo de conexión a PostgreSQL
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    const client = await pool.connect();
    const result = await client.query('SELECT 1 as test');
    client.release();
    await pool.end();
    
    res.json({ 
      ok: true, 
      connected: true,
      testResult: result.rows[0]
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error en test-db');
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
    });
  }
});

app.get('/test-cactus-db', async (req, res) => {
  try {
    const { db, users, matchingAudit } = await import('@cactus/db');
    
    console.log('Testing @cactus/db package...');
    console.log('db:', typeof db);
    console.log('users:', typeof users);
    console.log('matchingAudit:', typeof matchingAudit);
    
    if (!db || !users || !matchingAudit) {
      return res.status(500).json({ 
        error: 'Package @cactus/db not working correctly',
        db: !!db,
        users: !!users,
        matchingAudit: !!matchingAudit
      });
    }
    
    // Test simple query - db is now a function
    const dbInstance = db();
    const usersResult = await dbInstance.select().from(users).limit(1);
    const auditResult = await dbInstance.select().from(matchingAudit).limit(1);
    
    res.json({ 
      ok: true, 
      packageWorking: true,
      usersCount: usersResult.length,
      auditCount: auditResult.length,
      dbType: typeof db,
      dbInstanceType: typeof dbInstance
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error en test-cactus-db');
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
    });
  }
});

// Endpoint simple para testear ingesta de archivos Excel
app.post('/test-upload-cluster', async (req, res) => {
  try {
    // Test directo con PostgreSQL
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Verificar que las tablas existen
    const client = await pool.connect();
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('stg_cluster_cuentas', 'dim_client', 'fact_aum_snapshot')
      ORDER BY table_name
    `);
    
    client.release();
    await pool.end();
    
    res.json({
      ok: true,
      tablesFound: tablesResult.rows.map((r: any) => r.table_name),
      message: 'Tablas de ETL verificadas correctamente'
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error en test-upload-cluster');
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para testear lectura de archivo Excel específico
app.post('/test-read-excel', async (req, res) => {
  try {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    
    // Leer archivo Cluster Cuentas
    const filePath = resolve(process.cwd(), '../../reporteClusterCuentasV2.xlsx');
    const fileBuffer = readFileSync(filePath);
    
    // Parsear Excel
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet);
    
    res.json({
      ok: true,
      fileName: 'reporteClusterCuentasV2.xlsx',
      sheetName,
      rowCount: rawRows.length,
      sampleRow: rawRows[0],
      columns: Object.keys(rawRows[0] || {})
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error en test-read-excel');
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para testear lectura de archivo Comisiones
app.post('/test-read-comisiones', async (req, res) => {
  try {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    
    // Leer archivo Comisiones
    const filePath = resolve(process.cwd(), '../../Comisiones (2).xlsx');
    const fileBuffer = readFileSync(filePath);
    
    // Parsear Excel
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet);
    
    res.json({
      ok: true,
      fileName: 'Comisiones (2).xlsx',
      sheetName,
      rowCount: rawRows.length,
      sampleRow: rawRows[0],
      columns: Object.keys(rawRows[0] || {})
    });
  } catch (error) {
    req.log.error({ err: error }, 'Error en test-read-comisiones');
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para testear ingesta completa de Cluster Cuentas
app.post('/test-ingest-cluster', async (req, res) => {
  try {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const { Pool } = await import('pg');
    
    // Leer archivo Excel
    const filePath = resolve(process.cwd(), '../../reporteClusterCuentasV2.xlsx');
    const fileBuffer = readFileSync(filePath);
    
    // Parsear Excel
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`Procesando ${rawRows.length} filas de Cluster Cuentas...`);
    
    // Conectar a la base de datos
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Limpiar staging
      await client.query('DELETE FROM stg_cluster_cuentas');
      console.log('Staging limpio');
      
      // Insertar datos en staging (solo las primeras 10 filas para test)
      const testRows = rawRows.slice(0, 10);
      let insertedCount = 0;
      
      for (const row of testRows) {
        const insertQuery = `
          INSERT INTO stg_cluster_cuentas (
            idcuenta, comitente, cuotapartista, cuenta, fecha_alta, 
            es_juridica, asesor, equipo, unidad, arancel,
            esquema_comisiones, referidor, negocio, primer_fondeo,
            activo, activo_ult_12_meses, aum_en_dolares,
            bolsa_arg, fondos_arg, bolsa_bci, pesos, mep, cable,
            cv7000, cv10000, processed
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, false
          )
        `;
        
        await client.query(insertQuery, [
          (row as any).idcuenta,
          parseInt((row as any).comitente) || null,
          parseInt((row as any).cuotapartista) || null,
          (row as any).cuenta,
          (row as any).fechaAlta,
          (row as any).esJuridica,
          (row as any).asesor,
          (row as any).equipo,
          (row as any).unidad,
          (row as any).arancel,
          (row as any).esquemaComisiones,
          (row as any).referidor,
          (row as any).negocio,
          (row as any).primerFondeo,
          (row as any).activo,
          (row as any).activoUlt12Meses,
          parseFloat((row as any).aumEnDolares) || 0,
          parseFloat((row as any).bolsaArg) || 0,
          parseFloat((row as any).fondosArg) || 0,
          parseFloat((row as any).bolsaBci) || 0,
          parseFloat((row as any).pesos) || 0,
          parseFloat((row as any).mep) || 0,
          parseFloat((row as any).cable) || 0,
          parseFloat((row as any).cv7000) || 0,
          parseFloat((row as any).cv10000) || 0
        ]);
        
        insertedCount++;
      }
      
      // Verificar inserción
      const countResult = await client.query('SELECT COUNT(*) as count FROM stg_cluster_cuentas');
      
      res.json({
        ok: true,
        message: 'Ingesta de Cluster Cuentas completada',
        totalRows: rawRows.length,
        testRowsInserted: insertedCount,
        stagingCount: parseInt(countResult.rows[0].count),
        sampleData: testRows[0]
      });
      
    } finally {
      client.release();
      await pool.end();
    }
    
  } catch (error) {
    req.log.error({ err: error }, 'Error en test-ingest-cluster');
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
    });
  }
});

// Endpoint para testear ingesta completa de Comisiones
app.post('/test-ingest-comisiones', async (req, res) => {
  try {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const { Pool } = await import('pg');
    
    // Leer archivo Excel
    const filePath = resolve(process.cwd(), '../../Comisiones (2).xlsx');
    const fileBuffer = readFileSync(filePath);
    
    // Parsear Excel
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet);
    
    console.log(`Procesando ${rawRows.length} filas de Comisiones...`);
    
    // Conectar a la base de datos
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Limpiar staging
      await client.query('DELETE FROM stg_comisiones');
      console.log('Staging limpio');
      
      // Insertar datos en staging (solo las primeras 10 filas para test)
      const testRows = rawRows.slice(0, 10);
      let insertedCount = 0;
      
      for (const row of testRows) {
        const insertQuery = `
          INSERT INTO stg_comisiones (
            fecha_concertacion, comitente, cuotapartista, cuenta, tipo,
            descripcion, ticker, cantidad, precio, precio_ref,
            iva_comision, comision_pesificada, cotizacion_dolar, comision_dolarizada,
            asesor, cuil_asesor, equipo, unidad_de_negocio, productor,
            id_persona_asesor, referidor, arancel, esquema_comisiones,
            fecha_alta, porcentaje, cuit_facturacion, es_juridica, pais, processed
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, false
          )
        `;
        
        await client.query(insertQuery, [
          (row as any).FechaConcertacion ? new Date(((row as any).FechaConcertacion - 25569) * 86400 * 1000).toISOString().split('T')[0] : null,
          parseInt((row as any).Comitente) || null,
          parseInt((row as any).Cuotapartista) || null,
          (row as any).Cuenta,
          (row as any).Tipo,
          (row as any).Descripcion,
          (row as any).Ticker,
          parseFloat((row as any).Cantidad) || null,
          parseFloat((row as any).Precio) || null,
          parseFloat((row as any).PrecioRef) || null,
          parseFloat((row as any).IvaComision) || 0,
          parseFloat((row as any).ComisionPesificada) || 0,
          parseFloat((row as any).CotizacionDolar) || 0,
          parseFloat((row as any).ComisionDolarizada) || 0,
          (row as any).Asesor,
          (row as any).CuilAsesor,
          (row as any).Equipo,
          (row as any).UnidadDeNegocio,
          (row as any).Productor,
          parseInt((row as any).IdPersonaAsesor) || null,
          (row as any).Referidor,
          (row as any).Arancel,
          (row as any).EsquemaComisiones,
          (row as any).FechaAlta ? new Date(((row as any).FechaAlta - 25569) * 86400 * 1000).toISOString().split('T')[0] : null,
          parseFloat((row as any).Porcentaje) || null,
          (row as any).CuitFacturacion,
          (row as any).EsJuridica,
          (row as any).Pais
        ]);
        
        insertedCount++;
      }
      
      // Verificar inserción
      const countResult = await client.query('SELECT COUNT(*) as count FROM stg_comisiones');
      
      res.json({
        ok: true,
        message: 'Ingesta de Comisiones completada',
        totalRows: rawRows.length,
        testRowsInserted: insertedCount,
        stagingCount: parseInt(countResult.rows[0].count),
        sampleData: testRows[0]
      });
      
    } finally {
      client.release();
      await pool.end();
    }
    
  } catch (error) {
    req.log.error({ err: error }, 'Error en test-ingest-comisiones');
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
    });
  }
});

// Endpoint funcional para dashboard ETL (sin @cactus/db)
app.get('/etl/dashboard-simple', async (req, res) => {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Métricas de matching
      const matchingResult = await client.query(`
        SELECT 
          match_status,
          COUNT(*) as count
        FROM matching_audit 
        GROUP BY match_status
      `);
      
      // Métricas de staging
      const stagingResult = await client.query(`
        SELECT 
          'cluster_cuentas' as table_name,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE processed = true) as processed
        FROM stg_cluster_cuentas
        UNION ALL
        SELECT 
          'comisiones' as table_name,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE processed = true) as processed
        FROM stg_comisiones
      `);
      
      // Métricas de AUM y Comisiones
      const aumResult = await client.query(`
        SELECT 
          COALESCE(SUM(aum_usd), 0) as total_aum,
          COUNT(*) as client_count
        FROM fact_aum_snapshot
      `);
      
      const commissionResult = await client.query(`
        SELECT 
          COALESCE(SUM(comision_usd), 0) as total_commissions,
          COUNT(*) as transaction_count
        FROM fact_commission
      `);
      
      const dashboard = {
        matching: {
          stats: matchingResult.rows,
          totalRecords: matchingResult.rows.reduce((sum: number, row: any) => sum + parseInt(row.count), 0)
        },
        staging: stagingResult.rows,
        amounts: {
          totalAum: parseFloat(aumResult.rows[0]?.total_aum || '0'),
          totalCommissions: parseFloat(commissionResult.rows[0]?.total_commissions || '0'),
          clientCount: parseInt(aumResult.rows[0]?.client_count || '0'),
          transactionCount: parseInt(commissionResult.rows[0]?.transaction_count || '0')
        },
        timestamp: new Date().toISOString()
      };
      
      res.json(dashboard);
      
    } finally {
      client.release();
      await pool.end();
    }
    
  } catch (error) {
    req.log.error({ err: error }, 'Error en dashboard-simple');
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint funcional para matching pending (sin @cactus/db)
app.get('/matching-pending-simple', async (req, res) => {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Contar registros por estado de matching
      const pendingResult = await client.query(`
        SELECT 
          match_status,
          COUNT(*) as count
        FROM matching_audit 
        WHERE match_status IN ('pending', 'no_match', 'multi_match')
        GROUP BY match_status
      `);
      
      // Obtener registros pendientes con detalles
      const pendingDetails = await client.query(`
        SELECT 
          ma.id,
          ma.match_status,
          ma.source_table,
          ma.source_record_id,
          ma.confidence,
          ma.created_at,
          ma.resolved_at,
          ma.context
        FROM matching_audit ma
        WHERE ma.match_status IN ('pending', 'no_match', 'multi_match')
        ORDER BY ma.created_at DESC
        LIMIT 20
      `);
      
      const response = {
        summary: {
          pending: pendingResult.rows.find((r: any) => r.match_status === 'pending')?.count || 0,
          noMatch: pendingResult.rows.find((r: any) => r.match_status === 'no_match')?.count || 0,
          multiMatch: pendingResult.rows.find((r: any) => r.match_status === 'multi_match')?.count || 0,
          total: pendingDetails.rows.length
        },
        records: pendingDetails.rows,
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
      
    } finally {
      client.release();
      await pool.end();
    }
    
  } catch (error) {
    req.log.error({ err: error }, 'Error en matching-pending-simple');
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint funcional para KPIs de comisiones (sin @cactus/db)
app.get('/kpi/comisiones-simple', async (req, res) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({
        error: 'Parámetros "from" y "to" son requeridos',
        example: '/kpi/comisiones-simple?from=2025-01-01&to=2025-12-31'
      });
    }
    
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Total comisiones por período
      const totalResult = await client.query(`
        SELECT 
          COALESCE(SUM(comision_usd), 0) as total_usd,
          COALESCE(SUM(iva_ars), 0) as total_ars,
          COUNT(*) as transaction_count,
          COUNT(DISTINCT id_client) as unique_clients,
          COUNT(DISTINCT id_advisor_benef) as unique_advisors
        FROM fact_commission 
        WHERE fecha >= $1 AND fecha <= $2
      `, [from, to]);
      
      // Comisiones por asesor
      const byAdvisorResult = await client.query(`
        SELECT 
          id_advisor_benef,
          COALESCE(SUM(comision_usd), 0) as total_usd,
          COUNT(*) as transaction_count
        FROM fact_commission 
        WHERE fecha >= $1 AND fecha <= $2
        GROUP BY id_advisor_benef
        ORDER BY total_usd DESC
        LIMIT 10
      `, [from, to]);
      
      // Comisiones por día
      const byDayResult = await client.query(`
        SELECT 
          fecha,
          COALESCE(SUM(comision_usd), 0) as daily_usd,
          COUNT(*) as daily_transactions
        FROM fact_commission 
        WHERE fecha >= $1 AND fecha <= $2
        GROUP BY fecha
        ORDER BY fecha
      `, [from, to]);
      
      const response = {
        period: { from, to },
        summary: {
          totalUsd: parseFloat(totalResult.rows[0]?.total_usd || '0'),
          totalArs: parseFloat(totalResult.rows[0]?.total_ars || '0'),
          transactionCount: parseInt(totalResult.rows[0]?.transaction_count || '0'),
          uniqueClients: parseInt(totalResult.rows[0]?.unique_clients || '0'),
          uniqueAdvisors: parseInt(totalResult.rows[0]?.unique_advisors || '0')
        },
        topAdvisors: byAdvisorResult.rows.map((row: any) => ({
          advisorId: row.id_advisor_benef,
          totalUsd: parseFloat(row.total_usd),
          transactionCount: parseInt(row.transaction_count)
        })),
        dailyBreakdown: byDayResult.rows.map((row: any) => ({
          date: row.fecha,
          totalUsd: parseFloat(row.daily_usd),
          transactionCount: parseInt(row.daily_transactions)
        })),
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
      
    } finally {
      client.release();
      await pool.end();
    }
    
  } catch (error) {
    req.log.error({ err: error }, 'Error en kpi/comisiones-simple');
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para ver todos los matches (incluyendo exitosos)
app.get('/matching-all', async (req, res) => {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Obtener todos los registros de matching
      const allMatches = await client.query(`
        SELECT 
          ma.id,
          ma.match_status,
          ma.source_table,
          ma.source_record_id,
          ma.match_rule,
          ma.confidence,
          ma.created_at,
          ma.resolved_at,
          ma.context,
          ma.target_client_id,
          ma.target_advisor_id
        FROM matching_audit ma
        ORDER BY ma.created_at DESC
      `);
      
      // Contar por estado
      const statusCounts = await client.query(`
        SELECT 
          match_status,
          COUNT(*) as count
        FROM matching_audit 
        GROUP BY match_status
        ORDER BY match_status
      `);
      
      const response = {
        summary: statusCounts.rows.reduce((acc: Record<string, number>, row: any) => {
          acc[row.match_status] = parseInt(row.count);
          return acc;
        }, {} as Record<string, number>),
        totalRecords: allMatches.rows.length,
        records: allMatches.rows,
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
      
    } finally {
      client.release();
      await pool.end();
    }
    
  } catch (error) {
    req.log.error({ err: error }, 'Error en matching-all');
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para simular proceso de matching completo
app.post('/simulate-matching-process', async (req, res) => {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      console.log('Iniciando proceso de matching simulado...');
      
      // 1. Limpiar matching audit anterior
      await client.query('DELETE FROM matching_audit WHERE created_at > NOW() - INTERVAL \'1 hour\'');
      
      // 2. Simular matching de datos de staging
      const clusterData = await client.query(`
        SELECT 
          'stg_cluster_cuentas' as source_table,
          id::text as source_record_id,
          cuenta as client_name,
          asesor as advisor_name
        FROM stg_cluster_cuentas
        LIMIT 5
      `);
      
      const comisionesData = await client.query(`
        SELECT 
          'stg_comisiones' as source_table,
          id::text as source_record_id,
          cuenta as client_name,
          asesor as advisor_name
        FROM stg_comisiones
        LIMIT 5
      `);
      
      const stagingData = { rows: [...clusterData.rows, ...comisionesData.rows] };
      
      let processedCount = 0;
      const results = {
        matched: 0,
        pending: 0,
        noMatch: 0,
        multiMatch: 0
      };
      
      for (const row of stagingData.rows) {
        // Simular lógica de matching
        let matchStatus = 'no_match';
        let confidence = 0;
        let matchRule = null;
        
        // Simular diferentes escenarios
        if (processedCount % 4 === 0) {
          matchStatus = 'matched';
          confidence = 0.95;
          matchRule = 'P1_comitente';
        } else if (processedCount % 4 === 1) {
          matchStatus = 'pending';
          confidence = 0.75;
          matchRule = 'P3_cuenta_norm';
        } else if (processedCount % 4 === 2) {
          matchStatus = 'multi_match';
          confidence = 0.45;
          matchRule = 'P4_fuzzy';
        } else {
          matchStatus = 'no_match';
          confidence = 0.0;
          matchRule = null;
        }
        
        // Insertar en matching_audit
        await client.query(`
          INSERT INTO matching_audit (
            source_table, source_record_id, match_status, match_rule, 
            confidence, context, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [
          row.source_table,
          row.source_record_id,
          matchStatus,
          matchRule,
          confidence,
          JSON.stringify({
            client_name: row.client_name,
            advisor_name: row.advisor_name,
            processed_at: new Date().toISOString()
          })
        ]);
        
        results[matchStatus as keyof typeof results]++;
        processedCount++;
      }
      
      // 3. Actualizar flags de processed en staging
      await client.query(`
        UPDATE stg_cluster_cuentas 
        SET processed = true 
        WHERE id IN (
          SELECT source_record_id::uuid 
          FROM matching_audit 
          WHERE source_table = 'stg_cluster_cuentas' 
          AND created_at > NOW() - INTERVAL '1 hour'
        )
      `);
      
      await client.query(`
        UPDATE stg_comisiones 
        SET processed = true 
        WHERE id IN (
          SELECT source_record_id::uuid 
          FROM matching_audit 
          WHERE source_table = 'stg_comisiones' 
          AND created_at > NOW() - INTERVAL '1 hour'
        )
      `);
      
      // 4. Verificar resultados
      const finalCounts = await client.query(`
        SELECT match_status, COUNT(*) as count
        FROM matching_audit 
        WHERE created_at > NOW() - INTERVAL '1 hour'
        GROUP BY match_status
      `);
      
      res.json({
        success: true,
        message: 'Proceso de matching simulado completado',
        processedRecords: processedCount,
        results: finalCounts.rows,
        summary: {
          totalProcessed: processedCount,
          matchRate: `${((results.matched / processedCount) * 100).toFixed(1)}%`,
          pendingRate: `${((results.pending / processedCount) * 100).toFixed(1)}%`,
          noMatchRate: `${((results.noMatch / processedCount) * 100).toFixed(1)}%`,
          multiMatchRate: `${((results.multiMatch / processedCount) * 100).toFixed(1)}%`
        },
        timestamp: new Date().toISOString()
      });
      
    } finally {
      client.release();
      await pool.end();
    }
    
  } catch (error) {
    req.log.error({ err: error }, 'Error en simulate-matching-process');
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para ver solo los matches exitosos
app.get('/matching-successful', async (req, res) => {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Obtener solo los matches exitosos
      const successfulMatches = await client.query(`
        SELECT 
          ma.id,
          ma.match_status,
          ma.source_table,
          ma.source_record_id,
          ma.match_rule,
          ma.confidence,
          ma.created_at,
          ma.context,
          ma.target_client_id,
          ma.target_advisor_id
        FROM matching_audit ma
        WHERE ma.match_status = 'matched'
        ORDER BY ma.confidence DESC, ma.created_at DESC
      `);
      
      const response = {
        summary: {
          totalSuccessfulMatches: successfulMatches.rows.length,
          averageConfidence: successfulMatches.rows.length > 0 
            ? (successfulMatches.rows.reduce((sum: number, row: any) => sum + parseFloat(row.confidence || '0'), 0) / successfulMatches.rows.length).toFixed(3)
            : '0.000'
        },
        records: successfulMatches.rows,
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
      
    } finally {
      client.release();
      await pool.end();
    }
    
  } catch (error) {
    req.log.error({ err: error }, 'Error en matching-successful');
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para poblar datos de matching de prueba
app.post('/populate-test-matching', async (req, res) => {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Limpiar datos de prueba anteriores
      await client.query('DELETE FROM matching_audit WHERE created_at > NOW() - INTERVAL \'1 hour\'');
      
      // Insertar datos de prueba usando la estructura correcta de matching_audit
      const testData = [
        { source_table: 'stg_cluster_cuentas', source_record_id: '550e8400-e29b-41d4-a716-446655440001', status: 'pending', confidence: 0.85 },
        { source_table: 'stg_cluster_cuentas', source_record_id: '550e8400-e29b-41d4-a716-446655440002', status: 'no_match', confidence: 0.0 },
        { source_table: 'stg_comisiones', source_record_id: '550e8400-e29b-41d4-a716-446655440003', status: 'multi_match', confidence: 0.45 },
        { source_table: 'stg_cluster_cuentas', source_record_id: '550e8400-e29b-41d4-a716-446655440004', status: 'matched', confidence: 0.95 },
        { source_table: 'stg_comisiones', source_record_id: '550e8400-e29b-41d4-a716-446655440005', status: 'pending', confidence: 0.0 },
        { source_table: 'stg_cluster_cuentas', source_record_id: '550e8400-e29b-41d4-a716-446655440006', status: 'matched', confidence: 0.92 },
        { source_table: 'stg_comisiones', source_record_id: '550e8400-e29b-41d4-a716-446655440007', status: 'multi_match', confidence: 0.38 },
        { source_table: 'stg_cluster_cuentas', source_record_id: '550e8400-e29b-41d4-a716-446655440008', status: 'no_match', confidence: 0.0 }
      ];
      
      let insertedCount = 0;
      for (const data of testData) {
        await client.query(`
          INSERT INTO matching_audit (
            source_table, source_record_id, match_status, confidence, 
            context, created_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [data.source_table, data.source_record_id, data.status, data.confidence, '{}']);
        insertedCount++;
      }
      
      // Verificar inserción
      const countResult = await client.query(`
        SELECT match_status, COUNT(*) as count 
        FROM matching_audit 
        WHERE created_at > NOW() - INTERVAL '1 hour'
        GROUP BY match_status
      `);
      
      res.json({
        ok: true,
        message: 'Datos de matching de prueba insertados',
        insertedCount,
        summary: countResult.rows,
        timestamp: new Date().toISOString()
      });
      
    } finally {
      client.release();
      await pool.end();
    }
    
  } catch (error) {
    req.log.error({ err: error }, 'Error en populate-test-matching');
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Endpoint para verificar sistema de comparación mensual
app.get('/test-comparacion-mensual', async (req, res) => {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    
    try {
      // Verificar que las tablas del sistema existen
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
          'maestro_cuentas', 'staging_mensual', 'auditoria_cargas', 
          'diff_detalle', 'asignaciones_asesor', 'snapshots_maestro'
        )
        ORDER BY table_name
      `);
      
      // Verificar índices importantes
      const indexesResult = await client.query(`
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE tablename IN (
          'maestro_cuentas', 'staging_mensual', 'auditoria_cargas', 
          'diff_detalle', 'asignaciones_asesor', 'snapshots_maestro'
        )
        ORDER BY tablename, indexname
      `);
      
      // Verificar que no hay datos en staging (limpio)
      const stagingCountResult = await client.query(`
        SELECT COUNT(*) as count FROM staging_mensual
      `);
      
      // Verificar cargas recientes
      const cargasResult = await client.query(`
        SELECT COUNT(*) as count FROM auditoria_cargas
      `);
      
      res.json({
        ok: true,
        message: 'Sistema de comparación mensual verificado',
        tables: {
          found: tablesResult.rows.length,
          expected: 6,
          names: tablesResult.rows.map((r: any) => r.table_name)
        },
        indexes: {
          count: indexesResult.rows.length,
          details: indexesResult.rows
        },
        data: {
          stagingRecords: parseInt(stagingCountResult.rows[0].count),
          totalCargas: parseInt(cargasResult.rows[0].count)
        },
        status: tablesResult.rows.length === 6 ? 'READY' : 'INCOMPLETE',
        timestamp: new Date().toISOString()
      });
      
    } finally {
      client.release();
      await pool.end();
    }
    
  } catch (error) {
    req.log.error({ err: error }, 'Error en test-comparacion-mensual');
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
    });
  }
});

app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/etl', etlRouter);
app.use('/matching-pending', matchingPendingRouter);
app.use('/api', dataQueriesRouter); // Endpoints /api/aum y /api/comisiones
app.use('/kpi', kpiRouter);
app.use('/jobs', jobsRouter);
app.use('/contacts', contactsRouter);
app.use('/tasks', tasksRouter);
app.use('/tags', tagsRouter);
app.use('/pipeline', pipelineRouter);
app.use('/notifications', notificationsRouter);
app.use('/attachments', attachmentsRouter);
app.use('/notes', notesRouter);
app.use('/comparacion-mensual', comparacionMensualRouter);

// Error handler global - DEBE estar al final de todos los middlewares
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log del error
  req.log.error({ err, stack: err.stack }, 'Unhandled error in Express');
  
  // Siempre devolver JSON, nunca HTML
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown'
    });
  }
});

// 404 handler - también debe devolver JSON
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  logger.info({ port }, 'API listening');
  
  // Schedulers removidos
});


