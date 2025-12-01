#!/usr/bin/env node

/**
 * Script de health check con retry logic
 * Verifica que los servicios estén funcionando correctamente
 */

const http = require('http');
const https = require('https');
const chalkModule = require('chalk');
const chalk = chalkModule.default || chalkModule;

// Colores para output
const success = chalk.green;
const error = chalk.red;
const warning = chalk.yellow;
const info = chalk.blue;

/**
 * Hacer request HTTP/HTTPS
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      timeout: options.timeout || 5000,
      ...options
    };
    
    const req = protocol.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * Health check con retry logic
 */
async function healthCheck(url, options = {}) {
  const {
    maxRetries = 10,
    retryDelay = 2000,
    timeout = 5000,
    name = 'Service',
    expectedStatus = 200,
    expectedBody = null
  } = options;
  
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await makeRequest(url, { timeout });
      
      if (response.statusCode === expectedStatus) {
        // Verificar body si se especifica
        if (expectedBody) {
          if (typeof expectedBody === 'string') {
            if (response.body.includes(expectedBody)) {
              return { success: true, attempt, response };
            }
          } else if (expectedBody instanceof RegExp) {
            if (expectedBody.test(response.body)) {
              return { success: true, attempt, response };
            }
          }
        } else {
          return { success: true, attempt, response };
        }
      }
      
      // Si llegamos aquí, el status no es el esperado
      lastError = new Error(`Expected status ${expectedStatus}, got ${response.statusCode}`);
      
    } catch (err) {
      lastError = err;
    }
    
    // Si no es el último intento, esperar antes de reintentar
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  return { 
    success: false, 
    attempt: maxRetries, 
    error: lastError 
  };
}

/**
 * Health check para API
 */
async function checkApi(options = {}) {
  const url = options.url || 'http://localhost:3001/health';
  const name = options.name || 'API';
  
  console.log(info(`🔍 Verificando ${name}...`));
  
  const result = await healthCheck(url, {
    maxRetries: options.maxRetries || 15,
    retryDelay: options.retryDelay || 2000,
    timeout: options.timeout || 5000,
    name,
    expectedStatus: 200
  });
  
  if (result.success) {
    console.log(success(`  ✅ ${name} está funcionando (intento ${result.attempt}/${result.attempt})`));
    return true;
  } else {
    console.log(error(`  ❌ ${name} no responde después de ${result.attempt} intentos`));
    if (result.error) {
      console.log(error(`     Error: ${result.error.message}`));
    }
    return false;
  }
}

/**
 * Health check para Web App
 */
async function checkWeb(options = {}) {
  const url = options.url || 'http://localhost:3000';
  const name = options.name || 'Web App';
  
  console.log(info(`🔍 Verificando ${name}...`));
  
  const result = await healthCheck(url, {
    maxRetries: options.maxRetries || 20,
    retryDelay: options.retryDelay || 2000,
    timeout: options.timeout || 5000,
    name,
    expectedStatus: 200
  });
  
  if (result.success) {
    console.log(success(`  ✅ ${name} está funcionando (intento ${result.attempt}/${result.attempt})`));
    return true;
  } else {
    console.log(error(`  ❌ ${name} no responde después de ${result.attempt} intentos`));
    if (result.error) {
      console.log(error(`     Error: ${result.error.message}`));
    }
    return false;
  }
}

/**
 * Health check para Analytics Service
 */
const defaultAnalyticsBaseUrl =
  process.env.ANALYTICS_SERVICE_URL ||
  process.env.PYTHON_SERVICE_URL ||
  `http://localhost:${process.env.ANALYTICS_PORT || '3002'}`;
const defaultAnalyticsHealthUrl = `${defaultAnalyticsBaseUrl.replace(/\/+$/, '')}/health`;

async function checkAnalytics(options = {}) {
  const url = options.url || defaultAnalyticsHealthUrl;
  const name = options.name || 'Analytics Service';
  
  console.log(info(`🔍 Verificando ${name}...`));
  
  const result = await healthCheck(url, {
    maxRetries: options.maxRetries || 10,
    retryDelay: options.retryDelay || 2000,
    timeout: options.timeout || 5000,
    name,
    expectedStatus: 200
  });
  
  if (result.success) {
    console.log(success(`  ✅ ${name} está funcionando (intento ${result.attempt}/${result.attempt})`));
    return true;
  } else {
    console.log(warning(`  ⚠️  ${name} no responde (opcional, puede no estar iniciado)`));
    return false;
  }
}

/**
 * Health check para N8N
 */
async function checkN8N(options = {}) {
  const url = options.url || 'http://localhost:5678/healthz';
  const name = options.name || 'N8N';
  
  console.log(info(`🔍 Verificando ${name}...`));
  
  const result = await healthCheck(url, {
    maxRetries: options.maxRetries || 10,
    retryDelay: options.retryDelay || 2000,
    timeout: options.timeout || 5000,
    name,
    expectedStatus: 200
  });
  
  if (result.success) {
    console.log(success(`  ✅ ${name} está funcionando (intento ${result.attempt}/${result.attempt})`));
    return true;
  } else {
    console.log(warning(`  ⚠️  ${name} no responde (opcional, puede no estar iniciado)`));
    if (result.error) {
      console.log(warning(`     Error: ${result.error.message}`));
    }
    return false;
  }
}

/**
 * Health check para todos los servicios
 */
async function checkAllServices(options = {}) {
  const {
    checkApi: shouldCheckApi = true,
    checkWeb: shouldCheckWeb = true,
    checkAnalytics: shouldCheckAnalytics = false,
    checkN8N: shouldCheckN8N = false,
    ...healthCheckOptions
  } = options;
  
  const results = {
    api: false,
    web: false,
    analytics: false,
    n8n: false
  };
  
  if (shouldCheckApi) {
    results.api = await checkApi({ ...healthCheckOptions, name: 'API' });
    console.log('');
  }
  
  if (shouldCheckWeb) {
    results.web = await checkWeb({ ...healthCheckOptions, name: 'Web App' });
    console.log('');
  }
  
  if (shouldCheckAnalytics) {
    results.analytics = await checkAnalytics({ ...healthCheckOptions, name: 'Analytics Service' });
    console.log('');
  }
  
  if (shouldCheckN8N) {
    results.n8n = await checkN8N({ ...healthCheckOptions, name: 'N8N' });
    console.log('');
  }
  
  return results;
}

/**
 * Función principal
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    checkApi: !args.includes('--no-api'),
    checkWeb: !args.includes('--no-web'),
    checkAnalytics: args.includes('--analytics'),
    checkN8N: args.includes('--n8n'),
    maxRetries: parseInt(args.find(arg => arg.startsWith('--retries='))?.split('=')[1] || '15', 10),
    retryDelay: parseInt(args.find(arg => arg.startsWith('--delay='))?.split('=')[1] || '2000', 10)
  };
  
  console.log(chalk.bold.cyan('\n🏥 Health Check de Servicios\n'));
  
  const results = await checkAllServices(options);
  
  console.log(chalk.bold('\n📊 Resumen:'));
  if (options.checkApi) {
    console.log(results.api ? success('  ✅ API: OK') : error('  ❌ API: FALLO'));
  }
  if (options.checkWeb) {
    console.log(results.web ? success('  ✅ Web App: OK') : error('  ❌ Web App: FALLO'));
  }
  if (options.checkAnalytics) {
    console.log(results.analytics ? success('  ✅ Analytics: OK') : warning('  ⚠️  Analytics: No disponible'));
  }
  if (options.checkN8N) {
    console.log(results.n8n ? success('  ✅ N8N: OK') : warning('  ⚠️  N8N: No disponible'));
  }
  console.log('');
  
  // Exit code basado en resultados críticos
  if (options.checkApi && !results.api) {
    process.exit(1);
  }
  if (options.checkWeb && !results.web) {
    process.exit(1);
  }
  
  process.exit(0);
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch((err) => {
    console.error(error('Error fatal:'), err);
    process.exit(1);
  });
}

module.exports = { 
  healthCheck, 
  checkApi, 
  checkWeb, 
  checkAnalytics,
  checkN8N,
  checkAllServices 
};

