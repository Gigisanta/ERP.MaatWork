#!/usr/bin/env tsx
/**
 * Script de auditoría de console.log en código de producción
 * 
 * Detecta todos los usos de console.log, console.warn, console.error, console.info, console.debug
 * en código de producción (excluyendo scripts y tests)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface ConsoleUsage {
  file: string;
  line: number;
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  content: string;
  context: string; // Línea completa con contexto
}

function shouldIgnorePath(path: string): boolean {
  const ignoreDirs = ['node_modules', 'dist', '.next', 'coverage', '.turbo', '__pycache__'];
  const ignoreFiles = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx', '.test.js', '.spec.js'];
  
  // Verificar directorios ignorados
  if (ignoreDirs.some(dir => path.includes(dir))) {
    return true;
  }
  
  // Verificar archivos de test
  if (ignoreFiles.some(ext => path.endsWith(ext))) {
    return true;
  }
  
  // Permitir console.log en scripts (apps/api/src/scripts/** y apps/api/src/add-*.ts)
  if (path.includes('apps/api/src/scripts/') || path.match(/apps\/api\/src\/add-.*\.ts$/)) {
    return true;
  }
  
  return false;
}

function searchInFile(filePath: string): ConsoleUsage[] {
  const usages: ConsoleUsage[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const consolePattern = /console\.(log|warn|error|info|debug)\s*\(/;
    
    lines.forEach((line, index) => {
      const match = line.match(consolePattern);
      if (match) {
        const type = match[1] as ConsoleUsage['type'];
        const lineNumber = index + 1;
        
        // Obtener contexto (líneas anteriores y siguientes)
        const contextStart = Math.max(0, index - 2);
        const contextEnd = Math.min(lines.length, index + 3);
        const context = lines.slice(contextStart, contextEnd)
          .map((l, i) => {
            const num = contextStart + i + 1;
            const prefix = num === lineNumber ? '>>>' : '   ';
            return `${prefix} ${num.toString().padStart(4)}: ${l}`;
          })
          .join('\n');
        
        usages.push({
          file: relative(process.cwd(), filePath),
          line: lineNumber,
          type,
          content: line.trim(),
          context
        });
      }
    });
  } catch (error) {
    // Ignorar errores de lectura
    console.warn(`Warning: Could not read ${filePath}:`, error);
  }
  
  return usages;
}

function walkDirectory(dir: string, usages: ConsoleUsage[]): void {
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      
      if (shouldIgnorePath(fullPath)) {
        continue;
      }
      
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDirectory(fullPath, usages);
      } else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.tsx') || entry.endsWith('.js') || entry.endsWith('.jsx'))) {
        const fileUsages = searchInFile(fullPath);
        usages.push(...fileUsages);
      }
    }
  } catch (error) {
    // Ignorar errores de lectura de directorio
    console.warn(`Warning: Could not read directory ${dir}:`, error);
  }
}

function extractConsoleUsages(): ConsoleUsage[] {
  const usages: ConsoleUsage[] = [];
  
  // Buscar en apps/ y packages/ (excluyendo node_modules, dist, etc.)
  const searchDirs = ['apps', 'packages'];
  
  for (const dir of searchDirs) {
    const fullPath = join(process.cwd(), dir);
    try {
      if (statSync(fullPath).isDirectory()) {
        walkDirectory(fullPath, usages);
      }
    } catch (error) {
      console.warn(`Warning: Could not access ${dir}:`, error);
    }
  }
  
  return usages;
}

function generateReport(usages: ConsoleUsage[]): string {
  const byType = {
    log: usages.filter(u => u.type === 'log'),
    warn: usages.filter(u => u.type === 'warn'),
    error: usages.filter(u => u.type === 'error'),
    info: usages.filter(u => u.type === 'info'),
    debug: usages.filter(u => u.type === 'debug'),
  };
  
  const byFile = new Map<string, ConsoleUsage[]>();
  for (const usage of usages) {
    if (!byFile.has(usage.file)) {
      byFile.set(usage.file, []);
    }
    byFile.get(usage.file)!.push(usage);
  }
  
  let report = `# Auditoría de console.* en Código de Producción\n\n`;
  report += `**Fecha:** ${new Date().toISOString().split('T')[0]}\n\n`;
  report += `**Total encontrados:** ${usages.length}\n\n`;
  
  report += `## Resumen por Tipo\n\n`;
  report += `- **console.log:** ${byType.log.length}\n`;
  report += `- **console.warn:** ${byType.warn.length}\n`;
  report += `- **console.error:** ${byType.error.length}\n`;
  report += `- **console.info:** ${byType.info.length}\n`;
  report += `- **console.debug:** ${byType.debug.length}\n\n`;
  
  report += `## Archivos con console.* (${byFile.size} archivos)\n\n`;
  
  // Ordenar por cantidad de usos
  const sortedFiles = Array.from(byFile.entries()).sort((a, b) => b[1].length - a[1].length);
  
  for (const [file, fileUsages] of sortedFiles) {
    report += `### ${file} (${fileUsages.length} usos)\n\n`;
    
    for (const usage of fileUsages) {
      report += `**Línea ${usage.line}** - \`console.${usage.type}\`\n\n`;
      report += `\`\`\`typescript\n${usage.context}\n\`\`\`\n\n`;
      report += `---\n\n`;
    }
  }
  
  report += `## Recomendaciones\n\n`;
  report += `1. **Reemplazar console.log por logger estructurado**\n`;
  report += `   - API: usar \`logger\` de \`apps/api/src/utils/logger.ts\`\n`;
  report += `   - Web: usar \`logger\` de \`apps/web/lib/logger.ts\`\n`;
  report += `2. **Mantener console.log solo en scripts** (\`apps/api/src/scripts/**\`, \`apps/api/src/add-*.ts\`)\n`;
  report += `3. **console.error puede mantenerse en casos críticos** pero preferir logger.error\n`;
  report += `4. **Habilitar regla ESLint no-console** para prevenir futuros usos\n\n`;
  
  return report;
}

function main() {
  console.log('🔍 Buscando console.* en código de producción...');
  
  const usages = extractConsoleUsages();
  console.log(`✅ Encontrados ${usages.length} usos de console.*`);
  
  // Generar reporte
  const report = generateReport(usages);
  const reportPath = join(process.cwd(), 'docs', 'CONSOLE_LOGS_AUDIT_REPORT.md');
  const fs = require('fs');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`📄 Reporte generado en: ${reportPath}`);
  
  // Generar JSON para procesamiento adicional
  const jsonPath = join(process.cwd(), 'docs', 'CONSOLE_LOGS_AUDIT_REPORT.json');
  fs.writeFileSync(jsonPath, JSON.stringify(usages, null, 2), 'utf-8');
  console.log(`📊 JSON generado en: ${jsonPath}`);
  
  // Mostrar resumen
  const byType = {
    log: usages.filter(u => u.type === 'log').length,
    warn: usages.filter(u => u.type === 'warn').length,
    error: usages.filter(u => u.type === 'error').length,
    info: usages.filter(u => u.type === 'info').length,
    debug: usages.filter(u => u.type === 'debug').length,
  };
  
  console.log('\n📊 Resumen:');
  console.log(`  console.log: ${byType.log}`);
  console.log(`  console.warn: ${byType.warn}`);
  console.log(`  console.error: ${byType.error}`);
  console.log(`  console.info: ${byType.info}`);
  console.log(`  console.debug: ${byType.debug}`);
  
  if (usages.length > 0) {
    console.log(`\n⚠️  Se encontraron ${usages.length} usos de console.* que deberían reemplazarse por logger estructurado.`);
  } else {
    console.log('\n✅ No se encontraron usos de console.* en código de producción.');
  }
}

if (require.main === module) {
  main();
}

export { extractConsoleUsages, generateReport };












