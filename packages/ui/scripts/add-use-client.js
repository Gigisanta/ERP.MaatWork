#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

/**
 * Script para agregar "use client" a archivos compilados que lo necesiten
 * TypeScript no preserva las directivas "use client" de Next.js, así que las agregamos post-build
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, '../src');
const distDir = path.join(__dirname, '../dist');

/**
 * Busca archivos fuente que tienen "use client" y agrega la directiva al archivo compilado correspondiente
 */
function addUseClientDirective(dir = srcDir) {
  const files = fs.readdirSync(dir);
  let processed = 0;

  files.forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processed += addUseClientDirective(fullPath);
      return;
    }

    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const srcContent = fs.readFileSync(fullPath, 'utf8');
      if (srcContent.includes('"use client"') || srcContent.includes("'use client'")) {
        const relativePath = path.relative(srcDir, fullPath);
        const distPath = relativePath.replace(/\.tsx?$/, '.js');
        const fullDistPath = path.join(distDir, distPath);

        // Verificar que el archivo compilado existe
        if (!fs.existsSync(fullDistPath)) {
          return;
        }

        // Leer el archivo compilado
        let distContent = fs.readFileSync(fullDistPath, 'utf8');

        // Si ya tiene "use client", no hacer nada
        if (distContent.includes('"use client"') || distContent.includes("'use client'")) {
          return;
        }

        // Agregar "use client" al inicio del archivo
        distContent = "'use client';\n\n" + distContent;
        fs.writeFileSync(fullDistPath, distContent, 'utf8');
        processed++;
        console.log(`✓ Added "use client" to ${distPath}`);
      }
    }
  });

  return processed;
}

try {
  const totalProcessed = addUseClientDirective();
  if (totalProcessed > 0) {
    console.log(`✓ Processed ${totalProcessed} file(s)`);
  } else {
    console.log('✓ No files needed processing');
  }
} catch (error) {
  console.error('Error adding "use client" directives:', error);
  process.exit(1);
}
