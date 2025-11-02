import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as schema from './schema';

// Cargar .env desde el directorio del paquete db si no está disponible
if (!process.env.DATABASE_URL) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  // En desarrollo, buscar .env en src/../.env
  // En producción compilado, buscar .env en dist/../.env
  const envPath = join(__dirname, '..', '.env');
  config({ path: envPath });
}

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
let _db: NodePgDatabase<typeof schema> | null = null;

export function db(): NodePgDatabase<typeof schema> {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}
