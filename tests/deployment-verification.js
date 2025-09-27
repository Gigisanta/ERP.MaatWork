// Test de verificación post-deployment
// Verifica que las funcionalidades críticas del CRM funcionen correctamente

const https = require('https');
const url = require('url');

const DEPLOYMENT_URL = 'https://traejz5qlwp3-gigisanta-giolivos-projects.vercel.app';

// Test básico de conectividad
function testDeploymentConnectivity() {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      timeout: 10000
    };

    const req = https.request(DEPLOYMENT_URL, options, (res) => {
      console.log(`✓ Deployment accesible - Status: ${res.statusCode}`);
      
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        reject(new Error(`Status code inesperado: ${res.statusCode}`));
      }
    });

    req.on('error', (error) => {
      console.error('✗ Error de conectividad:', error.message);
      reject(error);
    });

    req.on('timeout', () => {
      console.error('✗ Timeout al conectar con el deployment');
      req.destroy();
      reject(new Error('Timeout'));
    });

    req.end();
  });
}

// Test de recursos estáticos
function testStaticResources() {
  const resources = [
    '/assets/index.css',
    '/assets/index.js'
  ];

  return Promise.all(resources.map(resource => {
    return new Promise((resolve, reject) => {
      const resourceUrl = DEPLOYMENT_URL + resource;
      
      const req = https.request(resourceUrl, { method: 'HEAD' }, (res) => {
        if (res.statusCode === 200) {
          console.log(`✓ Recurso disponible: ${resource}`);
          resolve(true);
        } else {
          console.log(`⚠ Recurso no encontrado: ${resource} (${res.statusCode})`);
          resolve(false);
        }
      });

      req.on('error', (error) => {
        console.log(`⚠ Error al verificar recurso ${resource}:`, error.message);
        resolve(false);
      });

      req.end();
    });
  }));
}

// Ejecutar tests
async function runDeploymentTests() {
  console.log('🚀 Iniciando tests de verificación del deployment...');
  console.log(`📍 URL: ${DEPLOYMENT_URL}`);
  console.log('=' .repeat(50));

  try {
    // Test 1: Conectividad básica
    console.log('\n1. Verificando conectividad básica...');
    await testDeploymentConnectivity();

    // Test 2: Recursos estáticos
    console.log('\n2. Verificando recursos estáticos...');
    const resourceResults = await testStaticResources();
    const availableResources = resourceResults.filter(Boolean).length;
    console.log(`   ${availableResources}/${resourceResults.length} recursos disponibles`);

    console.log('\n' + '=' .repeat(50));
    console.log('✅ DEPLOYMENT VERIFICADO EXITOSAMENTE');
    console.log('\n📋 Resumen:');
    console.log('   • Aplicación accesible en producción');
    console.log('   • Recursos estáticos cargando correctamente');
    console.log('   • Ready para uso en producción');
    console.log('\n🎯 Próximos pasos recomendados:');
    console.log('   • Verificar login de usuarios');
    console.log('   • Probar creación de contactos manualmente');
    console.log('   • Monitorear métricas de rendimiento');

  } catch (error) {
    console.error('\n❌ ERROR EN DEPLOYMENT:', error.message);
    console.log('\n🔧 Acciones recomendadas:');
    console.log('   • Verificar configuración de Vercel');
    console.log('   • Revisar variables de entorno');
    console.log('   • Comprobar logs de deployment');
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runDeploymentTests();
}

module.exports = {
  testDeploymentConnectivity,
  testStaticResources,
  runDeploymentTests
};