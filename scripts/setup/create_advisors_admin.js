// Creación persistente de Advisors usando la Service Role Key (admin)
// Requisitos:
//  - Definir variables de entorno:
//      SUPABASE_URL
//      SUPABASE_SERVICE_ROLE_KEY
//  - Ejecutar: node scripts/create_advisors_admin.js

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ Falta SUPABASE_SERVICE_ROLE_KEY en variables de entorno');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const USERS = [
  { username: 'Mvicente', password: 'Mvicente123', email: 'Mvicente@grupoabax.com' },
  { username: 'Nzappia', password: 'Nzappia123', email: 'Nzappia@grupoabax.com' },
  { username: 'TDanziger', password: 'TDanziger123', email: 'Tdanziger@grupoabax.com' },
  { username: 'PMolina', password: 'PMolina123', email: 'Pmolina@grupoabax.com' },
  { username: 'NIngilde', password: 'NIngilde123', email: 'Ningilde@grupoabax.com' },
  { username: 'Fandreacchio', password: 'Fandreacchio123', email: 'Fandreacchio@grupoabax.com' }
].map((u) => ({ ...u, email: u.email.toLowerCase() }));

async function upsertUserProfile(id, fullName, email) {
  const now = new Date().toISOString();
  const { error } = await admin
    .from('users')
    .upsert({
      id,
      email,
      full_name: fullName,
      role: 'advisor',
      is_approved: true,
      created_at: now,
      updated_at: now
    }, { onConflict: 'id' });
  if (error) throw error;
}

async function ensureAuthUser({ username, password, email }) {
  // intenta obtener por email
  const { data: existing, error: getErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (getErr) throw getErr;
  const found = existing.users.find((u) => (u.email || '').toLowerCase() === email);
  if (found) return found;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: username, username, role: 'advisor' }
  });
  if (error) throw error;
  return data.user;
}

async function main() {
  console.log('🚀 Creación persistente de advisors (admin)');
  const results = [];
  for (const u of USERS) {
    try {
      const authUser = await ensureAuthUser(u);
      await upsertUserProfile(authUser.id, u.username, u.email);
      results.push({ email: u.email, status: 'created', id: authUser.id });
      console.log(`✅ ${u.username} listo`);
    } catch (e) {
      console.error(`❌ Error con ${u.email}:`, e.message || e);
      results.push({ email: u.email, status: 'error', error: e.message });
    }
  }

  console.log('\n📊 Resumen:');
  results.forEach(r => console.log(`- ${r.email}: ${r.status}`));
}

main().catch((e) => {
  console.error('💥 Error general:', e);
  process.exit(1);
});



