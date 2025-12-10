const fs = require('fs');
const path = require('path');

// Función para procesar un archivo
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');

    // Revertir importaciones absolutas a @cactus/ui
    content = content.replace(
      /from '\/Users\/prueba\/Desktop\/CactusDashboard\/packages\/ui\/dist'/g,
      "from '@cactus/ui'"
    );

    // Revertir importaciones relativas a @cactus/ui
    content = content.replace(
      /from '\.\.\/\.\.\/\.\.\/\.\.\/packages\/ui\/dist'/g,
      "from '@cactus/ui'"
    );

    // Revertir importaciones relativas más cortas
    content = content.replace(
      /from '\.\.\/\.\.\/\.\.\/\.\.\/packages\/ui\/dist'/g,
      "from '@cactus/ui'"
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Revertido: ${filePath}`);
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
      // Leer el archivo para ver si contiene importaciones que revertir
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('/packages/ui/dist') || content.includes('/Users/prueba/Desktop/CactusDashboard/packages/ui/dist')) {
          processFile(fullPath);
        }
      } catch (error) {
        // Ignorar errores de lectura
      }
    }
  }
}

// Procesar el directorio apps/web
console.log('🔄 Revirtiendo importaciones a @cactus/ui...');
processDirectory('apps/web');
console.log('✅ Completado');