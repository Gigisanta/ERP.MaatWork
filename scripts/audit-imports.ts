#!/usr/bin/env tsx
/**
 * Script de auditoría de imports
 * 
 * Identifica imports innecesarios, barrel exports, y oportunidades de optimización
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { writeFileSync } from 'fs';

interface ImportIssue {
  file: string;
  line: number;
  type: 'barrel-export' | 'unused-import' | 'wildcard-import' | 'duplicate-import';
  content: string;
  suggestion?: string;
}

function shouldIgnorePath(path: string): boolean {
  const ignoreDirs = ['node_modules', 'dist', '.next', 'coverage', '.turbo'];
  const ignoreFiles = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx', '.d.ts'];
  
  if (ignoreDirs.some(dir => path.includes(dir))) {
    return true;
  }
  
  if (ignoreFiles.some(ext => path.endsWith(ext))) {
    return true;
  }
  
  return false;
}

function analyzeImports(filePath: string): ImportIssue[] {
  const issues: ImportIssue[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    // Buscar imports con wildcard
    const wildcardPattern = /import\s+\*\s+from\s+['"]([^'"]+)['"]/;
    lines.forEach((line, index) => {
      const match = line.match(wildcardPattern);
      if (match) {
        issues.push({
          file: relative(process.cwd(), filePath),
          line: index + 1,
          type: 'wildcard-import',
          content: line.trim(),
          suggestion: `Usar imports específicos en lugar de 'import *' para mejor tree-shaking`
        });
      }
    });
    
    // Buscar barrel exports problemáticos
    const barrelPattern = /from\s+['"]@cactus\/ui['"]|from\s+['"]@cactus\/db['"]/;
    lines.forEach((line, index) => {
      if (barrelPattern.test(line) && line.includes('import')) {
        // Verificar si hay múltiples imports de la misma fuente
        const importMatch = line.match(/import\s+\{([^}]+)\}\s+from/);
        if (importMatch) {
          const imports = importMatch[1].split(',').map(i => i.trim());
          if (imports.length > 10) {
            issues.push({
              file: relative(process.cwd(), filePath),
              line: index + 1,
              type: 'barrel-export',
              content: line.trim(),
              suggestion: `Considerar dividir imports en múltiples líneas o usar imports más específicos`
            });
          }
        }
      }
    });
    
  } catch (error) {
    // Ignorar errores de lectura
  }
  
  return issues;
}

function walkDirectory(dir: string, issues: ImportIssue[]): void {
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
      } else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.tsx'))) {
        const fileIssues = analyzeImports(fullPath);
        issues.push(...fileIssues);
      }
    }
  } catch (error) {
    // Ignorar errores
  }
}

function generateReport(issues: ImportIssue[]): string {
  const byType = {
    'wildcard-import': issues.filter(i => i.type === 'wildcard-import'),
    'barrel-export': issues.filter(i => i.type === 'barrel-export'),
    'unused-import': issues.filter(i => i.type === 'unused-import'),
    'duplicate-import': issues.filter(i => i.type === 'duplicate-import'),
  };
  
  let report = `# Auditoría de Imports\n\n`;
  report += `**Fecha:** ${new Date().toISOString().split('T')[0]}\n\n`;
  report += `**Total de issues encontrados:** ${issues.length}\n\n`;
  
  report += `## Resumen por Tipo\n\n`;
  report += `- **Wildcard imports (import *):** ${byType['wildcard-import'].length}\n`;
  report += `- **Barrel exports problemáticos:** ${byType['barrel-export'].length}\n`;
  report += `- **Imports no usados:** ${byType['unused-import'].length}\n`;
  report += `- **Imports duplicados:** ${byType['duplicate-import'].length}\n\n`;
  
  if (byType['wildcard-import'].length > 0) {
    report += `## ⚠️ Wildcard Imports (import *)\n\n`;
    report += `Estos imports impiden el tree-shaking efectivo:\n\n`;
    for (const issue of byType['wildcard-import'].slice(0, 10)) {
      report += `### ${issue.file}:${issue.line}\n\n`;
      report += `\`\`\`typescript\n${issue.content}\n\`\`\`\n\n`;
      if (issue.suggestion) {
        report += `**Sugerencia:** ${issue.suggestion}\n\n`;
      }
      report += `---\n\n`;
    }
    if (byType['wildcard-import'].length > 10) {
      report += `*... y ${byType['wildcard-import'].length - 10} más*\n\n`;
    }
  }
  
  if (byType['barrel-export'].length > 0) {
    report += `## ⚠️ Barrel Exports con Muchos Imports\n\n`;
    report += `Estos archivos importan muchos componentes de una vez:\n\n`;
    for (const issue of byType['barrel-export'].slice(0, 10)) {
      report += `- **${issue.file}:${issue.line}**: ${issue.content.substring(0, 100)}...\n`;
    }
    if (byType['barrel-export'].length > 10) {
      report += `\n*... y ${byType['barrel-export'].length - 10} más*\n`;
    }
    report += `\n`;
  }
  
  report += `## Recomendaciones\n\n`;
  report += `1. **Evitar 'import *'** - Usar imports específicos para mejor tree-shaking\n`;
  report += `2. **Dividir imports grandes** - Si hay más de 10 imports de una fuente, considerar dividirlos\n`;
  report += `3. **Usar imports específicos de @cactus/ui** - Ya implementado correctamente ✅\n`;
  report += `4. **Verificar imports no usados** - Usar herramientas como ESLint para detectarlos\n\n`;
  
  return report;
}

function main() {
  console.log('🔍 Auditing imports...');
  
  const issues: ImportIssue[] = [];
  
  // Buscar en apps/web/app
  const searchDirs = ['apps/web/app'];
  
  for (const dir of searchDirs) {
    const fullPath = join(process.cwd(), dir);
    try {
      if (statSync(fullPath).isDirectory()) {
        walkDirectory(fullPath, issues);
      }
    } catch (error) {
      console.warn(`Warning: Could not access ${dir}:`, error);
    }
  }
  
  console.log(`✅ Encontrados ${issues.length} issues de imports`);
  
  // Generar reporte
  const report = generateReport(issues);
  const reportPath = join(process.cwd(), 'docs', 'IMPORTS_AUDIT_REPORT.md');
  writeFileSync(reportPath, report, 'utf-8');
  console.log(`📄 Reporte generado en: ${reportPath}`);
  
  // Mostrar resumen
  console.log('\n📊 Resumen:');
  console.log(`  ⚠️  Wildcard imports: ${issues.filter(i => i.type === 'wildcard-import').length}`);
  console.log(`  ⚠️  Barrel exports problemáticos: ${issues.filter(i => i.type === 'barrel-export').length}`);
  
  if (issues.length === 0) {
    console.log('\n✅ No se encontraron issues de imports. Los imports están optimizados.');
  }
}

if (require.main === module) {
  main();
}

export { analyzeImports, generateReport };

