// Script para corregir el email de Nzappia (mayúscula vs minúscula)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixNzappiaEmail() {
  console.log('🔧 Corrigiendo email de Nzappia...');
  
  try {
    // Buscar el usuario con email incorrecto
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'Nzappia@grupoabax.com')
      .maybeSingle();
    
    if (findError) {
      console.error('❌ Error buscando usuario:', findError.message);
      return;
    }
    
    if (!user) {
      console.log('❌ Usuario con email incorrecto no encontrado');
      return;
    }
    
    console.log('✅ Usuario encontrado con email incorrecto:');
    console.log(`   - Email actual: ${user.email}`);
    console.log(`   - Nombre: ${user.full_name}`);
    console.log(`   - Rol: ${user.role}`);
    
    // Corregir el email a minúsculas
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        email: 'nzappia@grupoabax.com',
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
    
    if (updateError) {
      console.error('❌ Error actualizando email:', updateError.message);
      return;
    }
    
    console.log('✅ Email corregido exitosamente');
    
    // Verificación final
    const { data: updatedUser, error: verifyError } = await supabase
      .from('users')
      .select('email, full_name, role, is_approved')
      .eq('id', user.id)
      .single();
    
    if (verifyError) {
      console.error('❌ Error verificando actualización:', verifyError.message);
    } else {
      console.log('\n✅ Usuario actualizado:');
      console.log(`   ${updatedUser.full_name} <${updatedUser.email}> - Rol: ${updatedUser.role} - Aprobado: ${updatedUser.is_approved}`);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

fixNzappiaEmail().catch(console.error);