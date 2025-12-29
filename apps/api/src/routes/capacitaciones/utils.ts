/**
 * Capacitaciones Utilities
 *
 * Helper functions for capacitaciones operations
 */
import { promises as fs } from 'node:fs';
import { parseFechaDDMMYYYY } from '../../utils/date-utils';

/**
 * Parsea archivo CSV de capacitaciones
 * Retorna datos válidos y lista de errores por fila
 */
export async function parseCapacitacionesCSV(filePath: string): Promise<{
  data: Array<{
    titulo: string;
    tema: string;
    link: string;
    fecha: Date | null;
  }>;
  errors: Array<{ row: number; message: string }>;
}> {
  const { parse } = await import('csv-parse/sync');

  const content = await fs.readFile(filePath, 'utf-8');

  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    relax_quotes: true,
    escape: '"',
    quote: '"',
    cast: false,
  }) as Array<Record<string, string>>;

  if (!records || records.length === 0) {
    return {
      data: [],
      errors: [{ row: 0, message: 'El archivo CSV no contiene datos o está vacío' }],
    };
  }

  const capacitacionesList: Array<{
    titulo: string;
    tema: string;
    link: string;
    fecha: Date | null;
  }> = [];
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const rowNumber = i + 2; // +2 porque empieza en 1 y hay header

    // Validar que tenga las columnas requeridas
    const titulo = (r['Titulo'] || r['titulo'] || '').trim();
    const tema = (r['TEMA'] || r['tema'] || '').trim();
    const link = (r['LINK'] || r['link'] || '').trim();
    const fechaStr = (r['Fecha'] || r['fecha'] || '').trim();

    // Skip filas completamente vacías (todas las columnas vacías)
    if (!titulo && !tema && !link) {
      continue;
    }

    // Validar campos requeridos y agregar errores sin detener el proceso
    let hasError = false;

    if (!titulo) {
      errors.push({ row: rowNumber, message: `Fila ${rowNumber}: El campo 'Titulo' es requerido` });
      hasError = true;
    }
    if (!tema) {
      errors.push({ row: rowNumber, message: `Fila ${rowNumber}: El campo 'TEMA' es requerido` });
      hasError = true;
    }
    if (!link) {
      errors.push({ row: rowNumber, message: `Fila ${rowNumber}: El campo 'LINK' es requerido` });
      hasError = true;
    }

    // Si hay errores de campos requeridos, saltar esta fila
    if (hasError) {
      continue;
    }

    // Validar URL
    try {
      new URL(link);
    } catch {
      errors.push({
        row: rowNumber,
        message: `Fila ${rowNumber}: 'LINK' debe ser una URL válida: "${link}"`,
      });
      continue;
    }

    // Parsear fecha (puede ser null si está vacía o es inválida)
    const fecha = parseFechaDDMMYYYY(fechaStr);

    capacitacionesList.push({
      titulo,
      tema,
      link,
      fecha,
    });
  }

  return {
    data: capacitacionesList,
    errors,
  };
}








