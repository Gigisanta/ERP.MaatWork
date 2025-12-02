#!/usr/bin/env tsx
/**
 * Script de auditoría de código duplicado
 * 
 * Detecta código duplicado usando análisis simple de líneas similares
 * Nota: Para análisis más avanzado, considerar usar herramientas como jscpd
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface DuplicationIssue {
  file1: string;
  file2: string;
  lines1: number[];
  lines2: number[];
  similarity: number;
  code: string;
}

const MIN_SIMILAR_LINES = 5; // Mínimo de líneas similares consecutivas
const SIMILARITY_THRESHOLD = 0.8; // 80% de similitud

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

function normalizeLine(line: string): string {
  // Normalizar línea para comparación (remover espacios, comentarios, etc.)
  return line
    .trim()
    .replace(/\/\/.*$/, '') // Remover comentarios de línea
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remover comentarios de bloque
    .replace(/\s+/g, ' ') // Normalizar espacios
    .replace(/['"]/g, '"') // Normalizar comillas
    .toLowerCase();
}

function calculateSimilarity(lines1: string[], lines2: string[]): number {
  if (lines1.length === 0 || lines2.length === 0) return 0;
  
  const normalized1 = lines1.map(normalizeLine);
  const normalized2 = lines2.map(normalizeLine);
  
  let matches = 0;
  const minLength = Math.min(normalized1.length, normalized2.length);
  
  for (let i = 0; i < minLength; i++) {
    if (normalized1[i] === normalized2[i]) {
      matches++;
    }
  }
  
  return matches / minLength;
}

function findDuplicationsInFiles(file1Path: string, file2Path: string): DuplicationIssue[] {
  const issues: DuplicationIssue[] = [];
  
  try {
    const content1 = readFileSync(file1Path, 'utf-8');
    const content2 = readFileSync(file2Path, 'utf-8');
    
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');
    
    // Buscar bloques similares
    for (let i = 0; i < lines1.length - MIN_SIMILAR_LINES; i++) {
      for (let j = 0; j < lines2.length - MIN_SIMILAR_LINES; j++) {
        const block1 = lines1.slice(i, i + MIN_SIMILAR_LINES);
        const block2 = lines2.slice(j, j + MIN_SIMILAR_LINES);
        
        const similarity = calculateSimilarity(block1, block2);
        
        if (similarity >= SIMILARITY_THRESHOLD) {
          // Extender el bloque para encontrar el bloque completo similar
          let extended1 = block1;
          let extended2 = block2;
          let extendedI = i + MIN_SIMILAR_LINES;
          let extendedJ = j + MIN_SIMILAR_LINES;
          
          while (
            extendedI < lines1.length &&
            extendedJ < lines2.length &&
            calculateSimilarity([lines1[extendedI]], [lines2[extendedJ]]) >= SIMILARITY_THRESHOLD
          ) {
            extended1 = lines1.slice(i, extendedI + 1);
            extended2 = lines2.slice(j, extendedJ + 1);
            extendedI++;
            extendedJ++;
          }
          
          const finalSimilarity = calculateSimilarity(extended1, extended2);
          
          if (finalSimilarity >= SIMILARITY_THRESHOLD && extended1.length >= MIN_SIMILAR_LINES) {
            issues.push({
              file1: relative(process.cwd(), file1Path),
              file2: relative(process.cwd(), file2Path),
              lines1: [i + 1, i + extended1.length],
              lines2: [j + 1, j + extended2.length],
              similarity: finalSimilarity,
              code: extended1.join('\n').substring(0, 200) + (extended1.join('\n').length > 200 ? '...' : '')
            });
          }
        }
      }
    }
  } catch (error) {
    // Ignorar errores
  }
  
  return issues;
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      
      if (shouldIgnorePath(fullPath)) {
        continue;
      }
      
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        getAllFiles(fullPath, fileList);
      } else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.tsx'))) {
        fileList.push(fullPath);
      }
    }
  } catch (error) {
    // Ignorar errores
  }
  
  return fileList;
}

function extractDuplications(): DuplicationIssue[] {
  const issues: DuplicationIssue[] = [];
  
  // Buscar en apps/ y packages/
  const searchDirs = ['apps', 'packages'];
  const allFiles: string[] = [];
  
  for (const dir of searchDirs) {
    const fullPath = join(process.cwd(), dir);
    try {
      if (statSync(fullPath).isDirectory()) {
        getAllFiles(fullPath, allFiles);
      }
    } catch (error) {
      console.warn(`Warning: Could not access ${dir}:`, error);
    }
  }
  
  // Comparar todos los pares de archivos (limitado para no ser demasiado lento)
  const maxFiles = 100; // Limitar para no ser demasiado lento
  const filesToCheck = allFiles.slice(0, maxFiles);
  
  console.log(`Comparando ${filesToCheck.length} archivos...`);
  
  for (let i = 0; i < filesToCheck.length; i++) {
    for (let j = i + 1; j < filesToCheck.length; j++) {
      const fileIssues = findDuplicationsInFiles(filesToCheck[i], filesToCheck[j]);
      issues.push(...fileIssues);
    }
  }
  
  return issues;
}

function generateReport(issues: DuplicationIssue[]): string {
  // Agrupar por archivo
  const byFile = new Map<string, DuplicationIssue[]>();
  for (const issue of issues) {
    if (!byFile.has(issue.file1)) {
      byFile.set(issue.file1, []);
    }
    byFile.get(issue.file1)!.push(issue);
  }
  
  let report = `# Auditoría de Código Duplicado\n\n`;
  report += `**Fecha:** ${new Date().toISOString().split('T')[0]}\n\n`;
  report += `**Total de duplicaciones encontradas:** ${issues.length}\n\n`;
  
  report += `## Nota\n\n`;
  report += `Este es un análisis básico. Para análisis más avanzado, considerar usar herramientas como:\n`;
  report += `- [jscpd](https://github.com/kucherenko/jscpd) - Detector de código duplicado\n`;
  report += `- [PMD](https://pmd.github.io/) - Análisis estático de código\n`;
  report += `- [SonarQube](https://www.sonarqube.org/) - Plataforma de calidad de código\n\n`;
  
  if (issues.length > 0) {
    report += `## Duplicaciones Encontradas\n\n`;
    
    const sortedFiles = Array.from(byFile.entries()).sort((a, b) => b[1].length - a[1].length);
    
    for (const [file, fileIssues] of sortedFiles.slice(0, 20)) { // Limitar a 20 archivos
      report += `### ${file} (${fileIssues.length} duplicaciones)\n\n`;
      
      for (const issue of fileIssues.slice(0, 5)) { // Limitar a 5 por archivo
        report += `**Duplicado con:** ${issue.file2}\n\n`;
        report += `- Líneas en ${issue.file1}: ${issue.lines1[0]}-${issue.lines1[1]}\n`;
        report += `- Líneas en ${issue.file2}: ${issue.lines2[0]}-${issue.lines2[1]}\n`;
        report += `- Similitud: ${(issue.similarity * 100).toFixed(1)}%\n\n`;
        report += `\`\`\`typescript\n${issue.code}\n\`\`\`\n\n`;
        report += `---\n\n`;
      }
    }
    
    if (issues.length > 100) {
      report += `\n*... y ${issues.length - 100} duplicaciones más*\n\n`;
    }
  } else {
    report += `## ✅ No se encontraron duplicaciones significativas\n\n`;
  }
  
  report += `## Recomendaciones\n\n`;
  report += `1. **Extraer código duplicado a funciones/componentes reutilizables**\n`;
  report += `2. **Crear utilidades compartidas en \`utils/\` o \`lib/\`**\n`;
  report += `3. **Usar composición en lugar de duplicación**\n`;
  report += `4. **Aplicar principio DRY (Don't Repeat Yourself)**\n\n`;
  
  return report;
}

function main() {
  console.log('🔍 Buscando código duplicado...');
  console.log('⚠️  Nota: Este es un análisis básico. Para análisis más avanzado, usar herramientas como jscpd.');
  
  const issues = extractDuplications();
  console.log(`✅ Encontradas ${issues.length} duplicaciones`);
  
  // Generar reporte
  const report = generateReport(issues);
  const reportPath = join(process.cwd(), 'docs', 'CODE_DUPLICATION_AUDIT_REPORT.md');
  const fs = require('fs');
  fs.writeFileSync(reportPath, report, 'utf-8');
  console.log(`📄 Reporte generado en: ${reportPath}`);
  
  // Generar JSON
  const jsonPath = join(process.cwd(), 'docs', 'CODE_DUPLICATION_AUDIT_REPORT.json');
  fs.writeFileSync(jsonPath, JSON.stringify(issues, null, 2), 'utf-8');
  console.log(`📊 JSON generado en: ${jsonPath}`);
  
  if (issues.length > 0) {
    console.log(`\n⚠️  Se encontraron ${issues.length} duplicaciones que deberían revisarse.`);
  } else {
    console.log('\n✅ No se encontraron duplicaciones significativas.');
  }
}

if (require.main === module) {
  main();
}

export { extractDuplications, generateReport };









