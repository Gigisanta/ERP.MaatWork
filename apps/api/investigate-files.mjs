import XLSX from 'xlsx';
import fs from 'fs';

console.log('🔍 Investigando archivos...\n');

// 1. Cluster Cuentas
console.log('📊 CLUSTER CUENTAS (reporteClusterCuentasV2.xlsx):');
try {
  const clusterWorkbook = XLSX.readFile('../../reporteClusterCuentasV2.xlsx');
  console.log('Hojas:', clusterWorkbook.SheetNames);
  
  const clusterSheet = clusterWorkbook.Sheets[clusterWorkbook.SheetNames[0]];
  const clusterData = XLSX.utils.sheet_to_json(clusterSheet, { header: 1 });
  
  console.log('Total filas:', clusterData.length);
  console.log('Primera fila (headers):', clusterData[0]);
  console.log('Segunda fila (ejemplo):', clusterData[1]);
  console.log('Última fila:', clusterData[clusterData.length - 1]);
  console.log('');
} catch (error) {
  console.error('Error leyendo Cluster Cuentas:', error.message);
}

// 2. Comisiones
console.log('💰 COMISIONES (Comisiones (2).xlsx):');
try {
  const comisionesWorkbook = XLSX.readFile('../../Comisiones (2).xlsx');
  console.log('Hojas:', comisionesWorkbook.SheetNames);
  
  const comisionesSheet = comisionesWorkbook.Sheets[comisionesWorkbook.SheetNames[0]];
  const comisionesData = XLSX.utils.sheet_to_json(comisionesSheet, { header: 1 });
  
  console.log('Total filas:', comisionesData.length);
  console.log('Primera fila (headers):', comisionesData[0]);
  console.log('Segunda fila (ejemplo):', comisionesData[1]);
  console.log('Última fila:', comisionesData[comisionesData.length - 1]);
  console.log('');
} catch (error) {
  console.error('Error leyendo Comisiones:', error.message);
}

// 3. AUM Madre CSV
console.log('🏛️ AUM MADRE (Balanz Cactus 2025 - AUM Balanz.csv):');
try {
  const csvContent = fs.readFileSync('../../Balanz Cactus 2025 - AUM Balanz.csv', 'utf8');
  const lines = csvContent.split('\n');
  console.log('Total líneas:', lines.length);
  console.log('Primera línea:', lines[0]);
  console.log('Segunda línea:', lines[1]);
  console.log('');
} catch (error) {
  console.error('Error leyendo AUM Madre:', error.message);
}
