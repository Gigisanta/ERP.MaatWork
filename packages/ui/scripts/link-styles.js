#!/usr/bin/env node
/* eslint-env node */
/* global console, process */

/**
 * Script para crear un symlink/copia de dist/styles/index.css a dist/styles.css
 * y copiar también las dependencias (animations.css) a la raíz de dist
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '../dist');
const stylesCssPath = path.join(distDir, 'styles.css');
const animationsCssPath = path.join(distDir, 'animations.css');
const stylesDir = path.join(distDir, 'styles');

try {
  // Asegurar que dist existe
  if (!fs.existsSync(distDir)) {
    console.error('Error: dist directory does not exist. Run build first.');
    process.exit(1);
  }

  // 1. Copiar index.css a styles.css
  const indexCssPath = path.join(stylesDir, 'index.css');
  if (fs.existsSync(stylesCssPath)) {
    fs.unlinkSync(stylesCssPath);
  }
  if (fs.existsSync(indexCssPath)) {
    fs.copyFileSync(indexCssPath, stylesCssPath);
    console.log('Created dist/styles.css');
  } else {
    console.warn('Warning: dist/styles/index.css not found');
  }

  // 2. Copiar animations.css a dist/animations.css para que @import './animations.css' funcione
  const srcAnimationsPath = path.join(stylesDir, 'animations.css');
  if (fs.existsSync(animationsCssPath)) {
    fs.unlinkSync(animationsCssPath);
  }
  if (fs.existsSync(srcAnimationsPath)) {
    fs.copyFileSync(srcAnimationsPath, animationsCssPath);
    console.log('Created dist/animations.css');
  } else {
    console.warn('Warning: dist/styles/animations.css not found');
  }
} catch (error) {
  console.error('Error linking styles:', error);
  process.exit(1);
}
