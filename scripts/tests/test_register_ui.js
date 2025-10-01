/**
 * Script para probar el registro de usuario y verificar el manejo de errores
 * Simula diferentes escenarios de error que pueden ocurrir en la app deployada
 */

import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase (usando las credenciales del proyecto)
const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDIyMDAsImV4cCI6MjA3MjUxODIwMH0.15QzSTr9KrkaBxuTptDjpusCXdv2CWCdA3gRI7WW0a8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRegistrationScenarios() {
  console.log('🧪 INICIANDO PRUEBAS DE REGISTRO UI');
  console.log('=' .repeat(50));

  // Escenario 1: Email inválido
  console.log('\n📧 PRUEBA 1: Email inválido');
  try {
    const { data, error } = await supabase.auth.signUp({
      email: 'email-invalido',
      password: 'password123'
    });
    
    if (error) {
      console.log('❌ Error esperado:', error.message);
      console.log('🔍 Tipo de error:', error.status);
    } else {
      console.log('⚠️  No se produjo error (inesperado)');
    }
  } catch (err) {
    console.log('❌ Error capturado:', err.message);
  }

  // Escenario 2: Usuario ya existente
  console.log('\n👤 PRUEBA 2: Usuario ya existente');
  try {
    const { data, error } = await supabase.auth.signUp({
      email: 'testadvisor@gmail.com', // Email que ya usamos en el debug
      password: 'password123'
    });
    
    if (error) {
      console.log('❌ Error esperado:', error.message);
      console.log('🔍 Tipo de error:', error.status);
    } else {
      console.log('⚠️  No se produjo error (inesperado)');
    }
  } catch (err) {
    console.log('❌ Error capturado:', err.message);
  }

  // Escenario 3: Contraseña muy débil
  console.log('\n🔒 PRUEBA 3: Contraseña muy débil');
  try {
    const { data, error } = await supabase.auth.signUp({
      email: 'test.weak.password@gmail.com',
      password: '123' // Contraseña muy débil
    });
    
    if (error) {
      console.log('❌ Error esperado:', error.message);
      console.log('🔍 Tipo de error:', error.status);
    } else {
      console.log('⚠️  No se produjo error (inesperado)');
    }
  } catch (err) {
    console.log('❌ Error capturado:', err.message);
  }

  // Escenario 4: Probar conexión a la base de datos
  console.log('\n🗄️  PRUEBA 4: Conexión a base de datos');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (error) {
      console.log('❌ Error de conexión:', error.message);
      console.log('🔍 Detalles:', error.details);
      console.log('🔍 Hint:', error.hint);
    } else {
      console.log('✅ Conexión a BD exitosa');
      console.log('📊 Datos obtenidos:', data?.length || 0, 'registros');
    }
  } catch (err) {
    console.log('❌ Error capturado:', err.message);
  }

  // Escenario 5: Simular registro completo exitoso (con cleanup)
  console.log('\n✅ PRUEBA 5: Registro exitoso simulado');
  const testEmail = `test.ui.${Date.now()}@gmail.com`;
  
  try {
    console.log('🔄 Creando usuario de prueba:', testEmail);
    
    // Crear usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'TestPassword123!'
    });
    
    if (authError) {
      console.log('❌ Error en Auth:', authError.message);
      return;
    }
    
    console.log('✅ Usuario creado en Auth:', authData.user?.id);
    
    // Intentar crear perfil de usuario
    if (authData.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: testEmail,
          full_name: 'Test UI User',
          role: 'advisor',
          phone: '+1234567890',
          is_approved: true
        })
        .select()
        .single();
      
      if (profileError) {
        console.log('❌ Error creando perfil:', profileError.message);
        console.log('🔍 Detalles:', profileError.details);
      } else {
        console.log('✅ Perfil creado exitosamente:', profileData.id);
        
        // Cleanup: eliminar el usuario de prueba
        console.log('🧹 Limpiando usuario de prueba...');
        await supabase.from('users').delete().eq('id', authData.user.id);
        console.log('✅ Usuario de prueba eliminado');
      }
    }
    
  } catch (err) {
    console.log('❌ Error en registro simulado:', err.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🏁 PRUEBAS COMPLETADAS');
  console.log('\n💡 RECOMENDACIONES:');
  console.log('1. Verificar que los mensajes de error se muestren en la UI');
  console.log('2. Comprobar que el estado de loading se maneje correctamente');
  console.log('3. Asegurar que los errores no causen recargas de página');
  console.log('4. Validar que los errores de red se capturen apropiadamente');
}

// Ejecutar las pruebas
testRegistrationScenarios().catch(console.error);