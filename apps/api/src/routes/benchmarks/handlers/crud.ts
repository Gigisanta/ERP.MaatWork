/**
 * Handlers CRUD para benchmarks
 *
 * AI_DECISION: Extraer handlers CRUD a módulo separado
 * Justificación: Separar responsabilidades mejora mantenibilidad
 * Impacto: Código más organizado
 */

import type { Request, Response } from 'express';
import { db } from '@cactus/db';
import { benchmarkDefinitions, benchmarkComponents, instruments } from '@cactus/db/schema';
import { eq, sql } from 'drizzle-orm';
import { UserRole } from '../../../auth/types';
import { benchmarksCacheUtil } from '../../../utils/cache';

/**
 * POST /benchmarks
 * Crear benchmark custom (solo admin)
 */
export async function handleCreateBenchmark(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;

    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Solo admin puede crear benchmarks custom
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden crear benchmarks' });
    }

    const { code, name, description, components } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Código y nombre son requeridos' });
    }

    // Verificar que el código sea único
    const existingBenchmark = await db()
      .select({ id: benchmarkDefinitions.id })
      .from(benchmarkDefinitions)
      .where(eq(benchmarkDefinitions.code, code))
      .limit(1);

    if (existingBenchmark.length > 0) {
      return res.status(400).json({ error: 'El código del benchmark ya existe' });
    }

    // Validar componentes si se proporcionan
    if (components && Array.isArray(components)) {
      const totalWeight = components.reduce((sum, comp) => sum + Number(comp.weight || 0), 0);
      if (Math.abs(totalWeight - 1.0) > 0.0001) {
        return res.status(400).json({ error: 'La suma de pesos debe ser 100%' });
      }

      // Verificar que los instrumentos existen
      const instrumentIds = components
        .filter((comp) => comp.instrumentId)
        .map((comp) => comp.instrumentId);

      if (instrumentIds.length > 0) {
        const existingInstruments = await db()
          .select({ id: instruments.id })
          .from(instruments)
          .where(sql`${instruments.id} = ANY(${instrumentIds})`);

        if (existingInstruments.length !== instrumentIds.length) {
          return res.status(400).json({ error: 'Algunos instrumentos no existen' });
        }
      }
    }

    // Crear benchmark
    const [benchmark] = await db()
      .insert(benchmarkDefinitions)
      .values({
        code,
        name,
        description,
        isSystem: false,
        createdByUserId: userId,
      })
      .returning();

    // Crear componentes si se proporcionan
    if (components && Array.isArray(components) && components.length > 0) {
      await db()
        .insert(benchmarkComponents)
        .values(
          components.map((comp) => ({
            benchmarkId: benchmark.id,
            instrumentId: comp.instrumentId,
            weight: Number(comp.weight),
          }))
        );
    }

    // Invalidate cache when benchmark is created
    benchmarksCacheUtil.clear();

    res.status(201).json({
      success: true,
      data: benchmark,
    });
  } catch (error) {
    req.log.error({ error }, 'Error creating benchmark');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PUT /benchmarks/:id
 * Actualizar benchmark (solo admin, solo custom)
 */
export async function handleUpdateBenchmark(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    const benchmarkId = req.params.id;

    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Solo admin puede editar benchmarks
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden editar benchmarks' });
    }

    const { name, description } = req.body;

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
      return res.status(403).json({ error: 'No se pueden editar benchmarks del sistema' });
    }

    // Actualizar benchmark
    const [updatedBenchmark] = await db()
      .update(benchmarkDefinitions)
      .set({
        name,
        description,
      })
      .where(eq(benchmarkDefinitions.id, benchmarkId))
      .returning();

    // Invalidate cache when benchmark is updated
    benchmarksCacheUtil.clear();

    res.json({
      success: true,
      data: updatedBenchmark,
    });
  } catch (error) {
    req.log.error({ error }, 'Error updating benchmark');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * DELETE /benchmarks/:id
 * Eliminar benchmark (solo admin, solo custom)
 */
export async function handleDeleteBenchmark(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    const benchmarkId = req.params.id;

    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Solo admin puede eliminar benchmarks
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Solo administradores pueden eliminar benchmarks' });
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
      return res.status(403).json({ error: 'No se pueden eliminar benchmarks del sistema' });
    }

    // Eliminar benchmark (los componentes se eliminan por CASCADE)
    await db().delete(benchmarkDefinitions).where(eq(benchmarkDefinitions.id, benchmarkId));

    // Invalidate cache when benchmark is deleted
    benchmarksCacheUtil.clear();

    res.json({
      success: true,
      message: 'Benchmark eliminado correctamente',
    });
  } catch (error) {
    req.log.error({ error }, 'Error deleting benchmark');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}
