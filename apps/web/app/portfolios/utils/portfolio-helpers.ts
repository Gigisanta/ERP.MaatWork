import {
  createInstrument,
  getInstruments,
  addPortfolioLine,
  deletePortfolioLine,
} from '@/lib/api';
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
      try {
        // Intentar crear el instrumento
        const instrumentResponse = await createInstrument({
          symbol: line.instrumentSymbol,
          name: line.instrumentSymbol,
          type: 'EQUITY',
          currency: 'USD',
        });

        if (instrumentResponse.success && instrumentResponse.data?.instrument?.id) {
          instrumentIds.push(instrumentResponse.data.instrument.id);
        } else {
          // Si no se pudo crear, buscar si ya existe
          const searchResponse = await getInstruments({ search: line.instrumentSymbol });
          if (searchResponse.success && searchResponse.data?.instruments) {
            const existing = searchResponse.data.instruments.find(
              (inst: Instrument) => inst.symbol === line.instrumentSymbol
            );
            if (existing) {
              instrumentIds.push(existing.id);
            } else {
              throw new Error(`No se pudo crear ni encontrar el instrumento ${line.instrumentSymbol}`);
            }
          } else {
            throw new Error(`No se pudo crear el instrumento ${line.instrumentSymbol}`);
          }
        }
      } catch (err) {
        logger.error('Error creating/finding instrument', toLogContext({ err, symbol: line.instrumentSymbol }));
        throw err;
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
        ...(newLine.targetType === 'assetClass' && newLine.assetClass ? { assetClass: newLine.assetClass } : {}),
        ...(newLine.targetType === 'instrument' && instrumentId ? { instrumentId } : {}),
      });
    }
  }
}
