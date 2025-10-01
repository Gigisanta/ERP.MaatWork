// Script para crear advisors usando service role key
// Ejecutar con: node scripts/create_advisors_bulk.js

import { createClient } from '@supabase/supabase-js';

// Configuración con service role key para evitar RLS
const SUPABASE_URL = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Usuarios a crear (username, password, email)
const USERS = [
  { username: 'Mvicente', password: 'Mvicente123', email: 'mvicente@grupoabax.com' },
  { username: 'Nzappia', password: 'Nzappia123', email: 'nzappia@grupoabax.com' },
  { username: 'TDanziger', password: 'TDanziger123', email: 'tdanziger@grupoabax.com' },
  { username: 'PMolina', password: 'PMolina123', email: 'pmolina@grupoabax.com' },
  { username: 'NIngilde', password: 'NIngilde123', email: 'ningilde@grupoabax.com' },
  { username: 'Fandreacchio', password: 'Fandreacchio123', email: 'fandreacchio@grupoabax.com' }
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createAdvisor({ username, password, email }) {
  const fullName = username;
  const normalizedEmail = String(email).trim().toLowerCase();
  console.log(`\n➡️ Creando advisor: ${username} <${normalizedEmail}>`);

  try {
    // Verificar si ya existe en Auth
    const { data: existingAuth, error: checkAuthError } = await supabase.auth.admin.listUsers();
    if (!checkAuthError) {
      const userExists = existingAuth.users.find(u => u.email === normalizedEmail);
      if (userExists) {
        console.log(`ℹ️ Usuario ya existe en Auth: ${normalizedEmail}`);
        
        // Verificar si existe en tabla users
        const { data: existingUser, error: checkUserError } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', normalizedEmail)
          .maybeSingle();
        
        if (!checkUserError && existingUser) {
          console.log(`✔️ Usuario ya existe completamente: ${normalizedEmail}`);
          return { created: false, reason: 'exists', id: existingUser.id };
        }
        
        // Si existe en Auth pero no en users, crear el perfil
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .insert({
            id: userExists.id,
            email: normalizedEmail,
            full_name: fullName,
            role: 'advisor',
            is_approved: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (profileError) {
          console.error(`❌ Error creando perfil para ${normalizedEmail}:`, profileError.message);
          return { created: false, reason: 'profile_error', error: profileError.message };
        }
        
        console.log(`✅ Perfil creado para usuario existente: ${username}`);
        return { created: true, id: userExists.id };
      }
    }

    // Crear usuario en Auth usando admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        username,
        role: 'advisor'
      }
    });

    if (authError) {
      console.error(`❌ Error en Auth para ${normalizedEmail}:`, authError.message);
      return { created: false, reason: 'auth_error', error: authError.message };
    }

    if (!authData?.user?.id) {
      throw new Error(`No se obtuvo id de usuario para ${email}`);
    }

    const userId = authData.user.id;
    
    // Crear perfil en tabla users
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: normalizedEmail,
        full_name: fullName,
        role: 'advisor',
        is_approved: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error(`❌ Error creando perfil para ${normalizedEmail}:`, profileError.message);
      // Intentar eliminar el usuario de Auth si falló el perfil
      try {
        await supabase.auth.admin.deleteUser(userId);
        console.log(`🗑️ Usuario eliminado de Auth debido a error en perfil`);
      } catch (deleteError) {
        console.warn(`⚠️ No se pudo eliminar usuario de Auth:`, deleteError.message);
      }
      return { created: false, reason: 'profile_error', error: profileError.message };
    }

    console.log(`✅ Advisor creado exitosamente: ${username}`);
    return { created: true, id: userId };

  } catch (err) {
    console.error(`❌ Error general creando ${email}:`, err?.message || err);
    return { created: false, reason: 'error', error: err?.message };
  }
}

async function main() {
  console.log('🚀 Inicio creación en bloque de advisors con service role');

  const results = [];
  for (const u of USERS) {
    try {
      const res = await createAdvisor(u);
      results.push({ email: u.email, username: u.username, ...res });
      // Pequeño delay entre usuarios
      await sleep(500);
    } catch (err) {
      console.error(`❌ Error creando ${u.email}:`, err?.message || err);
      results.push({ email: u.email, username: u.username, created: false, reason: 'error', error: err?.message });
    }
  }

  console.log('\n📊 Resultados:');
  for (const r of results) {
    console.log(`- ${r.username} <${r.email}> -> ${r.created ? 'CREADO' : `NO CREADO (${r.reason || 'unknown'})`}`);
  }

  // Verificar usuarios creados
  console.log('\n🔍 Verificando usuarios en la base de datos...');
  const { data: users, error: listError } = await supabase
    .from('users')
    .select('email, full_name, role, is_approved')
    .eq('role', 'advisor')
    .in('email', USERS.map(u => u.email.toLowerCase()));

  if (listError) {
    console.error('❌ Error verificando usuarios:', listError.message);
  } else {
    console.log('\n👥 Usuarios advisor encontrados:');
    users.forEach(user => {
      console.log(`- ${user.full_name} <${user.email}> - Aprobado: ${user.is_approved}`);
    });
  }
}

main().catch((e) => {
  console.error('💥 Error general:', e);
  process.exit(1);
});