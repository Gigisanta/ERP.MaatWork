// Script para crear un usuario de prueba en Supabase Auth
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase con service role para operaciones administrativas
const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTestUser() {
  console.log('🔧 CREANDO USUARIO DE PRUEBA EN SUPABASE AUTH');
  
  try {
    // Crear usuario usando Admin API
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: 'gio@test.com',
      password: 'Gio123',
      email_confirm: true // Confirmar email automáticamente
    });
    
    if (createError) {
      console.error('❌ Error creando usuario:', createError);
      return;
    }
    
    console.log('✅ Usuario creado exitosamente:', {
      id: user.user.id,
      email: user.user.email,
      created_at: user.user.created_at
    });
    
    // Ahora intentar crear una etiqueta con este usuario
    console.log('\n🏷️ PROBANDO CREACIÓN DE ETIQUETA CON USUARIO REAL');
    
    // Usar cliente normal con anon key pero simular autenticación
    const supabaseClient = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDIyMDAsImV4cCI6MjA3MjUxODIwMH0.15QzSTr9KrkaBxuTptDjpusCXdv2CWCdA3gRI7WW0a8');
    
    // Intentar login con el usuario recién creado
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: 'gio@test.com',
      password: 'Gio123'
    });
    
    if (loginError) {
      console.error('❌ Error en login:', loginError);
      return;
    }
    
    console.log('✅ Login exitoso con usuario real');
    
    // Intentar crear etiqueta
    const tagData = {
      name: `Real User Tag ${Date.now()}`,
      color: '#10B981',
      backgroundcolor: '#ECFDF5',
      created_by: loginData.user.id
    };
    
    const { data: tagResult, error: tagError } = await supabaseClient
      .from('tags')
      .insert(tagData)
      .select()
      .single();
    
    if (tagError) {
      console.error('❌ Error creando etiqueta:', tagError);
      console.log('📋 Detalles del error:', {
        code: tagError.code,
        message: tagError.message,
        details: tagError.details,
        hint: tagError.hint
      });
    } else {
      console.log('✅ Etiqueta creada exitosamente con usuario real:', tagResult);
    }
    
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

// Ejecutar la prueba
createTestUser();