/**
 * Handlers para componentes de benchmarks
 *
 * AI_DECISION: Extraer handlers de componentes a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request, Response } from 'express';
import { db } from '@cactus/db';
import { benchmarkDefinitions, benchmarkComponents, instruments } from '@cactus/db/schema';
import { eq, and } from 'drizzle-orm';
import { UserRole } from '../../../auth/types';
import {
  benchmarksCacheUtil,
  benchmarkComponentsCacheUtil,
  normalizeCacheKey,
} from '../../../utils/cache';
import type { ComponentWithWeight } from '../types';

/**
 * POST /benchmarks/:id/components
 * Agregar componente a benchmark
 */
export async function handleAddComponent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    const benchmarkId = req.params.id;

    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Solo admin puede editar componentes
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden editar componentes' });
    }

    const { instrumentId, weight } = req.body;

    if (!instrumentId || !weight) {
      return res.status(400).json({ error: 'Instrumento y peso son requeridos' });
    }

    // Verificar que el benchmark existe y es custom
    const benchmark = await db()
      .select({ id: benchmarkDefinitions.id, isSystem: benchmarkDefinitions.isSystem })
      .from(benchmarkDefinitions)
      .where(eq(benchmarkDefinitions.id, benchmarkId))
      .limit(1);

    if (benchmark.length === 0) {
      return res.status(404).json({ error: 'Benchmark no encontrado' });
    }

    if (benchmark[0].isSystem) {
      return res
        .status(403)
        .json({ error: 'No se pueden editar componentes de benchmarks del sistema' });
    }

    // Verificar que el instrumento existe
    const instrument = await db()
      .select({ id: instruments.id })
      .from(instruments)
      .where(eq(instruments.id, instrumentId))
      .limit(1);

    if (instrument.length === 0) {
      return res.status(404).json({ error: 'Instrumento no encontrado' });
    }

    // Validar peso
    const weightNum = Number(weight);
    if (weightNum < 0 || weightNum > 1) {
      return res.status(400).json({ error: 'El peso debe estar entre 0 y 1' });
    }

    // Verificar que la suma de pesos no exceda 1.0
    const existingComponents = await db()
      .select({ weight: benchmarkComponents.weight })
      .from(benchmarkComponents)
      .where(eq(benchmarkComponents.benchmarkId, benchmarkId));

    const currentTotal = existingComponents.reduce(
      (sum: number, comp: ComponentWithWeight) => sum + Number(comp.weight),
      0
    );
    if (currentTotal + weightNum > 1.0) {
      return res.status(400).json({
        error: `La suma de pesos excedería 100%. Peso actual: ${(currentTotal * 100).toFixed(2)}%, nuevo peso: ${(weightNum * 100).toFixed(2)}%`,
      });
    }

    // Crear componente
    const [component] = await db()
      .insert(benchmarkComponents)
      .values({
        benchmarkId,
        instrumentId,
        weight: weightNum,
      })
      .returning();

    // Invalidate cache when component is added
    benchmarksCacheUtil.clear();
    benchmarkComponentsCacheUtil.delete(normalizeCacheKey('benchmark', 'components', benchmarkId));

    res.status(201).json({
      success: true,
      data: component,
    });
  } catch (error) {
    req.log.error({ error }, 'Error adding benchmark component');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PUT /benchmarks/:id/components/:componentId
 * Actualizar componente de benchmark
 */
export async function handleUpdateComponent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    const { id: benchmarkId, componentId } = req.params;

    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Solo admin puede editar componentes
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden editar componentes' });
    }

    const { weight } = req.body;

    if (!weight) {
      return res.status(400).json({ error: 'Peso es requerido' });
    }

    // Verificar que el benchmark existe y es custom
    const benchmark = await db()
      .select({ id: benchmarkDefinitions.id, isSystem: benchmarkDefinitions.isSystem })
      .from(benchmarkDefinitions)
      .where(eq(benchmarkDefinitions.id, benchmarkId))
      .limit(1);

    if (benchmark.length === 0) {
      return res.status(404).json({ error: 'Benchmark no encontrado' });
    }

    if (benchmark[0].isSystem) {
      return res
        .status(403)
        .json({ error: 'No se pueden editar componentes de benchmarks del sistema' });
    }

    // Validar peso
    const weightNum = Number(weight);
    if (weightNum < 0 || weightNum > 1) {
      return res.status(400).json({ error: 'El peso debe estar entre 0 y 1' });
    }

    // Obtener peso actual del componente
    const currentComponent = await db()
      .select({ weight: benchmarkComponents.weight })
      .from(benchmarkComponents)
      .where(
        and(
          eq(benchmarkComponents.id, componentId),
          eq(benchmarkComponents.benchmarkId, benchmarkId)
        )
      )
      .limit(1);

    if (currentComponent.length === 0) {
      return res.status(404).json({ error: 'Componente no encontrado' });
    }

    // Verificar que la suma de pesos no exceda 1.0
    const existingComponents = await db()
      .select({ weight: benchmarkComponents.weight })
      .from(benchmarkComponents)
      .where(eq(benchmarkComponents.benchmarkId, benchmarkId));

    const currentTotal = existingComponents.reduce(
      (sum: number, comp: ComponentWithWeight) => sum + Number(comp.weight),
      0
    );
    const currentWeight = Number(currentComponent[0].weight);
    const newTotal = currentTotal - currentWeight + weightNum;

    if (newTotal > 1.0) {
      return res.status(400).json({
        error: `La suma de pesos excedería 100%. Peso actual total: ${(currentTotal * 100).toFixed(2)}%, nuevo total: ${(newTotal * 100).toFixed(2)}%`,
      });
    }

    // Actualizar componente
    const [updatedComponent] = await db()
      .update(benchmarkComponents)
      .set({
        weight: weightNum,
      })
      .where(
        and(
          eq(benchmarkComponents.id, componentId),
          eq(benchmarkComponents.benchmarkId, benchmarkId)
        )
      )
      .returning();

    // Invalidate cache when component is updated
    benchmarksCacheUtil.clear();
    benchmarkComponentsCacheUtil.delete(normalizeCacheKey('benchmark', 'components', benchmarkId));

    res.json({
      success: true,
      data: updatedComponent,
    });
  } catch (error) {
    req.log.error({ error }, 'Error updating benchmark component');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * DELETE /benchmarks/:id/components/:componentId
 * Eliminar componente de benchmark
 */
export async function handleDeleteComponent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    const { id: benchmarkId, componentId } = req.params;

    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Solo admin puede eliminar componentes
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden eliminar componentes' });
    }

    // Verificar que el benchmark existe y es custom
    const benchmark = await db()
      .select({ id: benchmarkDefinitions.id, isSystem: benchmarkDefinitions.isSystem })
      .from(benchmarkDefinitions)
      .where(eq(benchmarkDefinitions.id, benchmarkId))
      .limit(1);

    if (benchmark.length === 0) {
      return res.status(404).json({ error: 'Benchmark no encontrado' });
    }

    if (benchmark[0].isSystem) {
      return res
        .status(403)
        .json({ error: 'No se pueden eliminar componentes de benchmarks del sistema' });
    }

    // Eliminar componente
    await db()
      .delete(benchmarkComponents)
      .where(
        and(
          eq(benchmarkComponents.id, componentId),
          eq(benchmarkComponents.benchmarkId, benchmarkId)
        )
      );

    // Invalidate cache when component is deleted
    benchmarksCacheUtil.clear();
    benchmarkComponentsCacheUtil.delete(normalizeCacheKey('benchmark', 'components', benchmarkId));

    res.json({
      success: true,
      message: 'Componente eliminado correctamente',
    });
  } catch (error) {
    req.log.error({ error }, 'Error deleting benchmark component');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
