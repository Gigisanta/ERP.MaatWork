#!/usr/bin/env node
/**
 * Railway Deployment Automation Script
 * 
 * Automatically manages Railway services for the MaatWork monorepo:
 * - Lists current services
 * - Deletes failed services
 * - Creates new services with Nixpacks configuration
 * - Configures environment variables
 * - Monitors deployment status
 * 
 * Usage: node scripts/railway-deploy.ts <command> [options]
 */

import { execSync } from 'child_process';
import { readFile, writeFile, readdir, stat } from 'fs';
import { join, resolve, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import * as https from 'https';

interface RailwayService {
  id: string;
  name: string;
  environmentId: string;
  serviceName: string;
  status: 'active' | 'deprovisioning' | 'failed' | 'pending' | 'online';
  createdAt: string;
  updatedAt: string;
  serviceUrl?: string;
}

interface DeploymentConfig {
  projectId: string;
  environmentId: string;
  projectPath: string;
  branch: string;
  rootDirectory: '/';
  services: {
    api: {
      name: 'api';
      envVars: {
        DATABASE_URL: 'DATABASE_URL',
        NODE_ENV: 'production',
        PORT: '3001',
      };
      healthCheckPath: '/health';
    },
    web: {
      name: 'web';
      envVars: {
        NODE_ENV: 'production',
        PORT: '3000',
        NEXT_PUBLIC_API_URL: 'NEXT_PUBLIC_API_URL',
        NEXT_PUBLIC_APP_URL: 'NEXT_PUBLIC_APP_URL',
      };
      healthCheckPath: '/';
    },
    analytics: {
      name: 'analytics';
      envVars: {
        DATABASE_URL: 'DATABASE_URL',
        NODE_ENV: 'production',
        PORT: '3002',
        LOG_LEVEL: 'info',
      };
      healthCheckPath: '/health';
    },
  };
}

interface ServiceDeletionOptions {
  serviceId?: string;
  serviceName?: string;
  force?: boolean;
}

interface ServiceCreationOptions {
  name: string;
  projectId: string;
  environmentId: string;
  branch?: string;
  rootDirectory?: string;
  envVars?: Record<string, string>;
  configPath?: string;
  startCommand?: string;
  healthCheckPath?: string;
}

interface HealthCheckResult {
  success: boolean;
  statusCode?: number;
  body?: any;
  responseTime?: number;
}

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[92;1m',
  cyan: '\x1b[36;1m',
  green: '\x1b[32;1m',
  yellow: '\x1b[33;1m',
  red: '\x1b[31;1m',
};

// Helper function to log messages
function log(message: string, level: 'info' | 'warn' | 'error' = 'success' | 'pending') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  console.log(colors[level] || colors.reset, logEntry);
}

// Railway API helpers
async function railwayCli(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const cp = execSync('railway', args, { 
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['pipe', 'inherit']
    });
    resolve(cp.stdout.trim());
  });
}

// Get current services
async function listServices(): Promise<RailwayService[]> {
  log('Fetching current Railway services...', 'info');
  
  try {
    const output = await railwayCli(['list', '--json']);
    const data = JSON.parse(output);
    
    // The output format from Railway CLI may vary, so let's parse it safely
    let services: RailwayService[] = [];
    
    if (Array.isArray(data)) {
      services = data.map((item: any, index: number) => ({
        id: item.id || `service-${index}`,
        name: item.name || item.serviceName || `service-${index}`,
        environmentId: item.environmentId || data.environmentId || data.projectId,
        serviceName: item.serviceName || item.name || `service-${index}`,
        status: item.status || 'active',
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: item.updatedAt || new Date().toISOString(),
        serviceUrl: item.serviceUrl || item.domain,
      }));
    }
    
    log(`Found ${services.length} services`, 'success');
    return services;
  } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`Failed to list services: ${errorMsg}`, 'error');
      return [];
  }
}

// Delete a service
async function deleteService(options: ServiceDeletionOptions): Promise<boolean> {
  const { serviceId, serviceName, force } = options;
  
  if (!serviceId && !serviceName) {
    log('Missing serviceId or serviceName. Cannot delete', 'error');
    return false;
  }
  
  if (force) {
    log(`Deleting service ${serviceName || serviceId} (forced)...`, 'warn');
  } else {
    log(`Deleting service ${serviceName || serviceId}...`, 'info');
  }
  
  try {
    const args = ['service', 'delete', serviceId || serviceName];
    if (force) args.push('--force');
    
    const output = await railwayCli(args);
    
    log(`Service deleted successfully`, 'success');
    return true;
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Failed to delete service: ${errorMsg}`, 'error');
    return false;
  }
}

// Delete multiple services
async function deleteServices(serviceIds: string[]): Promise<number> {
  log(`Deleting ${serviceIds.length} services...`, 'info');
  
  let deletedCount = 0;
  
  for (const serviceId of serviceIds) {
    const success = await deleteService({ serviceId });
    if (success) deletedCount++;
  }
  
  log(`Deleted ${deletedCount}/${serviceIds.length} services`, 'success');
  return deletedCount;
}

// Create a new service
async function createService(options: ServiceCreationOptions): Promise<RailwayService | null> {
  const {
    name,
    projectId,
    environmentId,
    branch,
    rootDirectory = '/',
    envVars,
    configPath = 'apps/api/nixpacks.toml',
    healthCheckPath,
  } = options;
  
  log(`Creating service ${name}...`, 'info');
  
  try {
    // Prepare environment variables
    const envArgs: envVars ? Object.entries(envVars).flatMap(([key, value]) => ['-e', `${key}=${value}`]) : [];
    
    // Prepare service creation arguments
    const args = [
      'service',
      'create',
      name,
      '--projectid', projectId,
      '--environmentid', environmentId,
      '--rootdir', rootDirectory,
      ...envArgs,
    ];
    
    if (branch) args.push('--branch', branch);
    if (configPath) args.push('--config', configPath);
    if (healthCheckPath) args.push('--healthcheck-path', healthCheckPath);
    
    const output = await railwayCli(args);
    const lines = output.split('\n').filter(line => line.trim());
    const serviceId = lines.find(line => line.startsWith('Created service with ID:'))?.split(' ').pop()?.replace('Created service with ID: ', '');
    
    if (serviceId) {
      log(`Service ${name} created with ID: ${serviceId}`, 'success');
      
      // Get the created service details
      await sleep(2000); // Wait a bit for service to be ready
      
      const services = await listServices();
      return services.find(s => s.id === serviceId || s.serviceName === name) || null;
    }
    
    return null;
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Failed to create service ${name}: ${errorMsg}`, 'error');
    return null;
  }
}

// Add environment variable to a service
async function addEnvVar(serviceId: string, key: string, value: string): Promise<boolean> {
  log(`Setting ${key}=${value} for service ${serviceId}...`, 'info');
  
  try {
    await railwayCli(['variables', 'set', serviceId, `${key}=${value}`]);
    log(`Environment variable set successfully`, 'success');
    return true;
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
log(`Failed to set env var: \`${errorMsg}\`, 'error');
    return false;
  }
}

// Get deployment logs
async function getDeploymentLogs(serviceId: string, lines: number = 50): Promise<string> {
  log(`Fetching last ${lines} log lines for service...`, 'info');
  
  try {
    const output = await railwayCli(['logs', serviceId, '-n', lines.toString()]);
    return output;
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Failed to fetch logs: ${errorMsg}`, 'error');
    return `Error: ${errorMsg}`;
  }
}

// Check health endpoint
async function checkHealth(serviceUrl: string, path: string): Promise<HealthCheckResult> {
  const healthUrl = new URL(path).href;
  
  try {
    const response = await fetch(healthUrl);
    const responseTime = Date.now();
    const result = {
      success: response.ok,
      statusCode: response.status,
      body: await response.json(),
      responseTime,
    };
    
    if (result.success) {
      log(`Health check ${path}: OK (${result.statusCode})`, 'success');
    } else {
      log(`Health check ${path}: FAILED (${result.statusCode})`, 'error');
    }
    
    return result;
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Health check failed: ${errorMsg}`, 'error');
    return {
      success: false,
      statusCode: 500,
      body: { error: errorMsg },
    };
    }
}

// Monitor deployment progress
async function monitorDeployment(serviceId: string, maxAttempts: number = 60, interval: number = 5000): Promise<boolean> {
  log(`Monitoring deployment for service ${serviceId}...`, 'info');
  
  const services = await listServices();
  const service = services.find(s => s.id === serviceId || s.serviceName === serviceId);
  
  if (!service) {
    log(`Service ${serviceId} not found`, 'error');
    return false;
  }
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await sleep(interval);
    
    // Check if service is online
    if (service.status === 'online' && service.serviceUrl) {
      log(`${colors.green}✓} Service ${service.name} is online!`, 'success');
      log(`  Service URL: ${service.serviceUrl}`, 'success');
      return true;
    }
    
    // Get latest logs to see progress
    if (attempt % 5 === 0) {
      const logs = await getDeploymentLogs(serviceId, 30);
      const hasError = logs.toLowerCase().includes('error');
      const hasNixpacks = logs.toLowerCase().includes('nixpacks');
      
      if (hasNixpacks) {
        log(`Using Nixpacks: ${colors.cyan}✓}`, 'info');
      } else if (hasError) {
        log(`Not using Nixpacks: ${colors.red}✗}`, 'warn');
      }
      
      if (hasError) {
        log(`Build errors found:`, 'warn');
      }
    }
    
    if (attempt === maxAttempts) {
      log(`${colors.yellow}⚠} Deployment timeout after ${maxAttempts} attempts`, 'warn');
      return false;
    }
  }
  
  log(`Deployment failed or service not online`, 'warn');
  return false;
}

// Get service ID by name
async function getServiceIdByName(serviceName: string): Promise<string | null> {
  const services = await listServices();
  const service = services.find(s => 
    s.serviceName?.toLowerCase() === serviceName.toLowerCase() ||
    s.name?.toLowerCase() === serviceName.toLowerCase()
  );
  
  if (service) {
    return service.id;
  } else if (services.length > 0) {
    // If multiple services with similar names, return the first one
    return services[0].id;
  } else {
    return null;
  }
}

// Get project ID and environment ID
async function getProjectInfo(): Promise<{ projectId: string; environmentId: string } | null> {
  log('Fetching project information...', 'info');
  
  try {
    const output = await railwayCli(['status', '--json']);
    const data = JSON.parse(output);
    
    // The project ID is available in the status output
    const projectId = data.id || '';
    const environmentId = data.environments?.edges?.[0]?.node?.environmentId || '';
    
    log(`Project ID: ${projectId}`, 'info');
    log(`Environment ID: ${environmentId}`, 'info');
    
    return { projectId, environmentId };
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`Failed to get project info: ${errorMsg}`, 'error');
    return null;
  }
}

// Helper function to wait
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main deployment workflow
async function deployFullStack(): Promise<boolean> {
  log('Starting full deployment workflow...', 'info');
  log('='.repeat(50), 'cyan');
  
  const projectInfo = await getProjectInfo();
  if (!projectInfo) {
    log('Failed to get project info. Please ensure you are logged in with Railway CLI.', 'error');
    return false;
  }
  
  const { projectId, environmentId } = projectInfo;
  
  // Check if we need to delete old services
  const services = await listServices();
  const servicesToDelete = services.filter(s => 
    ['api', 'api-new', 'api-v2', 'production-api', 'web', 'analytics'].includes(s.name) ||
    ['api', 'api-new', 'api-v2', 'production-api', 'web', 'analytics'].includes(s.serviceName)
  );
  
  if (servicesToDelete.length > 0) {
    log(`Found ${servicesToDelete.length} services to delete`, 'warn');
    
    for (const service of servicesToDelete) {
      const success = await deleteService({ serviceId: service.id });
      if (!success) {
        log(`Failed to delete service ${service.name}, stopping deployment`, 'error');
        return false;
      }
    }
    
    await sleep(2000); // Wait between deletions
  }
  
  // Create new services in dependency order
  const postgresService = services.find(s => 
    s.serviceName?.toLowerCase() === 'postgres'
  );
  
  if (!postgresService) {
    log('PostgreSQL service not found. Please ensure it exists first.', 'warn');
    return false;
  }
  
  const postgresId = postgresService.id;
  const postgresUrl = postgresService.serviceUrl || '';
  
  // Create API service
  log('Creating API service...', 'info');
  const apiService = await createService({
    name: 'api',
    projectId,
    environmentId,
    branch: 'feature/railway-migration',
    rootDirectory: '/',
    envVars: {
      DATABASE_URL: `postgres:${postgresId}:DATABASE_URL`,
      NODE_ENV: 'production',
      PORT: '3001',
      JWT_SECRET: 'GENERATE_SECURE_JWT_SECRET_HERE', // User should update this
    },
    configPath: 'apps/api/nixpacks.toml',
    healthCheckPath: '/health',
  });
  
  if (!apiService) {
    log('Failed to create API service', 'error');
    return false;
  }
  
  const apiId = apiService.id;
  const apiUrl = apiService.serviceUrl || '';
  await sleep(2000);
  
  // Create Web service
  log('Creating Web service...', 'info');
  const webService = await createService({
    name: 'web',
    projectId,
    environmentId,
    branch: 'feature/railway-migration',
    rootDirectory: '/',
    envVars: {
      NODE_ENV: 'production',
      PORT: '3000',
      NEXT_PUBLIC_API_URL: `${apiUrl}`,
      NEXT_PUBLIC_APP_URL: 'GENERATE_WEB_URL_HERE', // Will update after API is deployed
    },
    configPath: 'apps/web/nixpacks.toml',
    healthCheckPath: '/',
  });
  
  if (!webService) {
    log('Failed to create Web service', 'error');
    return false;
  }
  
  const webId = webService.id;
  const webUrl = webService.serviceUrl || '';
  await sleep(2000);
  
  // Update Web service with correct API URL
  log('Updating Web service with API URL...', 'info');
  await addEnvVar(webId, 'NEXT_PUBLIC_API_URL', apiUrl);
  
  // Create Analytics service
  log('Creating Analytics service...', 'info');
  const analyticsService = await createService({
    name: 'analytics',
    projectId,
    environmentId,
    branch: 'feature/railway-migration',
    rootDirectory: '/',
    envVars: {
      DATABASE_URL: `postgres:${postgresId}:DATABASE_URL`,
      NODE_ENV: 'production',
      PORT: '3002',
      LOG_LEVEL: 'info',
    },
    configPath: 'apps/analytics-service/nixpacks.toml',
    healthCheckPath: '/health',
  });
  
  if (!analyticsService) {
    log('Failed to create Analytics service', 'error');
    return false;
  }
  
  const analyticsId = analyticsService.id;
  const analyticsUrl = analyticsService.serviceUrl || '';
  
  // Monitor all services
  log('Monitoring deployments...', 'info');
  log('='.repeat(50), 'cyan');
  
  const serviceIds = [apiId, webId, analyticsId].filter(Boolean);
  
  let allOnline = false;
  
  for (const serviceId of serviceIds) {
    const success = await monitorDeployment(serviceId, 30, 5000);
    if (success) {
      allOnline = true;
    }
  }
  
  if (allOnline) {
    log('='.repeat(50), 'cyan');
    log(`${colors.green}✓✓✓✓} All services are online!`, 'success');
    log('='.repeat(50), 'cyan');
    log('Deployment URLs:', 'success');
    log(`  API: ${apiUrl}`, 'info');
    log(`  Web: ${webUrl}`, 'info');
    log(`  Analytics: ${analyticsUrl}`, 'info');
    log('='.repeat(50), 'cyan');
    log(`${colors.cyan}→ Deployment complete! Run following to verify:`, 'info');
    log(`  curl ${apiUrl}/health`, 'info');
    log(`  curl ${webUrl}/`, 'info');
    log(`  curl ${analyticsUrl}/health`, 'info');
    return true;
  } else {
    log(`${colors.yellow}→ Not all services are online. Check Railway dashboard for details.`, 'warn');
    return false;
  }
}

// List current services
async function commandList(): Promise<void> {
  const services = await listServices();
  
  log('='.repeat(50), 'cyan');
  log(`Project: ${services[0]?.serviceName || 'maatwork'}`, 'info');
  log(`Environment: ${services[0]?.environmentId || 'production'}`, 'info');
  log('='.repeat(50), 'cyan');
  
  if (services.length === 0) {
    log('No services found. You may need to link a project first.', 'warn');
    return;
  }
  
  log('Current Services:', 'success');
  services.forEach((service, index) => {
    const statusColor = service.status === 'active' ? colors.bright : colors.red;
    const statusText = service.status === 'active' ? '✓ Running' : service.status;
    log(`  [${index + 1}] ${service.serviceName.padEnd(20)} - ${statusText} ${statusColor} - ${service.serviceUrl || 'N/A'}`, 'info');
  });
  
  log('='.repeat(50), 'cyan');
}

// Delete services
async function commandDelete(serviceNames: string[]): Promise<void> {
  const services = await listServices();
  const servicesToDelete = services.filter(s => 
    serviceNames.map(n => n.toLowerCase()).includes(s.serviceName?.toLowerCase())
  );
  
  if (servicesToDelete.length === 0) {
    log('No services found matching the provided names.', 'warn');
    return;
  }
  
  log(`Deleting ${servicesToDelete.length} services...`, 'warn');
  
  let deletedCount = 0;
  for (const service of servicesToDelete) {
    const success = await deleteService({ serviceId: service.id });
    if (success) deletedCount++;
  }
  
  log(`Deleted ${deletedCount} services`, 'success');
}

// Deploy full stack
async function commandDeploy(): Promise<void> {
  const success = await deployFullStack();
  if (!success) {
    process.exit(1);
  }
}

// Show deployment status
async function commandStatus(): Promise<void> {
  const services = await listServices();
  
  log('='.repeat(50), 'cyan');
  log(`Project: ${services[0]?.serviceName || 'maatwork'}`, 'info');
  log('Environment: ${services[0]?.environmentId || 'production'}`, 'info');
  log('='.repeat(50), 'cyan');
  
  if (services.length === 0) {
    log('No services found. You may need to link a project first.', 'warn');
    return;
  }
  
  const activeServices = services.filter(s => s.status === 'active' || s.status === 'deprovisioning');
  const failedServices = services.filter(s => s.status === 'failed');
  const onlineServices = services.filter(s => s.status === 'online');
  
  if (activeServices.length > 0) {
    log(`${colors.yellow}⚠} ${activeServices.length} deployments in progress`, 'warn');
  }
  
  if (failedServices.length > 0) {
    log(`${colors.red}✗ ${failedServices.length} deployments failed`, 'error');
  }
  
  if (onlineServices.length > 0) {
    log(`${colors.green}✓ ${onlineServices.length} services online`, 'success');
    onlineServices.forEach(s => {
      log(`  ✓ ${s.serviceName.padEnd(20)}: ${s.serviceUrl}`, 'info');
    });
  }
  
  log('='.repeat(50), 'cyan');
}

// Show logs
async function commandLogs(serviceName: string): Promise<void> {
  const serviceId = await getServiceIdByName(serviceName);
  if (!serviceId) {
    log(`Service "${serviceName}" not found`, 'error');
    process.exit(1);
  }
  
  const logs = await getDeploymentLogs(serviceId, 50);
  log(`Last 50 lines of logs for ${serviceName}:`, 'info');
  log(logs, 'info');
}

// Help command
async function commandHelp(): Promise<void> {
  log(`${colors.cyan}Railway Deployment Automation Script`, 'success');
  log('='.repeat(50), 'cyan');
  log('');
  log('Commands:', 'success');
  log('  railway-deploy list', 'info');
  log('    List all Railway services in the project');
  log('    Shows service names, IDs, status, and URLs');
  log('');
  log('  railway-deploy delete <service-names...>', 'info');
  log('    Delete specified services by name');
  log('    Example: railway-deploy delete api api-new api-v2 web');
  log('    Supports multiple service names separated by space');
  log('');
  log('  railway-deploy deploy', 'info');
  log('    Full deployment workflow');
  log('    1. Lists services');
  log('    2. Deletes old/failed services');
  log('    3. Creates new services with correct config');
  log('    4. Sets environment variables');
  log('    5. Monitors deployments');
  log('    6. Reports status');
  log('');
  log('  railway-deploy status', 'info');
  log('    Show deployment status of all services');
  log('    Displays build progress and health checks');
  log('');
  log('  railway-deploy logs <service-name>', 'info');
  log('    Show deployment logs for a service');
  log('    Example: railway-deploy logs api');
  log('    Shows last log entries');
  log('');
  log('  log <service-name> check-health', 'info');
  log('    Run health check for a service');
  log('    Example: railway-deploy logs api check-health');
  log('');
  log(`${colors.yellow}⚠}  Note: JWT_SECRET and NEXT_PUBLIC_* URLs need to be updated`, 'warn');
  log('    Update these in Railway dashboard or use:');
  log(`    railway-deploy variables set api JWT_SECRET <your-secret>`, 'info');
  log(`    railway-deploy variables set web NEXT_PUBLIC_API_URL <api-url>`, 'info');
  log(`    railway-deploy variables set web NEXT_PUBLIC_APP_URL <web-url>`, 'info');
}

// Main entry point
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const commandArgs = args.slice(1);
  
  log('='.repeat(50), 'cyan');
  log(`${colors.bright}Railway Deployment Automation`, 'info`);
  log('='.repeat(50), 'cyan');
  log('');
  
  switch (command) {
    case 'list':
      await commandList();
      break;
      
    case 'delete':
      if (commandArgs.length === 0) {
        log('Please specify service names to delete', 'error');
        process.exit(1);
      }
      await commandDelete(commandArgs);
      break;
      
    case 'deploy':
      await commandDeploy();
      break;
      
    case 'status':
      await commandStatus();
      break;
      
    case 'logs':
      if (commandArgs.length === 0) {
        log('Please specify service name to show logs for', 'error');
        process.exit(1);
      }
      await commandLogs(commandArgs[0]);
      break;
      
    case 'help':
      await commandHelp();
      break;
      
    default:
      await commandHelp();
      break;
  }
}

main().catch((error) => {
  log(`${colors.red}✗} Error: ${error.message}`, 'error');
  process.exit(1);
});
}
