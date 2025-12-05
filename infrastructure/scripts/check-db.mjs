import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

try {
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
  console.log('Tables in database:', tables.map(t => t.table_name).join(', '));
  
  const hasUsers = tables.some(t => t.table_name === 'users');
  console.log('Users table exists:', hasUsers);
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await sql.end();
}





