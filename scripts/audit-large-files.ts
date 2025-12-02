#!/usr/bin/env tsx
/**
 * Script de auditoría de archivos y funciones largos
 * 
 * Detecta archivos y funciones que exceden límites recomendados:
 * - Archivos: > 300 líneas
 * - Funciones: > 50 líneas
 * - Clases: > 100 líneas
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface LargeFileIssue {
  file: string;
  type: 'file' | 'function' | 'class';
  name?: string;
  lineCount: number;
  startLine: number;
  endLine: number;
  recommendation: string;
}

const MAX_FILE_LINES = 300;
const MAX_FUNCTION_LINES = 50;
const MAX_CLASS_LINES = 100;

function shouldIgnorePath(path: string): boolean {
  const ignoreDirs = ['node_modules', 'dist', '.next', 'coverage', '.turbo', '__pycache__', 'migrations'];
  const ignoreFiles = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx', '.test.js', '.spec.js', '.d.ts'];
  
  if (ignoreDirs.some(dir => path.includes(dir))) {
    return true;
  }
  
  if (ignoreFiles.some(ext => path.endsWith(ext))) {
    return true;
  }
  
  return false;
}

function countFunctionLines(content: string, startIndex: number): { endIndex: number; lineCount: number } {
  let braceCount = 0;
  let inFunction = false;
  let startLine = 0;
  
  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';
    
    if (char === '{' && prevChar !== "'" && prevChar !== '"' && prevChar !== '`') {
      if (!inFunction) {
        inFunction = true;
        startLine = content.substring(0, i).split('\n').length;
      }
      braceCount++;
    } else if (char === '}' && prevChar !== "'" && prevChar !== '"' && prevChar !== '`') {
      braceCount--;
      if (inFunction && braceCount === 0) {
        const endLine = content.substring(0, i).split('\n').length;
        const lineCount = endLine - startLine + 1;
        return { endIndex: i, lineCount };
      }
    }
  }
  
  return { endIndex: content.length, lineCount: 0 };
}

function analyzeFile(filePath: string): LargeFileIssue[] {
  const issues: LargeFileIssue[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const totalLines = lines.length;
    
    // Verificar tamaño del archivo
    if (totalLines > MAX_FILE_LINES) {
      issues.push({
        file: relative(process.cwd(), filePath),
        type: 'file',
        lineCount: totalLines,
        startLine: 1,
        endLine: totalLines,
        recommendation: `Archivo tiene ${totalLines} líneas (límite: ${MAX_FILE_LINES}). Considerar dividir en módulos más pequeños.`
      });
    }
    
    // Buscar funciones y clases
    const functionPattern = /^(export\s+)?(async\s+)?(function\s+\w+|const\s+\w+\s*[:=]\s*(async\s+)?\(|const\s+\w+\s*[:=]\s*(async\s+)?\([^)]*\)\s*[:=]\s*(async\s+)?\(|class\s+\w+)/;
    const classPattern = /^(export\s+)?class\s+\w+/;
    
    lines.forEach((line, index) => {
      const lineNumber = index + 1;
      
      // Detectar clases
      if (classPattern.test(line.trim())) {
        const className = line.match(/class\s+(\w+)/)?.[1] || 'Unknown';
        const startIndex = content.indexOf(line);
        const { lineCount } = countFunctionLines(content, startIndex);
        
        if (lineCount > MAX_CLASS_LINES) {
          issues.push({
            file: relative(process.cwd(), filePath),
            type: 'class',
            name: className,
            lineCount,
            startLine: lineNumber,
            endLine: lineNumber + lineCount - 1,
            recommendation: `Clase ${className} tiene ${lineCount} líneas (límite: ${MAX_CLASS_LINES}). Considerar dividir en clases más pequeñas o extraer métodos.`
          });
        }
      }
      
      // Detectar funciones
      if (functionPattern.test(line.trim()) && !line.includes('class')) {
        const functionMatch = line.match(/(?:function\s+(\w+)|const\s+(\w+)|(\w+)\s*[:=])/);
        const functionName = functionMatch?.[1] || functionMatch?.[2] || functionMatch?.[3] || 'anonymous';
        
        // Buscar inicio de función (puede estar en múltiples líneas)
        let functionStart = index;
        let braceIndex = -1;
        for (let i = index; i < Math.min(index + 5, lines.length); i++) {
          const bracePos = lines[i].indexOf('{');
          if (bracePos !== -1) {
            braceIndex = content.split('\n').slice(0, i).join('\n').length + bracePos;
            functionStart = i;
            break;
          }
        }
        
        if (braceIndex !== -1) {
          const { lineCount } = countFunctionLines(content, braceIndex);
          
          if (lineCount > MAX_FUNCTION_LINES) {
            issues.push({
              file: relative(process.cwd(), filePath),
              type: 'function',
              name: functionName,
              lineCount,
              startLine: functionStart + 1,
              endLine: functionStart + lineCount,
              recommendation: `Función ${functionName} tiene ${lineCount} líneas (límite: ${MAX_FUNCTION_LINES}). Considerar extraer lógica a funciones más pequeñas.`
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

function walkDirectory(dir: string, issues: LargeFileIssue[]): void {
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
        const fileIssues = analyzeFile(fullPath);
        issues.push(...fileIssues);
      }
    }
  } catch (error) {
    // Ignorar errores
  }
}

function extractLargeFileIssues(): LargeFileIssue[] {
  const issues: LargeFileIssue[] = [];
  
  // Buscar en apps/ y packages/
  const searchDirs = ['apps', 'packages'];
  
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
  
  return issues;
}

function generateReport(issues: LargeFileIssue[]): string {
  const byType = {
    file: issues.filter(i => i.type === 'file'),
    function: issues.filter(i => i.type === 'function'),
    class: issues.filter(i => i.type === 'class'),
  };
  
  const byFile = new Map<string, LargeFileIssue[]>();
  for (const issue of issues) {
    if (!byFile.has(issue.file)) {
      byFile.set(issue.file, []);
    }
    byFile.get(issue.file)!.push(issue);
  }
  
  let report = `# Auditoría de Archivos y Funciones Largos\n\n`;
  report += `**Fecha:** ${new Date().toISOString().split('T')[0]}\n\n`;
  report += `**Total de issues encontrados:** ${issues.length}\n\n`;
  
  report += `## Límites Aplicados\n\n`;
  report += `- **Archivos:** Máximo ${MAX_FILE_LINES} líneas\n`;
  report += `- **Funciones:** Máximo ${MAX_FUNCTION_LINES} líneas\n`;
  report += `- **Clases:** Máximo ${MAX_CLASS_LINES} líneas\n\n`;
  
  report += `## Resumen por Tipo\n\n`;
  report += `- **Archivos largos:** ${byType.file.length}\n`;
  report += `- **Funciones largas:** ${byType.function.length}\n`;
  report += `- **Clases largas:** ${byType.class.length}\n\n`;
  
  if (issues.length > 0) {
    report += `## Archivos con Issues (${byFile.size} archivos)\n\n`;
    
    const sortedFiles = Array.from(byFile.entries()).sort((a, b) => {
      const aMax = Math.max(...a[1].map(i => i.lineCount));
      const bMax = Math.max(...b[1].map(i => i.lineCount));
      return bMax - aMax;
    });
    
    for (const [file, fileIssues] of sortedFiles) {
      report += `### ${file}\n\n`;
      
      for (const issue of fileIssues) {
        if (issue.type === 'file') {
          report += `**Archivo completo** - ${issue.lineCount} líneas\n\n`;
        } else {
          report += `**${issue.type === 'class' ? 'Clase' : 'Función'} ${issue.name}** (líneas ${issue.startLine}-${issue.endLine}) - ${issue.lineCount} líneas\n\n`;
        }
        report += `${issue.recommendation}\n\n`;
        report += `---\n\n`;
      }
    }
  } else {
    report += `## ✅ No se encontraron issues\n\n`;
    report += `Todos los archivos y funciones están dentro de los límites recomendados.\n\n`;
  }
  
  report += `## Recomendaciones\n\n`;
  report += `1. **Dividir archivos largos en módulos especializados**\n`;
  report += `2. **Extraer lógica de funciones largas a funciones auxiliares**\n`;
  report += `3. **Dividir clases grandes en clases más pequeñas o usar composición**\n`;
  report += `4. **Aplicar principios SOLID y DRY**\n\n`;
  
  return report;
}

function main() {
  console.log('🔍 Buscando archivos y funciones largos...');
  
  const issues = extractLargeFileIssues();
  console.log(`✅ Encontrados ${issues.length} issues`);
  
  // Generar reporte
  const report = generateReport(issues);
  const reportPath = join(process.cwd(), 'docs', 'LARGE_FILES_AUDIT_REPORT.md');
  const fs = require('fs');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`📄 Reporte generado en: ${reportPath}`);
  
  // Generar JSON
  const jsonPath = join(process.cwd(), 'docs', 'LARGE_FILES_AUDIT_REPORT.json');
  fs.writeFileSync(jsonPath, JSON.stringify(issues, null, 2), 'utf-8');
  console.log(`📊 JSON generado en: ${jsonPath}`);
  
  // Mostrar resumen
  const byType = {
    file: issues.filter(i => i.type === 'file').length,
    function: issues.filter(i => i.type === 'function').length,
    class: issues.filter(i => i.type === 'class').length,
  };
  
  console.log('\n📊 Resumen:');
  console.log(`  Archivos largos: ${byType.file}`);
  console.log(`  Funciones largas: ${byType.function}`);
  console.log(`  Clases largas: ${byType.class}`);
  
  if (issues.length > 0) {
    console.log(`\n⚠️  Se encontraron ${issues.length} issues que deberían revisarse.`);
  } else {
    console.log('\n✅ No se encontraron archivos o funciones que excedan los límites.');
  }
}

if (require.main === module) {
  main();
}

export { extractLargeFileIssues, generateReport };









