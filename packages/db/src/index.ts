// Cargar .env si no está disponible
if (!process.env.DATABASE_URL) {
  const { config } = require('dotenv');
  config();
}

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
export * from './schema';

/**
 * Crea una conexión de base de datos utilizando PostgreSQL y Drizzle ORM.
 * 
 * Usa PostgreSQL para desarrollo y producción.
 * Requiere DATABASE_URL en las variables de entorno.
 * 
 * Devuelve una instancia de `db` tipada que expone métodos de consulta
 * y facilita el uso de esquemas definidos en Drizzle (`./schema`).
 * 
 * REGLA CURSOR: Mantener patrón singleton - no exponer createDb directamente
 */
function createDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  return drizzle(pool, { schema });
}

/**
 * db
 * Instancia principal de Drizzle ORM, construida sobre el pool de pg.
 * Usar esta export para realizar operaciones de lectura/escritura.
 * Se inicializa de forma lazy cuando se accede por primera vez.
 * 
 * REGLA CURSOR: Siempre usar db() para obtener instancia - no crear pools manuales
 */
let _db: any = null;

export function db() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}
