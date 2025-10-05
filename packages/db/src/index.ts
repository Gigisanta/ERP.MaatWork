import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const cwd = process.cwd();
const envLocalPath = resolve(cwd, '.env.local');
const envPath = resolve(cwd, '.env');
config({ path: existsSync(envLocalPath) ? envLocalPath : envPath });
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
export * from './schema';

/**
 * Crea una conexión de base de datos utilizando node-postgres y Drizzle ORM.
 * 
 * Variables de entorno requeridas:
 * - DATABASE_URL: cadena de conexión a PostgreSQL.
 * 
 * Devuelve una instancia de `db` tipada que expone métodos de consulta
 * y facilita el uso de esquemas definidos en Drizzle (`./schema`).
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL no está definida en las variables de entorno');
}
const pool = new Pool({ connectionString });

/**
 * db
 * Instancia principal de Drizzle ORM, construida sobre el pool de pg.
 * Usar esta export para realizar operaciones de lectura/escritura.
 */
export const db = drizzle(pool);


