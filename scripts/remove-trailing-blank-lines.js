#!/usr/bin/env node

/**
 * Script para eliminar líneas vacías excesivas al final de archivos TypeScript
 * 
 * Elimina más de 2 líneas vacías consecutivas al final de cada archivo
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MAX_TRAILING_BLANK_LINES = 2;

function removeTrailingBlankLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Encontrar el último índice que no es línea vacía
  let lastNonEmptyIndex = lines.length - 1;
  while (lastNonEmptyIndex >= 0 && lines[lastNonEmptyIndex].trim() === '') {
    lastNonEmptyIndex--;
  }
  
  // Si hay más líneas vacías de las permitidas, eliminarlas
  const trailingBlankLines = lines.length - 1 - lastNonEmptyIndex;
  if (trailingBlankLines > MAX_TRAILING_BLANK_LINES) {
    const newLines = lines.slice(0, lastNonEmptyIndex + 1);
    // Agregar máximo MAX_TRAILING_BLANK_LINES líneas vacías
    for (let i = 0; i < MAX_TRAILING_BLANK_LINES; i++) {
      newLines.push('');
    }
    const newContent = newLines.join('\n');
    fs.writeFileSync(filePath, newContent, 'utf8');
    return trailingBlankLines - MAX_TRAILING_BLANK_LINES;
  }
  
  return 0;
}

function findFiles(dir, extensions, excludePatterns) {
  const files = [];
  
  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(process.cwd(), fullPath);
      
      // Skip excluded patterns
      if (excludePatterns.some(pattern => relativePath.includes(pattern))) {
        continue;
      }
      
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }
  
  walk(dir);
  return files;
}

function main() {
  const dirs = [
    'apps/api/src/routes',
    'apps/web/app',
    'packages',
  ];
  
  const extensions = ['.ts', '.tsx'];
  const excludePatterns = [
    'node_modules',
    'dist',
    '.next',
    '.test.ts',
    '.test.tsx',
  ];
  
  let totalRemoved = 0;
  let filesProcessed = 0;
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      continue;
    }
    
    const files = findFiles(dir, extensions, excludePatterns);
    
    for (const file of files) {
      try {
        const removed = removeTrailingBlankLines(file);
        if (removed > 0) {
          totalRemoved += removed;
          filesProcessed++;
          const relativePath = path.relative(process.cwd(), file);
          console.log(`✓ ${relativePath} (removed ${removed} blank lines)`);
        }
      } catch (error) {
        console.error(`✗ Error processing ${file}:`, error.message);
      }
    }
  }
  
  console.log(`\n✅ Processed ${filesProcessed} files, removed ${totalRemoved} trailing blank lines`);
}

main();
