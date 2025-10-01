const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';

// Cliente con service role para pruebas
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTagCreation() {
  console.log('🧪 Probando creación de etiquetas...');
  
  try {
    // 1. Obtener un usuario existente de public.users
    console.log('\n1. Obteniendo usuario existente...');
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, is_approved')
      .eq('is_approved', true)
      .limit(1)
      .single();
    
    if (userError) {
      console.error('❌ Error obteniendo usuario:', userError);
      return;
    }
    
    console.log('✅ Usuario encontrado:', existingUser.email);
    console.log('   User ID:', existingUser.id);
    
    // 2. Usuario ya verificado en el paso anterior
    console.log('\n2. Usuario verificado en public.users ✅');
    
    // 3. Intentar crear una etiqueta de prueba
    console.log('\n3. Creando etiqueta de prueba...');
    const testTag = {
      name: `Test Tag ${Date.now()}`,
      color: '#10B981',
      backgroundcolor: '#D1FAE5',
      created_by: existingUser.id
    };
    
    const { data: tagData, error: tagError } = await supabase
      .from('tags')
      .insert(testTag)
      .select()
      .single();
    
    if (tagError) {
      console.error('❌ Error creando etiqueta:', tagError);
      console.error('   Code:', tagError.code);
      console.error('   Message:', tagError.message);
      console.error('   Details:', tagError.details);
      return;
    }
    
    console.log('✅ Etiqueta creada exitosamente:', tagData);
    
    // 4. Verificar que la etiqueta se guardó correctamente
    console.log('\n4. Verificando etiqueta guardada...');
    const { data: savedTag, error: fetchError } = await supabase
      .from('tags')
      .select('*')
      .eq('id', tagData.id)
      .single();
    
    if (fetchError) {
      console.error('❌ Error obteniendo etiqueta guardada:', fetchError);
    } else {
      console.log('✅ Etiqueta verificada:', savedTag);
    }
    
    // 5. Limpiar - eliminar la etiqueta de prueba
    console.log('\n5. Limpiando etiqueta de prueba...');
    const { error: deleteError } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagData.id);
    
    if (deleteError) {
      console.error('⚠️  Error eliminando etiqueta de prueba:', deleteError);
    } else {
      console.log('✅ Etiqueta de prueba eliminada');
    }
    
    console.log('\n🎉 ¡Prueba de creación de etiquetas EXITOSA!');
    console.log('✅ El problema del foreign key constraint ha sido resuelto');
    
  } catch (error) {
    console.error('❌ Error general en la prueba:', error);
  }
}

testTagCreation();