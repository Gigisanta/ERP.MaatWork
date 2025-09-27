const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';

// Cliente con service role para acceso completo
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugUserExistence() {
  console.log('🔍 Verificando existencia de usuarios...');
  
  try {
    // 1. Verificar usuarios en auth.users
    console.log('\n1. Usuarios en auth.users:');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error obteniendo usuarios de auth:', authError);
    } else {
      console.log(`✅ Encontrados ${authUsers.users.length} usuarios en auth.users`);
      authUsers.users.forEach(user => {
        console.log(`   - ID: ${user.id}, Email: ${user.email}`);
      });
    }
    
    // 2. Verificar usuarios en public.users
    console.log('\n2. Usuarios en public.users:');
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id, email, full_name, is_approved');
    
    if (publicError) {
      console.error('❌ Error obteniendo usuarios de public.users:', publicError);
    } else {
      console.log(`✅ Encontrados ${publicUsers.length} usuarios en public.users`);
      publicUsers.forEach(user => {
        console.log(`   - ID: ${user.id}, Email: ${user.email}, Aprobado: ${user.is_approved}`);
      });
    }
    
    // 3. Comparar y encontrar usuarios faltantes
    if (authUsers && publicUsers) {
      console.log('\n3. Análisis de sincronización:');
      const authUserIds = new Set(authUsers.users.map(u => u.id));
      const publicUserIds = new Set(publicUsers.map(u => u.id));
      
      const missingInPublic = authUsers.users.filter(u => !publicUserIds.has(u.id));
      const missingInAuth = publicUsers.filter(u => !authUserIds.has(u.id));
      
      if (missingInPublic.length > 0) {
        console.log('⚠️  Usuarios en auth.users pero NO en public.users:');
        missingInPublic.forEach(user => {
          console.log(`   - ID: ${user.id}, Email: ${user.email}`);
        });
      }
      
      if (missingInAuth.length > 0) {
        console.log('⚠️  Usuarios en public.users pero NO en auth.users:');
        missingInAuth.forEach(user => {
          console.log(`   - ID: ${user.id}, Email: ${user.email}`);
        });
      }
      
      if (missingInPublic.length === 0 && missingInAuth.length === 0) {
        console.log('✅ Todos los usuarios están sincronizados correctamente');
      }
      
      // 4. Crear usuarios faltantes en public.users
      if (missingInPublic.length > 0) {
        console.log('\n4. Creando usuarios faltantes en public.users...');
        
        for (const authUser of missingInPublic) {
          const { data: insertedUser, error: insertError } = await supabase
            .from('users')
            .insert({
              id: authUser.id,
              email: authUser.email,
              full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
              role: 'advisor',
              is_approved: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select();
          
          if (insertError) {
            console.error(`❌ Error creando usuario ${authUser.email}:`, insertError);
          } else {
            console.log(`✅ Usuario creado: ${authUser.email}`);
          }
        }
      }
    }
    
    // 5. Verificar constraint de tags
    console.log('\n5. Verificando constraint de tags...');
    const { data: constraintInfo, error: constraintError } = await supabase
      .rpc('get_constraint_info', { table_name: 'tags', constraint_name: 'tags_created_by_fkey' })
      .single();
    
    if (constraintError && constraintError.code !== 'PGRST116') {
      // Si la función no existe, verificamos manualmente
      console.log('ℹ️  Verificando constraint manualmente...');
      const { data: constraints } = await supabase
        .from('information_schema.table_constraints')
        .select('*')
        .eq('table_name', 'tags')
        .eq('constraint_name', 'tags_created_by_fkey');
      
      console.log('Constraint info:', constraints);
    } else if (constraintInfo) {
      console.log('✅ Constraint info:', constraintInfo);
    }
    
    console.log('\n🎉 Diagnóstico completado!');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

debugUserExistence();