import { createInstrument, getInstruments, addPortfolioLine, deletePortfolioLine } from '@/lib/api';
import { logger, toLogContext } from '@/lib/logger';
import type { PortfolioLine, Instrument } from '@/types';

/**
 * Asegura que los instrumentos existan, creándolos si es necesario
 * @param lines - Líneas del portfolio que pueden tener instrumentSymbol sin instrumentId
 * @returns Array de IDs de instrumentos en el mismo orden que las líneas
 */
export async function ensureInstrumentsExist(lines: PortfolioLine[]): Promise<string[]> {
  const instrumentIds: string[] = [];

  for (const line of lines) {
    if (!line.instrumentId && line.instrumentSymbol) {
      let lastError: Error | null = null;
      const maxRetries = 2;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Intentar crear el instrumento
          const instrumentResponse = await createInstrument({
            symbol: line.instrumentSymbol,
            name: line.instrumentName || line.instrumentSymbol,
            type: 'EQUITY',
            currency: 'USD',
          });

          if (instrumentResponse.success && instrumentResponse.data?.instrument?.id) {
            instrumentIds.push(instrumentResponse.data.instrument.id);
            break;
          } else {
            // Si no se pudo crear, buscar si ya existe
            const searchResponse = await getInstruments({ search: line.instrumentSymbol });
            if (searchResponse.success && searchResponse.data?.instruments) {
              const existing = searchResponse.data.instruments.find(
                (inst: Instrument) => inst.symbol === line.instrumentSymbol
              );
              if (existing) {
                instrumentIds.push(existing.id);
                break;
              }
            }
            
            if (attempt === maxRetries) {
              throw new Error(
                `No se pudo encontrar el activo "${line.instrumentSymbol}". Verifica que el símbolo sea correcto.`
              );
            }
          }
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          // Check for 409 Conflict (Instrument already exists)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const apiError = lastError as any;
          if (apiError.status === 409 && apiError.data?.data?.id) {
            logger.info(
              { symbol: line.instrumentSymbol, id: apiError.data.data.id },
              'Instrument already exists, using existing ID'
            );
            instrumentIds.push(apiError.data.data.id);
            break;
          }
          
          if (attempt < maxRetries) {
            // Exponential backoff: 100ms, 200ms
            await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
            continue;
          }
          
          logger.error(
            toLogContext({ err: lastError, symbol: line.instrumentSymbol, attempts: attempt + 1 }),
            'Error creating/finding instrument after retries'
          );
          throw new Error(
            `Error al procesar el activo "${line.instrumentSymbol}": ${lastError.message}`
          );
        }
      }
    } else if (line.instrumentId) {
      instrumentIds.push(line.instrumentId);
    } else {
      instrumentIds.push('');
    }
  }

  return instrumentIds;
}

/**
 * Sincroniza las líneas de un portfolio: elimina las removidas y agrega/actualiza las modificadas
 * @param portfolioId - ID del portfolio
 * @param currentLines - Líneas actuales del portfolio
 * @param newLines - Nuevas líneas a sincronizar
 * @param instrumentIds - IDs de instrumentos correspondientes a las nuevas líneas
 */
export async function syncPortfolioLines(
  portfolioId: string,
  currentLines: PortfolioLine[],
  newLines: PortfolioLine[],
  instrumentIds: string[]
): Promise<void> {
  // Identificar líneas a eliminar (están en currentLines pero no en newLines)
  const newLineIds = new Set(newLines.map((l) => l.id).filter((id) => !id.startsWith('temp-')));
  const linesToDelete = currentLines.filter((l) => !newLineIds.has(l.id));

  // Eliminar líneas removidas
  for (const line of linesToDelete) {
    await deletePortfolioLine(portfolioId, line.id);
  }

  // Actualizar o agregar líneas modificadas
  for (let i = 0; i < newLines.length; i++) {
    const newLine = newLines[i];
    const currentLine = currentLines.find((l) => l.id === newLine.id);
    const instrumentId = instrumentIds[i] || newLine.instrumentId;

    // Si la línea cambió (no existe o el peso cambió significativamente)
    const weightChanged = currentLine
      ? Math.abs(Number(currentLine.targetWeight) - newLine.targetWeight) > 0.001
      : true;

    if (!currentLine || weightChanged) {
      // Eliminar línea actual si existe
      if (currentLine) {
        await deletePortfolioLine(portfolioId, currentLine.id);
      }

      // Agregar nueva línea
      await addPortfolioLine(portfolioId, {
        targetType: newLine.targetType,
        targetWeight: newLine.targetWeight,
        ...(newLine.targetType === 'assetClass' && newLine.assetClass
          ? { assetClass: newLine.assetClass }
          : {}),
        ...(newLine.targetType === 'instrument' && instrumentId ? { instrumentId } : {}),
      });
    }
  }
}
