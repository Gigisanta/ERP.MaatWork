/**
 * Script de Health Check para verificar conectividad con servicios externos
 * Verifica Notion API, Supabase y otros servicios críticos
 */

import https from 'https';
import http from 'http';
import { createClient } from '@supabase/supabase-js';

// Colores para output en consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Función para hacer requests HTTP/HTTPS
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const req = client.request(url, {
      method: 'GET',
      timeout: 10000,
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Función para verificar Notion API
async function checkNotionAPI() {
  console.log(`${colors.blue}🔍 Verificando Notion API...${colors.reset}`);
  
  try {
    const notionToken = process.env.NOTION_TOKEN;
    if (!notionToken) {
      throw new Error('NOTION_TOKEN no está configurado');
    }
    
    const response = await makeRequest('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      }
    });
    
    if (response.statusCode === 200) {
      const userData = JSON.parse(response.data);
      console.log(`${colors.green}✅ Notion API: Conectado correctamente${colors.reset}`);
      console.log(`   Usuario: ${userData.name || 'N/A'}`);
      console.log(`   Email: ${userData.person?.email || 'N/A'}`);
      return { status: 'success', service: 'Notion API' };
    } else {
      throw new Error(`HTTP ${response.statusCode}`);
    }
  } catch (error) {
    console.log(`${colors.red}❌ Notion API: Error - ${error.message}${colors.reset}`);
    return { status: 'error', service: 'Notion API', error: error.message };
  }
}

// Función para verificar Supabase
async function checkSupabase() {
  console.log(`${colors.blue}🔍 Verificando Supabase...${colors.reset}`);
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables de Supabase no están configuradas');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test de conexión básica
    const { data, error } = await supabase
      .from('contacts')
      .select('count', { count: 'exact', head: true });
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = tabla no existe, pero conexión OK
      throw error;
    }
    
    console.log(`${colors.green}✅ Supabase: Conectado correctamente${colors.reset}`);
    console.log(`   URL: ${supabaseUrl}`);
    return { status: 'success', service: 'Supabase' };
  } catch (error) {
    console.log(`${colors.red}❌ Supabase: Error - ${error.message}${colors.reset}`);
    return { status: 'error', service: 'Supabase', error: error.message };
  }
}

// Función para verificar servidor local
async function checkLocalServer() {
  console.log(`${colors.blue}🔍 Verificando servidor local...${colors.reset}`);
  
  try {
    const response = await makeRequest('http://localhost:3000/api/health');
    
    if (response.statusCode === 200) {
      console.log(`${colors.green}✅ Servidor local: Funcionando correctamente${colors.reset}`);
      return { status: 'success', service: 'Servidor Local' };
    } else {
      throw new Error(`HTTP ${response.statusCode}`);
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠️  Servidor local: No disponible - ${error.message}${colors.reset}`);
    return { status: 'warning', service: 'Servidor Local', error: error.message };
  }
}

// Función para verificar variables de entorno
function checkEnvironmentVariables() {
  console.log(`${colors.blue}🔍 Verificando variables de entorno...${colors.reset}`);
  
  const requiredVars = [
    'NOTION_TOKEN',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];
  
  const missingVars = [];
  const presentVars = [];
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      presentVars.push(varName);
    } else {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length === 0) {
    console.log(`${colors.green}✅ Variables de entorno: Todas configuradas${colors.reset}`);
    presentVars.forEach(varName => {
      const value = process.env[varName];
      const maskedValue = value.length > 10 ? 
        `${value.substring(0, 6)}...${value.substring(value.length - 4)}` : 
        '***';
      console.log(`   ${varName}: ${maskedValue}`);
    });
    return { status: 'success', service: 'Variables de Entorno' };
  } else {
    console.log(`${colors.red}❌ Variables de entorno: Faltan variables${colors.reset}`);
    missingVars.forEach(varName => {
      console.log(`   Falta: ${varName}`);
    });
    return { status: 'error', service: 'Variables de Entorno', error: `Faltan: ${missingVars.join(', ')}` };
  }
}

// Función para verificar conectividad de red
async function checkNetworkConnectivity() {
  console.log(`${colors.blue}🔍 Verificando conectividad de red...${colors.reset}`);
  
  const testUrls = [
    'https://api.notion.com',
    'https://google.com'
  ];
  
  const results = [];
  
  for (const url of testUrls) {
    try {
      const response = await makeRequest(url);
      results.push({ url, status: 'success', statusCode: response.statusCode });
    } catch (error) {
      results.push({ url, status: 'error', error: error.message });
    }
  }
  
  const successCount = results.filter(r => r.status === 'success').length;
  
  if (successCount === testUrls.length) {
    console.log(`${colors.green}✅ Conectividad de red: Todas las conexiones exitosas${colors.reset}`);
    return { status: 'success', service: 'Conectividad de Red' };
  } else {
    console.log(`${colors.red}❌ Conectividad de red: ${successCount}/${testUrls.length} conexiones exitosas${colors.reset}`);
    results.forEach(result => {
      if (result.status === 'error') {
        console.log(`   ${result.url}: ${result.error}`);
      }
    });
    return { status: 'error', service: 'Conectividad de Red', error: 'Algunas conexiones fallaron' };
  }
}

// Función principal
async function runHealthCheck() {
  console.log(`${colors.bold}${colors.blue}🏥 HEALTH CHECK - CRM SYSTEM${colors.reset}\n`);
  console.log(`Fecha: ${new Date().toLocaleString()}\n`);
  
  const checks = [
    checkEnvironmentVariables,
    checkNetworkConnectivity,
    checkNotionAPI,
    checkSupabase,
    checkLocalServer
  ];
  
  const results = [];
  
  for (const check of checks) {
    try {
      const result = await check();
      results.push(result);
    } catch (error) {
      results.push({
        status: 'error',
        service: 'Unknown',
        error: error.message
      });
    }
    console.log(''); // Línea en blanco entre checks
  }
  
  // Resumen final
  console.log(`${colors.bold}📊 RESUMEN:${colors.reset}`);
  
  const successCount = results.filter(r => r.status === 'success').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  
  console.log(`${colors.green}✅ Exitosos: ${successCount}${colors.reset}`);
  if (warningCount > 0) {
    console.log(`${colors.yellow}⚠️  Advertencias: ${warningCount}${colors.reset}`);
  }
  if (errorCount > 0) {
    console.log(`${colors.red}❌ Errores: ${errorCount}${colors.reset}`);
  }
  
  const overallStatus = errorCount === 0 ? 
    (warningCount === 0 ? 'HEALTHY' : 'DEGRADED') : 
    'UNHEALTHY';
  
  const statusColor = overallStatus === 'HEALTHY' ? colors.green :
    overallStatus === 'DEGRADED' ? colors.yellow : colors.red;
  
  console.log(`\n${colors.bold}Estado general: ${statusColor}${overallStatus}${colors.reset}`);
  
  // Exit code basado en el estado
  if (overallStatus === 'UNHEALTHY') {
    process.exit(1);
  } else if (overallStatus === 'DEGRADED') {
    process.exit(2);
  } else {
    process.exit(0);
  }
}

// Ejecutar directamente
runHealthCheck().catch(error => {
  console.error(`${colors.red}❌ Error crítico en health check: ${error.message}${colors.reset}`);
  process.exit(1);
});

export {
  runHealthCheck,
  checkNotionAPI,
  checkSupabase,
  checkLocalServer,
  checkEnvironmentVariables,
  checkNetworkConnectivity
};