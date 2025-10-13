import XLSX from 'xlsx';
import fs from 'fs';

console.log('=== ANÁLISIS DE ARCHIVOS EXCEL ===\n');

// Listar archivos Excel
const excelFiles = fs.readdirSync('.').filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
console.log('Archivos Excel encontrados:', excelFiles);

for (const file of excelFiles) {
  console.log(`\n--- ${file} ---`);
  try {
    const workbook = XLSX.readFile(file);
    console.log('Hojas:', workbook.SheetNames);
    
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      console.log(`Hoja '${sheetName}': ${data.length} filas`);
      
      if (data.length > 0) {
        console.log('Columnas:', Object.keys(data[0]));
        
        // Buscar columnas relacionadas con clientes
        const clientColumns = Object.keys(data[0]).filter(col => 
          col.toLowerCase().includes('comitente') || 
          col.toLowerCase().includes('cuotapartista') ||
          col.toLowerCase().includes('cliente')
        );
        if (clientColumns.length > 0) {
          console.log('Columnas de clientes:', clientColumns);
          
          // Contar filas únicas por comitente/cuotapartista
          const uniqueClients = new Set();
          data.forEach(row => {
            const key = `${row[clientColumns[0]] || ''}-${row[clientColumns[1]] || ''}`;
            if (key !== '-') uniqueClients.add(key);
          });
          console.log(`Clientes únicos (por ${clientColumns.slice(0,2).join('/')}): ${uniqueClients.size}`);
        }
        
        // Para el archivo AUM, mostrar algunas filas de ejemplo
        if (file.includes('AUM') && data.length > 0) {
          console.log('\nPrimeras 3 filas:');
          data.slice(0, 3).forEach((row, i) => {
            console.log(`Fila ${i+1}:`, Object.keys(row).reduce((acc, key) => {
              acc[key] = row[key];
              return acc;
            }, {}));
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error leyendo ${file}:`, error.message);
  }
}
