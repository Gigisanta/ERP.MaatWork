const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupTestData() {
  console.log('🧹 Limpiando datos de prueba...');
  
  try {
    // Limpiar usuarios de prueba
    const testEmailPatterns = [
      '%@test.com',
      '%concurrent_user%',
      '%perf-user%',
      '%stress-user%',
      '%test-user%'
    ];
    
    for (const pattern of testEmailPatterns) {
      const { error } = await supabase
        .from('users')
        .delete()
        .like('email', pattern);
      
      if (error) {
        console.log(`⚠️  Error limpiando patrón ${pattern}:`, error.message);
      } else {
        console.log(`✅ Limpiados usuarios con patrón: ${pattern}`);
      }
    }
    
    // Limpiar contactos de prueba
    const { error: contactsError } = await supabase
      .from('contacts')
      .delete()
      .like('name', '%Test%');
    
    if (contactsError) {
      console.log('⚠️  Error limpiando contactos:', contactsError.message);
    } else {
      console.log('✅ Contactos de prueba limpiados');
    }
    
    // Limpiar métricas de prueba
    const { error: metricsError } = await supabase
      .from('user_metrics')
      .delete()
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    if (metricsError) {
      console.log('⚠️  Error limpiando métricas:', metricsError.message);
    } else {
      console.log('✅ Métricas de prueba limpiadas');
    }
    
    console.log('🎯 Limpieza completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  cleanupTestData();
}

module.exports = { cleanupTestData };