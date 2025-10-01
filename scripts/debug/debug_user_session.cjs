// Script para diagnosticar el problema de usuario autenticado
const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDIyMDAsImV4cCI6MjA3MjUxODIwMH0.15QzSTr9KrkaBxuTptDjpusCXdv2CWCdA3gRI7WW0a8';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function diagnosticUserSession() {
  console.log('🔍 DIAGNÓSTICO: Verificando sesión de usuario actual...');
  
  try {
    // 1. Verificar sesión actual
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Error obteniendo sesión:', sessionError);
      return;
    }
    
    if (!session) {
      console.log('⚠️ No hay sesión activa');
      return;
    }
    
    console.log('✅ Sesión activa encontrada:');
    console.log('   - User ID (auth.users):', session.user.id);
    console.log('   - Email:', session.user.email);
    console.log('   - Rol:', session.user.role);
    
    // 2. Verificar si el usuario existe en public.users
    const { data: publicUser, error: publicUserError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', session.user.id)
      .single();
    
    if (publicUserError) {
      console.error('❌ Usuario NO existe en public.users:', publicUserError);
      console.log('🔧 SOLUCIÓN: Necesitas crear el usuario en public.users');
      
      // Intentar crear el usuario en public.users
      console.log('🔄 Intentando crear usuario en public.users...');
      
      const newUserData = {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario',
        role: 'advisor', // rol por defecto
        is_approved: true // aprobar automáticamente
      };
      
      const { data: createdUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert([newUserData])
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creando usuario en public.users:', createError);
      } else {
        console.log('✅ Usuario creado exitosamente en public.users:', createdUser);
      }
    } else {
      console.log('✅ Usuario existe en public.users:', publicUser);
    }
    
    // 3. Probar creación de etiqueta
    console.log('\n🧪 Probando creación de etiqueta...');
    
    const tagData = {
      name: `Test Tag ${Date.now()}`,
      color: '#10B981',
      backgroundcolor: '#ECFDF5',
      created_by: session.user.id
    };
    
    const { data: newTag, error: tagError } = await supabase
      .from('tags')
      .insert([tagData])
      .select()
      .single();
    
    if (tagError) {
      console.error('❌ Error creando etiqueta:', tagError);
    } else {
      console.log('✅ Etiqueta creada exitosamente:', newTag);
      
      // Limpiar: eliminar la etiqueta de prueba
      await supabase.from('tags').delete().eq('id', newTag.id);
      console.log('🧹 Etiqueta de prueba eliminada');
    }
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
}

diagnosticUserSession();