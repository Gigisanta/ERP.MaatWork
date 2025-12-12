const fs = require('fs');
const path = require('path');

// Ruta absoluta al directorio dist de ui
const UI_DIST_PATH = '/Users/prueba/Desktop/CactusDashboard/packages/ui/dist';

// Función para procesar un archivo
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Reemplazar importaciones de @cactus/ui
    content = content.replace(
      /from '@cactus\/ui'/g,
      `from '${UI_DIST_PATH}'`
    );

    // Reemplazar importaciones de @cactus/ui/...
    content = content.replace(
      /from '@cactus\/ui\/([^']*)'/g,
      `from '${UI_DIST_PATH}/$1'`
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Procesado: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
  }
}

// Función para procesar directorio recursivamente
function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      processDirectory(fullPath);
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
      // Leer el archivo para ver si contiene importaciones de @cactus/ui
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('@cactus/ui')) {
          processFile(fullPath);
        }
      } catch (error) {
        // Ignorar errores de lectura
      }
    }
  }
}

// Procesar el directorio apps/web
console.log('🔧 Arreglando importaciones de @cactus/ui...');
processDirectory('apps/web');
console.log('✅ Completado');
