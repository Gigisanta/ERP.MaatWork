/**
 * Read Replica Support
 * 
 * AI_DECISION: Implementar read replicas para queries de solo lectura
 * Justificación: Read replicas distribuyen carga de lectura, mejoran performance de analytics y metrics
 * Impacto: Mejor escalabilidad, queries de solo lectura no bloquean escrituras, mejor performance
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

/**
 * Create read replica database connection
 * Uses READ_REPLICA_URL if available, falls back to DATABASE_URL
 */
function createReadReplicaDb() {
  const connectionString = process.env.READ_REPLICA_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('READ_REPLICA_URL or DATABASE_URL environment variable is required');
  }
  
  const pool = new Pool({
    connectionString,
    max: 10, // Fewer connections for read replicas
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    maxUses: 7500,
    allowExitOnIdle: false,
  });
  
  return drizzle(pool, { schema });
}

let _readReplicaDb: NodePgDatabase<typeof schema> | null = null;

/**
 * readReplicaDb
 * Instancia de Drizzle ORM para queries de solo lectura.
 * Usar esta función para queries de analytics, metrics, y reportes que no requieren escritura.
 * 
 * Si READ_REPLICA_URL está configurado, usa read replica.
 * Si no, usa la base de datos principal (fallback).
 * 
 * REGLA CURSOR: Usar readReplicaDb() solo para SELECT queries, nunca para INSERT/UPDATE/DELETE
 */
export function readReplicaDb(): NodePgDatabase<typeof schema> {
  if (!_readReplicaDb) {
    _readReplicaDb = createReadReplicaDb();
  }
  return _readReplicaDb;
}

/**
 * Check if read replica is available
 */
export function hasReadReplica(): boolean {
  return !!process.env.READ_REPLICA_URL;
}

