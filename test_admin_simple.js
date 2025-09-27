// Script simple para probar la creación de admin usando fetch nativo
const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDIyMDAsImV4cCI6MjA3MjUxODIwMH0.15QzSTr9KrkaBxuTptDjpusCXdv2CWCdA3gRI7WW0a8';

async function testHasExistingAdmins() {
  console.log('🧪 Probando función has_existing_admins...');
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/has_existing_admins`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error en la respuesta:', response.status, errorText);
      return false;
    }
    
    const result = await response.json();
    console.log('✅ Función ejecutada correctamente. Resultado:', result);
    return result;
    
  } catch (error) {
    console.error('💥 Error ejecutando función:', error.message);
    return false;
  }
}

async function testUserInsert() {
  console.log('\n🧪 Probando inserción de usuario admin...');
  
  const testUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'test.admin@cactus.com',
    full_name: 'Test Admin',
    role: 'admin',
    is_approved: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(testUser)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error insertando usuario:', response.status, errorText);
      return false;
    }
    
    const result = await response.json();
    console.log('✅ Usuario insertado correctamente:', result);
    
    // Limpiar el usuario de prueba
    console.log('🧹 Limpiando usuario de prueba...');
    const deleteResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${testUser.id}`, {
      method: 'DELETE',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (deleteResponse.ok) {
      console.log('✅ Usuario de prueba eliminado');
    } else {
      console.warn('⚠️ No se pudo eliminar el usuario de prueba');
    }
    
    return true;
    
  } catch (error) {
    console.error('💥 Error en inserción:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Iniciando pruebas de administrador inicial\n');
  
  // Probar función has_existing_admins
  const hasAdmins = await testHasExistingAdmins();
  
  // Solo probar inserción si no hay admins
  if (!hasAdmins) {
    await testUserInsert();
  } else {
    console.log('\n⏭️ Saltando prueba de inserción (ya existen admins)');
  }
  
  console.log('\n🎉 Pruebas completadas');
}

runTests();