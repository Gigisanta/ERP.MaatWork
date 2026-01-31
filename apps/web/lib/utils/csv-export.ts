/**
 * Utilidades para exportar datos a CSV
 *
 * AI_DECISION: Exportación CSV en cliente para evitar carga en servidor
 * Justificación: Los filtros ya están aplicados en el cliente, exportar directamente es más eficiente
 * Impacto: Mejor rendimiento, menos carga en API
 */

import type { Contact, PipelineStage } from '@/types';
import { logger, toLogContextValue } from '../logger';
import { formatDateDDMMYYYY } from '@maatwork/utils';

/**
 * Calcula el score de completitud de un contacto para ordenamiento
 * Score más alto = perfil más completo comercialmente
 */
function calculateCompletenessScore(contact: Contact): number {
  let score = 0;

  // Email y teléfono son los más importantes para campañas comerciales
  if (contact.email && contact.email.trim() !== '') score += 10;
  if (contact.phone && contact.phone.trim() !== '') score += 10;

  // Información adicional aumenta el score
  if (contact.dni && contact.dni.trim() !== '') score += 3;
  if (contact.nextStep && contact.nextStep.trim() !== '') score += 2;
  if (contact.notes && contact.notes.trim() !== '') score += 2;
  if (contact.tags && contact.tags.length > 0) score += 1;

  // WhatsApp o teléfono secundario desde customFields
  const whatsapp = contact.customFields?.whatsapp;
  const phoneSecondary = contact.customFields?.phoneSecondary;
  if (whatsapp && String(whatsapp).trim() !== '') score += 5;
  if (phoneSecondary && String(phoneSecondary).trim() !== '') score += 3;

  return score;
}

/**
 * Ordena contactos por completitud de perfil comercial
 * Prioriza: email + teléfono > solo email > solo teléfono > sin info de contacto
 */
function sortContactsByCompleteness(contacts: Contact[]): Contact[] {
  return [...contacts].sort((a, b) => {
    const scoreA = calculateCompletenessScore(a);
    const scoreB = calculateCompletenessScore(b);

    // Orden descendente (más completo primero)
    return scoreB - scoreA;
  });
}

/**
 * Escapa valores para CSV (maneja comillas, comas y saltos de línea)
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // Si contiene comillas, comas o saltos de línea, envolver en comillas y escapar comillas
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Obtiene el nombre de la etapa del pipeline
 */
function getStageName(pipelineStageId: string | null | undefined, stages: PipelineStage[]): string {
  if (!pipelineStageId) return '';
  const stage = stages.find((s) => s.id === pipelineStageId);
  return stage?.name ?? '';
}

/**
 * Obtiene los nombres de las etiquetas separados por punto y coma
 */
function getTagsNames(contact: Contact): string {
  if (!contact.tags || contact.tags.length === 0) return '';
  return contact.tags.map((tag) => tag.name).join('; ');
}

/**
 * Obtiene un campo de customFields de forma segura
 */
function getCustomField(contact: Contact, fieldName: string): string {
  const value = contact.customFields?.[fieldName];
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * Formatea fecha para CSV (formato legible)
 */
// function removed in favor of shared utility

/**
 * Exporta contactos a formato CSV ordenados por completitud comercial
 *
 * @param contacts - Array de contactos a exportar
 * @param pipelineStages - Array de etapas del pipeline para mapear IDs a nombres
 * @returns String CSV con BOM UTF-8 para compatibilidad con Excel
 */
export function exportContactsToCSV(contacts: Contact[], pipelineStages: PipelineStage[]): string {
  // Validar que contacts sea un array válido
  if (!Array.isArray(contacts)) {
    logger.error({ contacts }, 'exportContactsToCSV: contacts no es un array');
    contacts = [];
  }

  if (contacts.length === 0) {
    // CSV vacío con solo headers
    const headers = [
      'Nombre Completo',
      'Email',
      'Teléfono',
      'WhatsApp',
      'Teléfono Secundario',
      'DNI',
      'Etapa',
      'Etiquetas',
      'Próximo Paso',
      'Notas',
      'Fecha de Creación',
      'Último Contacto',
    ];
    return '\uFEFF' + headers.join(',') + '\n';
  }

  // Ordenar contactos por completitud comercial
  const sortedContacts = sortContactsByCompleteness(contacts);

  // Definir columnas en orden de importancia comercial
  const headers = [
    'Nombre Completo',
    'Email',
    'Teléfono',
    'WhatsApp',
    'Teléfono Secundario',
    'DNI',
    'Etapa',
    'Etiquetas',
    'Próximo Paso',
    'Notas',
    'Fecha de Creación',
    'Último Contacto',
  ];

  // Generar filas CSV
  const rows = sortedContacts.map((contact) => {
    const row = [
      escapeCSVValue(contact.fullName),
      escapeCSVValue(contact.email),
      escapeCSVValue(contact.phone),
      escapeCSVValue(getCustomField(contact, 'whatsapp')),
      escapeCSVValue(getCustomField(contact, 'phoneSecondary')),
      escapeCSVValue(contact.dni),
      escapeCSVValue(getStageName(contact.pipelineStageId, pipelineStages)),
      escapeCSVValue(getTagsNames(contact)),
      escapeCSVValue(contact.nextStep),
      escapeCSVValue(contact.notes),
      escapeCSVValue(
        formatDateDDMMYYYY(
          (contact as Contact & { createdAt?: string | Date }).createdAt as
            | string
            | Date
            | undefined
        )
      ),
      escapeCSVValue(formatDateDDMMYYYY(contact.contactLastTouchAt)),
    ];

    return row.join(',');
  });

  // Combinar headers y rows, agregar BOM UTF-8 para Excel
  const csvContent = [headers.join(','), ...rows].join('\n');
  return '\uFEFF' + csvContent;
}

/**
 * Descarga un CSV como archivo
 *
 * @param csvContent - Contenido CSV a descargar
 * @param filename - Nombre del archivo (sin extensión .csv)
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Validar que el contenido no esté vacío (solo headers)
  if (!csvContent || csvContent.trim().length === 0) {
    logger.error('downloadCSV: contenido CSV vacío');
    throw new Error('El contenido CSV está vacío');
  }

  // Validar que el contenido tenga al menos headers y una fila de datos
  const lines = csvContent.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    logger.warn({ lines }, 'downloadCSV: CSV solo tiene headers, sin datos');
  }

  logger.info({ filename, lineCount: lines.length }, 'downloadCSV: descargando archivo');

  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Limpiar URL object después de un pequeño delay para asegurar que la descarga se complete
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  } catch (err) {
    logger.error({
      error: toLogContextValue(err),
    }, 'downloadCSV: error al crear descarga');
    throw err;
  }
}
