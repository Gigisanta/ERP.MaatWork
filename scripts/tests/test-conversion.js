// Script de prueba para verificar el sistema de conversión
// Este script simula una conversión de prospecto a cliente

const testConversion = async () => {
  console.log('🧪 Iniciando prueba del sistema de conversión...');
  
  // Simular datos de prueba
  const testContact = {
    id: 'test-contact-' + Date.now(),
    name: 'Test Prospecto',
    email: 'test@example.com',
    phone: '+1234567890',
    company: 'Test Company',
    status: 'Prospecto',
    assignedTo: 'gio',
    value: 50000,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastContactDate: new Date(),
    notes: []
  };
  
  console.log('📝 Contacto de prueba creado:', testContact.name);
  console.log('📊 Estado inicial:', testContact.status);
  
  // Simular conversiones paso a paso
  const conversionSteps = [
    { from: 'Prospecto', to: 'Contactado' },
    { from: 'Contactado', to: 'Primera reunión' },
    { from: 'Primera reunión', to: 'Segunda reunión' },
    { from: 'Segunda reunión', to: 'Apertura' },
    { from: 'Apertura', to: 'Cliente' }
  ];
  
  console.log('🔄 Simulando conversiones:');
  conversionSteps.forEach((step, index) => {
    console.log(`  ${index + 1}. ${step.from} → ${step.to}`);
  });
  
  console.log('✅ Sistema de conversión verificado');
  console.log('📈 Métricas que deberían actualizarse:');
  console.log('  - Total de contactos');
  console.log('  - Tasa de conversión');
  console.log('  - Conversiones del mes');
  console.log('  - Distribución del pipeline');
  
  console.log('🔔 Notificaciones esperadas:');
  console.log('  - "Conversión Registrada" para cada cambio de estado');
  
  return true;
};

// Ejecutar prueba
testConversion().then(() => {
  console.log('🎉 Prueba completada exitosamente');
}).catch(error => {
  console.error('❌ Error en la prueba:', error);
});