// Script de debug para probar la creación de contactos
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase (mismas credenciales que el proyecto)
const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDIyMDAsImV4cCI6MjA3MjUxODIwMH0.15QzSTr9KrkaBxuTptDjpusCXdv2CWCdA3gRI7WW0a8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testContactCreation() {
  console.log('🔍 Iniciando prueba de creación de contacto...');
  
  // Verificar conexión
  console.log('📡 Verificando conexión a Supabase...');
  const { data: connectionTest, error: connectionError } = await supabase
    .from('contacts')
    .select('count')
    .limit(1);
  
  if (connectionError) {
    console.error('❌ Error de conexión:', connectionError);
    return;
  }
  
  console.log('✅ Conexión exitosa');
  
  // Verificar autenticación
  console.log('🔐 Verificando estado de autenticación...');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    console.error('❌ Error de autenticación:', authError);
  }
  
  console.log('👤 Usuario actual:', user ? user.email : 'No autenticado');
  
  // Intentar crear contacto de prueba
  console.log('📝 Intentando crear contacto de prueba...');
  
  const testContact = {
    name: 'Test Contact Debug',
    email: `test-${Date.now()}@example.com`,
    phone: '+54 9 11 1234-5678',
    company: 'Test Company',
    status: 'Prospecto',
    assigned_to: user ? user.email : 'test@example.com',
    value: 0,
    stage: 'initial',
    notes: []
  };
  
  console.log('📋 Datos del contacto:', testContact);
  
  const { data, error } = await supabase
    .from('contacts')
    .insert([testContact])
    .select();
  
  if (error) {
    console.error('❌ Error al crear contacto:', error);
    console.error('📄 Detalles del error:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
  } else {
    console.log('✅ Contacto creado exitosamente:', data);
  }
  
  // Verificar permisos RLS
  console.log('🔒 Verificando permisos RLS...');
  const { data: selectTest, error: selectError } = await supabase
    .from('contacts')
    .select('*')
    .limit(1);
    
  if (selectError) {
    console.error('❌ Error de permisos SELECT:', selectError);
  } else {
    console.log('✅ Permisos SELECT funcionando');
  }
}

// Ejecutar la prueba
testContactCreation().catch(console.error);