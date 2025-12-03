import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function runMigration(filename) {
  const filePath = join(__dirname, '../../packages/db/migrations', filename);
  console.log(`Running migration: ${filename}`);
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    // Split by statement breakpoint
    const statements = content.split('--> statement-breakpoint');
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (!stmt) continue;
      
      try {
        await sql.unsafe(stmt);
        process.stdout.write('.');
      } catch (e) {
        console.log(`\n  Stmt ${i+1} warning: ${e.message.slice(0, 100)}`);
      }
    }
    console.log(`\nDone: ${filename}`);
  } catch (e) {
    console.error(`Error reading ${filename}:`, e.message);
  }
}

// Run first migration only
await runMigration('0000_burly_wolfpack.sql');

// Check if users table exists now
const check = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'users'`;
console.log('Users table exists:', check.length > 0);

await sql.end();

