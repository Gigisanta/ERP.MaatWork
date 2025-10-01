// Registro en bloque de usuarios Advisor en Supabase
// Ejecutar con: npm run seed:advisors

import { createClient } from '@supabase/supabase-js';

// Configuración (mismos valores que src/config/supabase.ts y scripts de debug)
const SUPABASE_URL = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDIyMDAsImV4cCI6MjA3MjUxODIwMH0.15QzSTr9KrkaBxuTptDjpusCXdv2CWCdA3gRI7WW0a8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Usuarios a crear (username, password, email)
const USERS = [
  { username: 'Mvicente', password: 'Mvicente123', email: 'Mvicente@grupoabax.com' },
  { username: 'Nzappia', password: 'Nzappia123', email: 'Nzappia@grupoabax.com' },
  { username: 'TDanziger', password: 'TDanziger123', email: 'Tdanziger@grupoabax.com' },
  { username: 'PMolina', password: 'PMolina123', email: 'Pmolina@grupoabax.com' },
  { username: 'NIngilde', password: 'NIngilde123', email: 'Ningilde@grupoabax.com' },
  { username: 'Fandreacchio', password: 'Fandreacchio123', email: 'Fandreacchio@grupoabax.com' }
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureProfile(userId, { fullName, email }) {
  // Crea el registro en tabla users aprobado y con rol advisor
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userId,
      email,
      full_name: fullName,
      role: 'advisor',
      is_approved: true,
      created_at: nowIso,
      updated_at: nowIso
    })
    .select()
    .single();

  if (error) {
    // Si ya existe, lo informamos y seguimos
    if (error.code === '23505' || (error.message || '').toLowerCase().includes('duplicate')) {
      console.log(`ℹ️ Perfil ya existente en users para ${email}`);
      return null;
    }
    throw error;
  }
  return data;
}

async function createAdvisor({ username, password, email }) {
  const fullName = username;
  const normalizedEmail = String(email).trim().toLowerCase();
  console.log(`\n➡️ Creando advisor: ${username} <${normalizedEmail}>`);

  // Si ya existe en tabla users, evitar signUp para no fallar por email duplicado
  const { data: existing, error: checkErr } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', normalizedEmail)
    .maybeSingle();
  if (checkErr) {
    console.warn(`⚠️ Error verificando existencia para ${email}:`, checkErr.message);
  }
  if (existing) {
    console.log(`✔️ Ya existe en users: ${normalizedEmail} (id: ${existing.id})`);
    return { created: false, reason: 'exists', id: existing.id };
  }

  // Registro en Auth (genera sesión del nuevo usuario)
  let authData, authError;
  for (let attempt = 0; attempt < 3; attempt++) {
    ({ data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          username,
          role: 'advisor'
        }
      }
    }));

    if (!authError) break;

    const msg = (authError.message || '').toLowerCase();
    // Manejo de rate limit de seguridad: "request this after N seconds"
    if (msg.includes('for security purposes')) {
      const match = authError.message.match(/after\s+(\d+)\s+seconds/i);
      const waitSeconds = match ? parseInt(match[1], 10) + 1 : 20;
      console.log(`⏳ Rate limit. Esperando ${waitSeconds}s antes de reintentar (intento ${attempt + 1}/3)...`);
      await sleep(waitSeconds * 1000);
      continue;
    }

    // Si el email ya está registrado
    if (msg.includes('registered') || msg.includes('exists') || msg.includes('duplicate') || msg.includes('already')) {
      console.log(`ℹ️ Email ya registrado en Auth: ${normalizedEmail}`);
      return { created: false, reason: 'auth_exists' };
    }

    // Error distinto: lanzar
    throw authError;
  }

  if (authError) {
    throw authError;
  }

  if (!authData?.user?.id) {
    throw new Error(`No se obtuvo id de usuario para ${email}`);
  }

  const userId = authData.user.id;
  // Cerrar sesión para quedar como anon ANTES de insertar en users (RLS permite insert a anon)
  await supabase.auth.signOut();
  // Pequeño delay por seguridad
  await sleep(300);
  // Crear perfil en tabla users como anon
  await ensureProfile(userId, { fullName, email: normalizedEmail });

  console.log(`✅ Advisor creado: ${username}`);
  return { created: true, id: authData.user.id };
}

async function main() {
  console.log('🚀 Inicio creación en bloque de advisors');

  const results = [];
  for (const u of USERS) {
    try {
      const res = await createAdvisor(u);
      results.push({ email: u.email, username: u.username, ...res });
      // Pequeño delay entre usuarios
      await sleep(300);
    } catch (err) {
      console.error(`❌ Error creando ${u.email}:`, err?.message || err);
      results.push({ email: u.email, username: u.username, created: false, reason: 'error', error: err?.message });
      // Intentar cerrar sesión por si quedó activa
      try { await supabase.auth.signOut(); } catch {}
    }
  }

  console.log('\n📊 Resultados:');
  for (const r of results) {
    console.log(`- ${r.username} <${r.email}> -> ${r.created ? 'CREADO' : `NO CREADO (${r.reason || 'unknown'})`}`);
  }
}

main().catch((e) => {
  console.error('💥 Error general:', e);
  process.exit(1);
});


