/**
 * Mapeador principal de columnas AUM
 *
 * Orquestador principal que mapea columnas flexibles de CSV/Excel a campos AUM
 */

import { logger } from '../logger';
import { normalizeColumnName } from './normalize-column-name';
import {
  findColumnByPatterns,
  ACCOUNT_NUMBER_PATTERNS,
  HOLDER_NAME_PATTERNS,
  ID_CUENTA_PATTERNS,
  ADVISOR_RAW_PATTERNS,
  AUM_DOLLARS_PATTERNS,
  BOLSA_ARG_PATTERNS,
  FONDOS_ARG_PATTERNS,
  BOLSA_BCI_PATTERNS,
  PESOS_PATTERNS,
  MEP_PATTERNS,
  CABLE_PATTERNS,
  CV7000_PATTERNS,
} from './column-pattern-matcher';
import { safeToString, safeToNumber, validateColumnMapping } from './column-validator';
import type { MappedAumColumns } from './types';

/**
 * Mapea columnas flexibles de un registro CSV/Excel a campos AUM
 *
 * @param record - Registro con columnas del archivo
 * @returns Objeto con accountNumber, holderName, advisorRaw y columnas financieras (pueden ser null)
 */
export function mapAumColumns(record: Record<string, unknown>): MappedAumColumns {
  const availableColumns = Object.keys(record);

  // AI_DECISION: Logging solo en primera fila para evitar spam excesivo
  // Justificación: Necesitamos diagnóstico pero no spam en cada fila
  // Impacto: Logging útil sin saturar la consola
  const isFirstRow = !(global as any).__aumMapperLogged;
  if (isFirstRow && availableColumns.length > 0) {
    (global as any).__aumMapperLogged = true;
    // Solo mostrar columnas clave para debugging, no todas las normalizaciones
    const keyColumns = availableColumns.slice(0, 10).join(', ');
    const moreColumns =
      availableColumns.length > 10 ? ` (+${availableColumns.length - 10} más)` : '';
    logger.debug(
      {
        totalColumns: availableColumns.length,
        keyColumns: `${keyColumns}${moreColumns}`,
      },
      'AUM Column Mapper: columnas detectadas'
    );
  }

  // AI_DECISION: Mantener un set de columnas ya asignadas para exclusión mutua
  // Justificación: Evita que una columna se use para múltiples campos (ej: "cuenta" como accountNumber y holderName)
  // Impacto: Mapeo más preciso y evita conflictos entre "Asesor" y "Cuenta"
  const assignedColumns = new Set<string>();

  // Helper function para buscar columna excluyendo las ya asignadas
  // AI_DECISION: Agregar validación para evitar mapear columnas numéricas a campos de texto
  // Justificación: Previene que columnas financieras se mapeen incorrectamente a advisorRaw
  // Impacto: Mapeo más preciso y menos errores de datos
  const findColumnExcluding = (
    patterns: string[],
    excludeColumns: string[] = [],
    isTextField: boolean = false
  ): string | null => {
    const available = availableColumns.filter(
      (col) => !assignedColumns.has(col) && !excludeColumns.includes(col)
    );
    const foundColumn = findColumnByPatterns(available, patterns);

    // Si es un campo de texto (como advisorRaw), validar que la columna no sea principalmente numérica
    if (foundColumn && isTextField) {
      // Verificar si la columna tiene principalmente valores numéricos en las primeras filas
      // (esto se hace en el parser, pero aquí podemos hacer una validación básica del nombre)
      const normalizedColName = normalizeColumnName(foundColumn);
      // Si el nombre de la columna contiene palabras clave numéricas, podría ser un error
      const numericKeywords = [
        'dolar',
        'dollar',
        'aum',
        'bolsa',
        'fondos',
        'pesos',
        'mep',
        'cable',
        'cv7000',
        'usd',
        'arg',
        'bci',
      ];
      const hasNumericKeyword = numericKeywords.some((keyword) =>
        normalizedColName.includes(keyword)
      );

      if (hasNumericKeyword && isFirstRow) {
        logger.warn(
          {
            column: foundColumn,
            normalizedName: normalizedColName,
            patterns: patterns.slice(0, 3).join(', '),
          },
          'AUM Column Mapper: posible mapeo incorrecto - columna con nombre numérico mapeada a campo de texto'
        );
      }
    }

    return foundColumn;
  };

  // 1. Buscar accountNumber primero (prioriza 'comitente')
  // AI_DECISION: Si hay "comitente", excluir "cuenta" de accountNumber patterns
  // Justificación: Cuando hay "comitente", "cuenta" es el nombre del cliente (holderName), no accountNumber
  // Impacto: Mapeo correcto para formatos idCuenta,comitente,cuenta y idCuenta,comitente,Descripcion
  const hasComitenteColumn = availableColumns.some(
    (col) => normalizeColumnName(col) === normalizeColumnName('comitente')
  );

  let accountNumberPatterns = ACCOUNT_NUMBER_PATTERNS;
  if (hasComitenteColumn) {
    // Si hay "comitente", excluir "cuenta" de los patrones de accountNumber
    // porque "cuenta" será el nombre del cliente (holderName)
    accountNumberPatterns = ACCOUNT_NUMBER_PATTERNS.filter((p) => p !== 'cuenta');
  }

  const accountNumberColumn = findColumnExcluding(accountNumberPatterns);
  if (accountNumberColumn) {
    assignedColumns.add(accountNumberColumn);
  }

  // 2. Buscar idCuenta (no debería conflictuar con accountNumber normalmente)
  const idCuentaColumn = findColumnExcluding(ID_CUENTA_PATTERNS);
  if (idCuentaColumn) {
    assignedColumns.add(idCuentaColumn);
  }

  // 3. Buscar advisorRaw ANTES de holderName para evitar que "Asesor" se use como holderName
  // AI_DECISION: Buscar advisorRaw antes de holderName para exclusión mutua
  // Justificación: "Asesor" nunca debe mapearse a holderName, solo a advisorRaw
  // Impacto: Previene mezcla de columnas "Asesor" y "Cuenta"
  // AI_DECISION: Excluir "cuenta" de la búsqueda de advisorRaw cuando hay "comitente"
  // Justificación: Cuando hay "comitente", "cuenta" es el nombre del cliente (holderName), no asesor
  // Impacto: Evita que "cuenta" se mapee incorrectamente a advisorRaw en formatos idCuenta,comitente,cuenta
  const excludeFromAdvisorSearch: string[] = [];
  if (hasComitenteColumn) {
    // Si hay "comitente", excluir "cuenta" de la búsqueda de advisorRaw
    const cuentaCol = availableColumns.find(
      (col) => normalizeColumnName(col) === normalizeColumnName('cuenta')
    );
    if (cuentaCol) {
      excludeFromAdvisorSearch.push(cuentaCol);
    }
  }
  const advisorRawColumn = findColumnExcluding(
    ADVISOR_RAW_PATTERNS,
    excludeFromAdvisorSearch,
    true
  ); // true = isTextField
  if (advisorRawColumn) {
    assignedColumns.add(advisorRawColumn);
  }

  // 4. Buscar holderName excluyendo accountNumber, idCuenta y advisorRaw ya asignados
  // AI_DECISION: Cuando hay "comitente", "cuenta" es holderName (nombre del cliente)
  // Justificación: En formatos con comitente, "cuenta" o "Descripcion" es el nombre del cliente
  // Impacto: Mapeo correcto para archivos con estructura idCuenta,comitente,cuenta o idCuenta,comitente,Descripcion,Asesor
  let holderNameColumn: string | null = null;
  const isComitenteFormat =
    accountNumberColumn &&
    normalizeColumnName(accountNumberColumn) === normalizeColumnName('comitente');

  if (isComitenteFormat) {
    // Si tenemos "comitente" como accountNumber, buscar holderName en este orden:
    // 1. "Descripcion" o "descripción" (formato Balanz completo)
    // 2. "cuenta" (formato reporteClusterCuentasV2 - nombre del cliente)
    // 3. Otros patrones de holderName
    const descripcionPatterns = ['descripcion', 'descripción'];
    holderNameColumn = findColumnExcluding(descripcionPatterns);

    if (!holderNameColumn) {
      // Si no hay "Descripcion", buscar "cuenta" (que es el nombre del cliente en algunos formatos)
      const cuentaColumn = findColumnExcluding(['cuenta']);
      if (cuentaColumn) {
        holderNameColumn = cuentaColumn;
      }
    }

    if (!holderNameColumn) {
      // Si no hay "Descripcion" ni "cuenta", buscar otros patrones excluyendo patrones de asesor
      const holderPatternsWithoutAdvisor = HOLDER_NAME_PATTERNS.filter(
        (p) => p !== 'cuenta' && !ADVISOR_RAW_PATTERNS.includes(p)
      );
      holderNameColumn = findColumnExcluding(holderPatternsWithoutAdvisor);
    }
  } else {
    // Si no hay "comitente", buscar holderName normalmente pero excluyendo patrones de asesor
    const holderPatternsWithoutAdvisor = HOLDER_NAME_PATTERNS.filter(
      (p) => !ADVISOR_RAW_PATTERNS.includes(p)
    );
    holderNameColumn = findColumnExcluding(holderPatternsWithoutAdvisor);
  }

  if (holderNameColumn) {
    assignedColumns.add(holderNameColumn);
  }

  // 5. Buscar columnas financieras (no deberían conflictuar con las anteriores)
  const aumDollarsColumn = findColumnExcluding(AUM_DOLLARS_PATTERNS);
  if (aumDollarsColumn) {
    assignedColumns.add(aumDollarsColumn);
  }

  const bolsaArgColumn = findColumnExcluding(BOLSA_ARG_PATTERNS);
  if (bolsaArgColumn) {
    assignedColumns.add(bolsaArgColumn);
  }

  const fondosArgColumn = findColumnExcluding(FONDOS_ARG_PATTERNS);
  if (fondosArgColumn) {
    assignedColumns.add(fondosArgColumn);
  }

  const bolsaBciColumn = findColumnExcluding(BOLSA_BCI_PATTERNS);
  if (bolsaBciColumn) {
    assignedColumns.add(bolsaBciColumn);
  }

  const pesosColumn = findColumnExcluding(PESOS_PATTERNS);
  if (pesosColumn) {
    assignedColumns.add(pesosColumn);
  }

  const mepColumn = findColumnExcluding(MEP_PATTERNS);
  if (mepColumn) {
    assignedColumns.add(mepColumn);
  }

  const cableColumn = findColumnExcluding(CABLE_PATTERNS);
  if (cableColumn) {
    assignedColumns.add(cableColumn);
  }

  const cv7000Column = findColumnExcluding(CV7000_PATTERNS);
  if (cv7000Column) {
    assignedColumns.add(cv7000Column);
  }

  // Construir objeto mapeado para validación
  // AI_DECISION: Validar que advisorRaw no sea un valor numérico antes de asignarlo
  // Justificación: Si la columna "Asesor" contiene números, es un error de mapeo y debe corregirse
  // Impacto: Previene que valores financieros se asignen incorrectamente a advisorRaw
  let advisorRawValue: string | null = null;
  if (advisorRawColumn) {
    const rawValue = record[advisorRawColumn];

    // Logging detallado en primera fila para debugging
    if (isFirstRow) {
      logger.info(
        {
          advisorColumn: advisorRawColumn,
          rawValue,
          valueType: typeof rawValue,
          availableColumns: availableColumns.join(', '),
        },
        'AUM Column Mapper: mapeo resuelto'
      );
    }

    // Si el valor es null o undefined, mantener null
    if (rawValue === null || rawValue === undefined) {
      advisorRawValue = null;
    } else {
      const strValue = String(rawValue).trim();
      // Manejar valores vacíos o especiales como null (sin warning)
      if (strValue === '' || strValue === '-' || strValue === '--' || strValue === '—') {
        advisorRawValue = null;
      } else {
        // Verificar si es un número (incluyendo formatos europeos y US)
        // Patrón mejorado para detectar números con separadores de miles y decimales
        // Formato europeo: "1.046,62" (punto = miles, coma = decimal)
        // Formato US: "1,046.62" (coma = miles, punto = decimal)
        // Formato simple: "1046.62" o "1046,62"
        const cleanedForNumericCheck = strValue.replace(/\./g, '').replace(',', '.');
        const numericPattern = /^-?\d+\.?\d*$/;
        const isNumeric =
          numericPattern.test(cleanedForNumericCheck) &&
          !isNaN(parseFloat(cleanedForNumericCheck)) &&
          isFinite(parseFloat(cleanedForNumericCheck));

        // También verificar si tiene formato de número con separadores (ej: "1.046,62" o "1,046.62")
        const hasNumberFormat = /^\d+[.,]\d+([.,]\d+)*$/.test(strValue.replace(/\s/g, ''));

        if (isNumeric || hasNumberFormat) {
          // Si es numérico, es probablemente un error de mapeo, asignar null y loguear warning
          // Solo loguear en primera fila para evitar spam
          if (isFirstRow) {
            logger.warn(
              {
                column: advisorRawColumn,
                value: rawValue,
                strValue,
                isNumeric,
                hasNumberFormat,
                availableColumns: availableColumns.join(', '),
              },
              'AUM Column Mapper: advisorRaw contiene valor numérico, posible error de mapeo - se asignará null'
            );
          }
          advisorRawValue = null;
        } else {
          // No es numérico, asignar normalmente
          advisorRawValue = safeToString(rawValue);

          // AI_DECISION: Detectar y corregir error de formato "Nombre+Numero" en advisorRaw
          // Justificación: A veces el CSV tiene errores donde el asesor aparece como "Mateo Vicente8019.23"
          // cuando debería ser solo "Mateo Vicente" (el número es un valor financiero que se corrió)
          // Impacto: Corrige automáticamente el nombre del asesor para evitar asesores ficticios
          if (advisorRawValue) {
            const advisorWithNumberPattern = /^([A-Za-z\s]+?)(\d+[\.,]\d+)$/;
            const errorMatch = advisorRawValue.match(advisorWithNumberPattern);

            if (errorMatch) {
              const nombreReal = errorMatch[1].trim();
              const numeroExtraido = errorMatch[2];

              logger.warn(
                {
                  originalValue: advisorRawValue,
                  extractedName: nombreReal,
                  extractedNumber: numeroExtraido,
                },
                'AUM Column Mapper: Detectado error de formato Asesor+Numero - se corrige automaticamente'
              );

              advisorRawValue = nombreReal;
            }
          }
        }
      }
    }
  }

  const mapped: MappedAumColumns = {
    accountNumber: accountNumberColumn ? safeToString(record[accountNumberColumn]) : null,
    holderName: holderNameColumn ? safeToString(record[holderNameColumn]) : null,
    idCuenta: idCuentaColumn ? safeToString(record[idCuentaColumn]) : null,
    advisorRaw: advisorRawValue,
    aumDollars: null, // Se asignará después
    bolsaArg: null,
    fondosArg: null,
    bolsaBci: null,
    pesos: null,
    mep: null,
    cable: null,
    cv7000: null,
  };

  // Validar mapeo de columnas (solo en primera fila)
  if (isFirstRow) {
    const validation = validateColumnMapping(availableColumns, mapped);

    if (validation.errors.length > 0) {
      logger.warn(
        {
          errors: validation.errors,
          warnings: validation.warnings.length > 0 ? validation.warnings : undefined,
          fileType: validation.fileType,
          mappedColumns: validation.mappedColumns,
        },
        `AUM Column Mapper: ${validation.errors.length} error(es) de validación detectados`
      );
    } else if (validation.warnings.length > 0) {
      logger.warn(
        {
          warnings: validation.warnings,
          fileType: validation.fileType,
          mappedColumns: validation.mappedColumns,
        },
        `AUM Column Mapper: ${validation.warnings.length} advertencia(s) de mapeo`
      );
    }

    // Consolidar información de mapeo en mensaje más conciso
    const mappedFields = [
      accountNumberColumn && 'comitente',
      idCuentaColumn && 'idCuenta',
      holderNameColumn && 'holderName',
      advisorRawColumn && 'asesor',
      aumDollarsColumn && 'aumDollars',
      bolsaArgColumn && 'bolsaArg',
      fondosArgColumn && 'fondosArg',
      bolsaBciColumn && 'bolsaBci',
      pesosColumn && 'pesos',
      mepColumn && 'mep',
      cableColumn && 'cable',
      cv7000Column && 'cv7000',
    ]
      .filter(Boolean)
      .join(', ');

    logger.debug(
      {
        fileType: validation.fileType,
        mappedFields,
        format: isComitenteFormat ? 'comitente' : 'standard',
      },
      'AUM Column Mapper: mapeo resuelto'
    );
  }

  // Extraer valores financieros usando conversión segura
  mapped.aumDollars = aumDollarsColumn ? safeToNumber(record[aumDollarsColumn]) : null;

  mapped.bolsaArg = bolsaArgColumn ? safeToNumber(record[bolsaArgColumn]) : null;

  mapped.fondosArg = fondosArgColumn ? safeToNumber(record[fondosArgColumn]) : null;

  mapped.bolsaBci = bolsaBciColumn ? safeToNumber(record[bolsaBciColumn]) : null;

  mapped.pesos = pesosColumn ? safeToNumber(record[pesosColumn]) : null;

  mapped.mep = mepColumn ? safeToNumber(record[mepColumn]) : null;

  mapped.cable = cableColumn ? safeToNumber(record[cableColumn]) : null;

  mapped.cv7000 = cv7000Column ? safeToNumber(record[cv7000Column]) : null;

  return mapped;
}
