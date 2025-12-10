#!/usr/bin/env node

/**
 * Script para agregar "use client" a archivos compilados que lo necesiten
 * TypeScript no preserva las directivas "use client" de Next.js, así que las agregamos post-build
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, '../src');
const distDir = path.join(__dirname, '../dist');

/**
 * Busca archivos fuente que tienen "use client" y agrega la directiva al archivo compilado correspondiente
 */
function addUseClientDirective() {
  // Archivos que sabemos que necesitan "use client"
  const clientComponents = [
    'components/feedback/AnimatedList.tsx',
    // Agregar más componentes aquí si es necesario
  ];

  let processed = 0;

  clientComponents.forEach((srcPath) => {
    const fullSrcPath = path.join(srcDir, srcPath);
    const distPath = srcPath.replace(/\.tsx?$/, '.js');
    const fullDistPath = path.join(distDir, distPath);

    // Verificar que el archivo fuente tiene "use client"
    if (!fs.existsSync(fullSrcPath)) {
      console.warn(`Warning: Source file not found: ${fullSrcPath}`);
      return;
    }

    const srcContent = fs.readFileSync(fullSrcPath, 'utf8');
    if (!srcContent.includes('"use client"')) {
      console.warn(`Warning: Source file doesn't have "use client": ${srcPath}`);
      return;
    }

    // Verificar que el archivo compilado existe
    if (!fs.existsSync(fullDistPath)) {
      console.warn(`Warning: Compiled file not found: ${fullDistPath}`);
      return;
    }

    // Leer el archivo compilado
    let distContent = fs.readFileSync(fullDistPath, 'utf8');

    // Si ya tiene "use client", no hacer nada
    if (distContent.includes('"use client"')) {
      return;
    }

    // Agregar "use client" al inicio del archivo
    distContent = '"use client";\n\n' + distContent;
    fs.writeFileSync(fullDistPath, distContent, 'utf8');
    processed++;
    console.log(`✓ Added "use client" to ${distPath}`);
  });

  if (processed > 0) {
    console.log(`✓ Processed ${processed} file(s)`);
  } else {
    console.log('✓ No files needed processing');
  }
}

try {
  addUseClientDirective();
} catch (error) {
  console.error('Error adding "use client" directives:', error);
  process.exit(1);
}
