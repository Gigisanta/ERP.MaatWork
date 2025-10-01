// Script para debuggear específicamente el usuario Nzappia
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function debugNzappia() {
  const email = 'nzappia@grupoabax.com';
  console.log(`🔍 Debuggeando usuario: ${email}`);
  
  try {
    // 1. Verificar en Auth
    console.log('\n1️⃣ Verificando en Supabase Auth...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('❌ Error listando usuarios Auth:', authError.message);
      return;
    }
    
    const authUser = authUsers.users.find(u => u.email === email);
    if (!authUser) {
      console.log('❌ Usuario NO encontrado en Auth');
      return;
    }
    
    console.log(`✅ Usuario encontrado en Auth:`);
    console.log(`   - ID: ${authUser.id}`);
    console.log(`   - Email: ${authUser.email}`);
    console.log(`   - Confirmado: ${authUser.email_confirmed_at ? 'Sí' : 'No'}`);
    console.log(`   - Creado: ${authUser.created_at}`);
    
    // 2. Verificar en tabla users
    console.log('\n2️⃣ Verificando en tabla users...');
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    
    if (profileError) {
      console.error('❌ Error consultando perfil:', profileError.message);
      return;
    }
    
    if (!userProfile) {
      console.log('❌ Perfil NO encontrado en tabla users');
      
      // Crear el perfil
      console.log('\n3️⃣ Creando perfil en tabla users...');
      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.id,
          email: email,
          full_name: 'Nzappia',
          role: 'advisor',
          is_approved: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Error creando perfil:', insertError.message);
        return;
      }
      
      console.log('✅ Perfil creado exitosamente:');
      console.log(newProfile);
      
    } else {
      console.log('✅ Perfil encontrado en tabla users:');
      console.log(`   - ID: ${userProfile.id}`);
      console.log(`   - Email: ${userProfile.email}`);
      console.log(`   - Nombre: ${userProfile.full_name}`);
      console.log(`   - Rol: ${userProfile.role}`);
      console.log(`   - Aprobado: ${userProfile.is_approved}`);
      
      if (userProfile.role !== 'advisor') {
        console.log('\n3️⃣ Actualizando rol a advisor...');
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            role: 'advisor',
            is_approved: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', authUser.id);
        
        if (updateError) {
          console.error('❌ Error actualizando rol:', updateError.message);
        } else {
          console.log('✅ Rol actualizado a advisor');
        }
      }
    }
    
    // 4. Verificación final
    console.log('\n4️⃣ Verificación final...');
    const { data: finalCheck, error: finalError } = await supabase
      .from('users')
      .select('email, full_name, role, is_approved')
      .eq('email', email)
      .maybeSingle();
    
    if (finalError) {
      console.error('❌ Error en verificación final:', finalError.message);
    } else if (finalCheck) {
      console.log('✅ Usuario verificado:');
      console.log(`   ${finalCheck.full_name} <${finalCheck.email}> - Rol: ${finalCheck.role} - Aprobado: ${finalCheck.is_approved}`);
    } else {
      console.log('❌ Usuario aún no encontrado después del proceso');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

debugNzappia().catch(console.error);