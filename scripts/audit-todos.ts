#!/usr/bin/env tsx
/**
 * Script de auditoría de TODOs/FIXMEs/BUGs
 * 
 * Categoriza y genera reporte de todos los TODOs encontrados en el código
 */

import { writeFileSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

interface TodoItem {
  file: string;
  line: number;
  type: 'TODO' | 'FIXME' | 'BUG' | 'XXX' | 'HACK';
  content: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

// Palabras clave para categorizar por prioridad
const criticalKeywords = [
  'bug', 'error', 'crash', 'security', 'vulnerability', 'leak', 
  'performance', 'slow', 'timeout', 'memory', 'race condition',
  'data loss', 'corruption', 'breaking', 'deprecated'
];

const highKeywords = [
  'feature', 'important', 'required', 'must', 'should', 
  'improve', 'optimize', 'refactor', 'cleanup', 'technical debt'
];

const mediumKeywords = [
  'consider', 'maybe', 'future', 'enhancement', 'nice to have',
  'documentation', 'comment', 'note'
];

function categorizeTodo(content: string, type: string): 'critical' | 'high' | 'medium' | 'low' {
  const lowerContent = content.toLowerCase();
  
  // BUG siempre es crítico
  if (type === 'BUG') return 'critical';
  
  // XXX y HACK son altos por defecto
  if (type === 'XXX' || type === 'HACK') return 'high';
  
  // Verificar palabras clave críticas
  if (criticalKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'critical';
  }
  
  // Verificar palabras clave altas
  if (highKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'high';
  }
  
  // Verificar palabras clave medias
  if (mediumKeywords.some(keyword => lowerContent.includes(keyword))) {
    return 'medium';
  }
  
  // Por defecto, TODO es medio, FIXME es alto
  if (type === 'FIXME') return 'high';
  if (type === 'TODO') return 'medium';
  
  return 'low';
}

function shouldIgnorePath(path: string): boolean {
  const ignoreDirs = ['node_modules', 'dist', '.next', 'coverage', '.turbo'];
  const ignoreFiles = ['.test.ts', '.test.tsx', '.spec.ts', '.spec.tsx'];
  
  // Verificar directorios ignorados
  if (ignoreDirs.some(dir => path.includes(dir))) {
    return true;
  }
  
  // Verificar archivos de test
  if (ignoreFiles.some(ext => path.endsWith(ext))) {
    return true;
  }
  
  return false;
}

function searchInFile(filePath: string): TodoItem[] {
  const todos: TodoItem[] = [];
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const todoPattern = /(TODO|FIXME|BUG|XXX|HACK)[:\s]*(.*)/i;
    
    lines.forEach((line, index) => {
      const match = line.match(todoPattern);
      if (match) {
        const [, typeUpper, content] = match;
        const type = typeUpper.toUpperCase() as TodoItem['type'];
        const priority = categorizeTodo(content, type);
        
        todos.push({
          file: relative(process.cwd(), filePath),
          line: index + 1,
          type,
          content: content.trim(),
          priority,
        });
      }
    });
  } catch (error) {
    // Ignorar errores de lectura (permisos, etc.)
    console.warn(`Warning: Could not read ${filePath}:`, error);
  }
  
  return todos;
}

function walkDirectory(dir: string, todos: TodoItem[]): void {
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      
      if (shouldIgnorePath(fullPath)) {
        continue;
      }
      
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDirectory(fullPath, todos);
      } else if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.tsx'))) {
        const fileTodos = searchInFile(fullPath);
        todos.push(...fileTodos);
      }
    }
  } catch (error) {
    // Ignorar errores de lectura de directorio
    console.warn(`Warning: Could not read directory ${dir}:`, error);
  }
}

function extractTodos(): TodoItem[] {
  const todos: TodoItem[] = [];
  
  // Buscar en apps/ y packages/
  const searchDirs = ['apps', 'packages'];
  
  for (const dir of searchDirs) {
    const fullPath = join(process.cwd(), dir);
    try {
      if (statSync(fullPath).isDirectory()) {
        walkDirectory(fullPath, todos);
      }
    } catch (error) {
      console.warn(`Warning: Could not access ${dir}:`, error);
    }
  }
  
  return todos;
}

function generateReport(todos: TodoItem[]): string {
  const byPriority = {
    critical: todos.filter(t => t.priority === 'critical'),
    high: todos.filter(t => t.priority === 'high'),
    medium: todos.filter(t => t.priority === 'medium'),
    low: todos.filter(t => t.priority === 'low'),
  };
  
  const byType = {
    TODO: todos.filter(t => t.type === 'TODO'),
    FIXME: todos.filter(t => t.type === 'FIXME'),
    BUG: todos.filter(t => t.type === 'BUG'),
    XXX: todos.filter(t => t.type === 'XXX'),
    HACK: todos.filter(t => t.type === 'HACK'),
  };
  
  let report = `# Auditoría de TODOs/FIXMEs/BUGs\n\n`;
  report += `**Fecha:** ${new Date().toISOString().split('T')[0]}\n\n`;
  report += `**Total encontrados:** ${todos.length}\n\n`;
  
  report += `## Resumen por Prioridad\n\n`;
  report += `- **Críticos:** ${byPriority.critical.length}\n`;
  report += `- **Altos:** ${byPriority.high.length}\n`;
  report += `- **Medios:** ${byPriority.medium.length}\n`;
  report += `- **Bajos:** ${byPriority.low.length}\n\n`;
  
  report += `## Resumen por Tipo\n\n`;
  report += `- **TODO:** ${byType.TODO.length}\n`;
  report += `- **FIXME:** ${byType.FIXME.length}\n`;
  report += `- **BUG:** ${byType.BUG.length}\n`;
  report += `- **XXX:** ${byType.XXX.length}\n`;
  report += `- **HACK:** ${byType.HACK.length}\n\n`;
  
  // Listar críticos
  if (byPriority.critical.length > 0) {
    report += `## 🔴 Críticos (${byPriority.critical.length})\n\n`;
    for (const todo of byPriority.critical) {
      report += `### ${todo.file}:${todo.line}\n\n`;
      report += `**Tipo:** ${todo.type}\n\n`;
      report += `\`\`\`typescript\n${todo.content}\n\`\`\`\n\n`;
      report += `---\n\n`;
    }
  }
  
  // Listar altos
  if (byPriority.high.length > 0) {
    report += `## 🟠 Altos (${byPriority.high.length})\n\n`;
    for (const todo of byPriority.high.slice(0, 20)) { // Limitar a 20 para no hacer el reporte muy largo
      report += `- **${todo.file}:${todo.line}** (${todo.type}): ${todo.content.substring(0, 100)}${todo.content.length > 100 ? '...' : ''}\n`;
    }
    if (byPriority.high.length > 20) {
      report += `\n*... y ${byPriority.high.length - 20} más*\n`;
    }
    report += `\n`;
  }
  
  // Resumen de medios y bajos
  if (byPriority.medium.length > 0) {
    report += `## 🟡 Medios (${byPriority.medium.length})\n\n`;
    report += `*Ver reporte completo para detalles*\n\n`;
  }
  
  if (byPriority.low.length > 0) {
    report += `## 🟢 Bajos (${byPriority.low.length})\n\n`;
    report += `*Ver reporte completo para detalles*\n\n`;
  }
  
  report += `## Recomendaciones\n\n`;
  report += `1. **Resolver TODOs críticos primero** - Estos pueden indicar bugs o problemas de seguridad\n`;
  report += `2. **Revisar FIXMEs** - Indican código que necesita corrección\n`;
  report += `3. **Documentar o resolver XXX/HACK** - Código temporal que debe ser refactorizado\n`;
  report += `4. **Eliminar TODOs obsoletos** - Si el TODO ya fue resuelto o ya no aplica\n\n`;
  
  return report;
}

function main() {
  console.log('🔍 Buscando TODOs/FIXMEs/BUGs...');
  
  const todos = extractTodos();
  console.log(`✅ Encontrados ${todos.length} TODOs/FIXMEs/BUGs`);
  
  // Generar reporte
  const report = generateReport(todos);
  const reportPath = join(process.cwd(), 'docs', 'TODOS_AUDIT_REPORT.md');
  writeFileSync(reportPath, report, 'utf-8');
  console.log(`📄 Reporte generado en: ${reportPath}`);
  
  // Generar JSON para procesamiento adicional
  const jsonPath = join(process.cwd(), 'docs', 'TODOS_AUDIT_REPORT.json');
  writeFileSync(jsonPath, JSON.stringify(todos, null, 2), 'utf-8');
  console.log(`📊 JSON generado en: ${jsonPath}`);
  
  // Mostrar resumen
  const critical = todos.filter(t => t.priority === 'critical').length;
  const high = todos.filter(t => t.priority === 'high').length;
  
  console.log('\n📊 Resumen:');
  console.log(`  🔴 Críticos: ${critical}`);
  console.log(`  🟠 Altos: ${high}`);
  console.log(`  🟡 Medios: ${todos.filter(t => t.priority === 'medium').length}`);
  console.log(`  🟢 Bajos: ${todos.filter(t => t.priority === 'low').length}`);
  
  if (critical > 0) {
    console.log(`\n⚠️  Se encontraron ${critical} TODOs críticos que requieren atención inmediata.`);
  }
}

if (require.main === module) {
  main();
}

export { extractTodos, categorizeTodo, generateReport };

