// Script para completar el registro de los advisors faltantes
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const missingUsers = [
  { username: 'Mvicente', email: 'mvicente@grupoabax.com' },
  { username: 'Nzappia', email: 'nzappia@grupoabax.com' }
];

async function fixMissingAdvisor({ username, email }) {
  console.log(`\n🔧 Arreglando advisor: ${username} <${email}>`);
  
  try {
    // Primero verificar si existe en Auth
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error(`❌ Error listando usuarios Auth:`, authError.message);
      return false;
    }
    
    const authUser = authUsers.users.find(u => u.email === email);
    if (!authUser) {
      console.log(`❌ Usuario no encontrado en Auth: ${email}`);
      return false;
    }
    
    console.log(`✅ Usuario encontrado en Auth: ${email} (ID: ${authUser.id})`);
    
    // Verificar si existe en tabla users
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('id', authUser.id)
      .maybeSingle();
    
    if (checkError) {
      console.error(`❌ Error verificando usuario en tabla users:`, checkError.message);
      return false;
    }
    
    if (existingUser) {
      if (existingUser.role === 'advisor') {
        console.log(`✅ Usuario ya existe como advisor: ${email}`);
        return true;
      } else {
        // Actualizar rol a advisor
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            role: 'advisor',
            is_approved: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', authUser.id);
        
        if (updateError) {
          console.error(`❌ Error actualizando rol:`, updateError.message);
          return false;
        }
        
        console.log(`✅ Rol actualizado a advisor: ${email}`);
        return true;
      }
    } else {
      // Crear perfil en tabla users
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: email,
          full_name: username,
          role: 'advisor',
          is_approved: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error(`❌ Error creando perfil:`, insertError.message);
        return false;
      }
      
      console.log(`✅ Perfil creado exitosamente: ${username}`);
      return true;
    }
    
  } catch (error) {
    console.error(`❌ Error general:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔧 Arreglando advisors faltantes...');
  
  const results = [];
  for (const user of missingUsers) {
    const success = await fixMissingAdvisor(user);
    results.push({ ...user, success });
  }
  
  console.log('\n📊 Resultados:');
  results.forEach(r => {
    console.log(`- ${r.username} <${r.email}> -> ${r.success ? '✅ ARREGLADO' : '❌ FALLÓ'}`);
  });
  
  // Verificación final
  console.log('\n🔍 Verificación final...');
  const { data: finalUsers, error: finalError } = await supabase
    .from('users')
    .select('email, full_name, role, is_approved')
    .eq('role', 'advisor')
    .in('email', missingUsers.map(u => u.email));
  
  if (finalError) {
    console.error('❌ Error en verificación final:', finalError.message);
  } else {
    console.log('\n👥 Usuarios advisor encontrados:');
    finalUsers.forEach(user => {
      console.log(`✅ ${user.full_name} <${user.email}> - Aprobado: ${user.is_approved}`);
    });
  }
}

main().catch(console.error);