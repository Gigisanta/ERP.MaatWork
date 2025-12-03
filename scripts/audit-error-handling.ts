#!/usr/bin/env tsx
/**
 * Script de auditoría de manejo de errores
 * 
 * Verifica que las rutas usen createErrorResponse de forma consistente
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface ErrorHandlingIssue {
  file: string;
  line: number;
  type: 'missing_createErrorResponse' | 'direct_status_json' | 'inconsistent_pattern';
  content: string;
  context: string;
}

function shouldIgnorePath(path: string): boolean {
  const ignoreDirs = ['node_modules', 'dist', '.next', 'coverage', '.turbo', '__pycache__'];
  const ignoreFiles = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx', '.test.js', '.spec.js'];
  
  if (ignoreDirs.some(dir => path.includes(dir))) {
    return true;
  }
  
  if (ignoreFiles.some(ext => path.endsWith(ext))) {
    return true;
  }
  
  return false;
}

function searchInFile(filePath: string): ErrorHandlingIssue[] {
  const issues: ErrorHandlingIssue[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Verificar si el archivo importa createErrorResponse
    const hasCreateErrorResponseImport = content.includes('createErrorResponse');
    const hasGetStatusCodeFromErrorImport = content.includes('getStatusCodeFromError');
    
    // Buscar patrones de manejo de errores
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Detectar res.status().json() directo en catch blocks
      if (line.includes('catch') || line.includes('} catch')) {
        // Buscar en las siguientes líneas
        const nextLines = lines.slice(index, Math.min(index + 10, lines.length));
        const catchBlock = nextLines.join('\n');
        
        // Verificar si usa res.status().json() directamente sin createErrorResponse
        if (catchBlock.includes('res.status') && catchBlock.includes('.json(')) {
          if (!catchBlock.includes('createErrorResponse')) {
            const contextStart = Math.max(0, index - 2);
            const contextEnd = Math.min(lines.length, index + 8);
            const context = lines.slice(contextStart, contextEnd)
              .map((l, i) => {
                const num = contextStart + i + 1;
                const prefix = num === lineNumber ? '>>>' : '   ';
                return `${prefix} ${num.toString().padStart(4)}: ${l}`;
              })
              .join('\n');
            
            issues.push({
              file: relative(process.cwd(), filePath),
              line: lineNumber,
              type: 'missing_createErrorResponse',
              content: line.trim(),
              context
            });
          }
        }
      }
      
      // Detectar res.status().json() con estructura de error directa
      if (line.includes('res.status') && line.includes('.json(') && line.includes('error:')) {
        if (!line.includes('createErrorResponse')) {
          const contextStart = Math.max(0, index - 2);
          const contextEnd = Math.min(lines.length, index + 3);
          const context = lines.slice(contextStart, contextEnd)
            .map((l, i) => {
              const num = contextStart + i + 1;
              const prefix = num === lineNumber ? '>>>' : '   ';
              return `${prefix} ${num.toString().padStart(4)}: ${l}`;
            })
            .join('\n');
          
          issues.push({
            file: relative(process.cwd(), filePath),
            line: lineNumber,
            type: 'direct_status_json',
            content: line.trim(),
            context
          });
        }
      }
    });
    
    // Si el archivo tiene rutas pero no importa createErrorResponse, marcar
    if (content.includes('router.') && (content.includes('get(') || content.includes('post(') || content.includes('put(') || content.includes('delete('))) {
      if (!hasCreateErrorResponseImport && !hasGetStatusCodeFromErrorImport) {
        // Verificar si tiene manejo de errores
        if (content.includes('catch') || content.includes('res.status')) {
          issues.push({
            file: relative(process.cwd(), filePath),
            line: 1,
            type: 'inconsistent_pattern',
            content: 'File has routes but does not import createErrorResponse',
            context: `File: ${relative(process.cwd(), filePath)}\nHas routes but missing createErrorResponse import`
          });
        }
      }
    }
  } catch (error) {
    // Ignorar errores de lectura
  }
  
  return issues;
}

function walkDirectory(dir: string, issues: ErrorHandlingIssue[]): void {
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      
      if (shouldIgnorePath(fullPath)) {
        continue;
      }
      
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDirectory(fullPath, issues);
      } else if (stat.isFile() && entry.endsWith('.ts') && entry.includes('routes')) {
        const fileIssues = searchInFile(fullPath);
        issues.push(...fileIssues);
      }
    }
  } catch (error) {
    // Ignorar errores
  }
}

function extractErrorHandlingIssues(): ErrorHandlingIssue[] {
  const issues: ErrorHandlingIssue[] = [];
  
  // Buscar solo en apps/api/src/routes
  const searchDir = join(process.cwd(), 'apps', 'api', 'src', 'routes');
  try {
    if (statSync(searchDir).isDirectory()) {
      walkDirectory(searchDir, issues);
    }
  } catch (error) {
    console.warn(`Warning: Could not access ${searchDir}:`, error);
  }
  
  return issues;
}

function generateReport(issues: ErrorHandlingIssue[]): string {
  const byType = {
    missing_createErrorResponse: issues.filter(i => i.type === 'missing_createErrorResponse'),
    direct_status_json: issues.filter(i => i.type === 'direct_status_json'),
    inconsistent_pattern: issues.filter(i => i.type === 'inconsistent_pattern'),
  };
  
  const byFile = new Map<string, ErrorHandlingIssue[]>();
  for (const issue of issues) {
    if (!byFile.has(issue.file)) {
      byFile.set(issue.file, []);
    }
    byFile.get(issue.file)!.push(issue);
  }
  
  let report = `# Auditoría de Manejo de Errores\n\n`;
  report += `**Fecha:** ${new Date().toISOString().split('T')[0]}\n\n`;
  report += `**Total de issues encontrados:** ${issues.length}\n\n`;
  
  report += `## Resumen por Tipo\n\n`;
  report += `- **Falta createErrorResponse:** ${byType.missing_createErrorResponse.length}\n`;
  report += `- **Uso directo de res.status().json():** ${byType.direct_status_json.length}\n`;
  report += `- **Patrón inconsistente:** ${byType.inconsistent_pattern.length}\n\n`;
  
  if (issues.length > 0) {
    report += `## Archivos con Issues (${byFile.size} archivos)\n\n`;
    
    const sortedFiles = Array.from(byFile.entries()).sort((a, b) => b[1].length - a[1].length);
    
    for (const [file, fileIssues] of sortedFiles) {
      report += `### ${file} (${fileIssues.length} issues)\n\n`;
      
      for (const issue of fileIssues) {
        report += `**Línea ${issue.line}** - ${issue.type}\n\n`;
        report += `\`\`\`typescript\n${issue.context}\n\`\`\`\n\n`;
        report += `---\n\n`;
      }
    }
  } else {
    report += `## ✅ No se encontraron issues\n\n`;
    report += `Todas las rutas están usando \`createErrorResponse\` correctamente.\n\n`;
  }
  
  report += `## Recomendaciones\n\n`;
  report += `1. **Usar createErrorResponse en todos los catch blocks**\n`;
  report += `   \`\`\`typescript\n`;
  report += `   import { createErrorResponse, getStatusCodeFromError } from '../utils/error-response';\n`;
  report += `   \n`;
  report += `   try {\n`;
  report += `     // ...\n`;
  report += `   } catch (error) {\n`;
  report += `     const statusCode = getStatusCodeFromError(error);\n`;
  report += `     const response = createErrorResponse({\n`;
  report += `       error,\n`;
  report += `       requestId: req.requestId,\n`;
  report += `       userMessage: 'Failed to process request'\n`;
  report += `     });\n`;
  report += `     return res.status(statusCode).json(response);\n`;
  report += `   }\n`;
  report += `   \`\`\`\n\n`;
  report += `2. **Evitar res.status().json() directo con objetos de error**\n`;
  report += `3. **Mantener consistencia en todas las rutas**\n\n`;
  
  return report;
}

function main() {
  console.log('🔍 Buscando issues de manejo de errores...');
  
  const issues = extractErrorHandlingIssues();
  console.log(`✅ Encontrados ${issues.length} issues`);
  
  // Generar reporte
  const report = generateReport(issues);
  const reportPath = join(process.cwd(), 'docs', 'ERROR_HANDLING_AUDIT_REPORT.md');
  const fs = require('fs');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`📄 Reporte generado en: ${reportPath}`);
  
  // Generar JSON
  const jsonPath = join(process.cwd(), 'docs', 'ERROR_HANDLING_AUDIT_REPORT.json');
  fs.writeFileSync(jsonPath, JSON.stringify(issues, null, 2), 'utf-8');
  console.log(`📊 JSON generado en: ${jsonPath}`);
  
  // Mostrar resumen
  const byType = {
    missing: issues.filter(i => i.type === 'missing_createErrorResponse').length,
    direct: issues.filter(i => i.type === 'direct_status_json').length,
    inconsistent: issues.filter(i => i.type === 'inconsistent_pattern').length,
  };
  
  console.log('\n📊 Resumen:');
  console.log(`  Falta createErrorResponse: ${byType.missing}`);
  console.log(`  Uso directo res.status().json(): ${byType.direct}`);
  console.log(`  Patrón inconsistente: ${byType.inconsistent}`);
  
  if (issues.length > 0) {
    console.log(`\n⚠️  Se encontraron ${issues.length} issues que deberían corregirse.`);
  } else {
    console.log('\n✅ No se encontraron issues de manejo de errores.');
  }
}

if (require.main === module) {
  main();
}

export { extractErrorHandlingIssues, generateReport };












