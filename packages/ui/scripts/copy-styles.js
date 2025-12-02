#!/usr/bin/env node

/**
 * Script para copiar archivos CSS desde src/styles a dist/styles
 * Reemplaza copyfiles que tiene problemas de compatibilidad con Node.js 22
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src/styles');
const destDir = path.join(__dirname, '../dist/styles');

// Crear directorio destino si no existe
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Función para copiar archivos recursivamente
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const files = fs.readdirSync(src);
    files.forEach(file => {
      copyRecursive(
        path.join(src, file),
        path.join(dest, file)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copiar todos los archivos CSS
try {
  if (fs.existsSync(srcDir)) {
    const files = fs.readdirSync(srcDir);
    files.forEach(file => {
      const srcPath = path.join(srcDir, file);
      const destPath = path.join(destDir, file);
      const stat = fs.statSync(srcPath);
      
      if (stat.isFile() && file.endsWith('.css')) {
        copyRecursive(srcPath, destPath);
        console.log(`Copied: ${file}`);
      } else if (stat.isDirectory()) {
        // Si es un directorio, copiar recursivamente
        copyRecursive(srcPath, destPath);
        console.log(`Copied directory: ${file}`);
      }
    });
    console.log('✓ Styles copied successfully');
  } else {
    console.warn(`Warning: Source directory ${srcDir} does not exist`);
  }
} catch (error) {
  console.error('Error copying styles:', error);
  process.exit(1);
}


