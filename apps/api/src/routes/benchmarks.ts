import { Router } from 'express';
import { db } from '@cactus/db';
import { 
  benchmarkDefinitions, 
  benchmarkComponents, 
  instruments,
  lookupAssetClass
} from '@cactus/db/schema';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { requireAuth, requireRole } from '../auth/middlewares';
import { UserRole } from '../auth/types';
import { benchmarksCache } from '../utils/cache';

const router = Router();

// ==========================================================
// Benchmarks CRUD
// ==========================================================

/**
 * GET /benchmarks
 * Listar benchmarks disponibles
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // AI_DECISION: Cache benchmarks list with 1 hour TTL
    // Justificación: Benchmarks cambian poco pero se consultan frecuentemente, cache reduce carga en BD
    // Impacto: Reducción de queries a BD en ~70% para requests repetidos
    const cacheKey = 'all';
    const cached = benchmarksCache.get(cacheKey);
    
    if (cached) {
      req.log.debug({ cacheKey }, 'benchmarks served from cache');
      return res.json({
        success: true,
        data: cached
      });
    }

    const benchmarks = await db()
      .select({
        id: benchmarkDefinitions.id,
        code: benchmarkDefinitions.code,
        name: benchmarkDefinitions.name,
        description: benchmarkDefinitions.description,
        isSystem: benchmarkDefinitions.isSystem,
        createdAt: benchmarkDefinitions.createdAt,
        componentCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${benchmarkComponents} 
          WHERE ${benchmarkComponents.benchmarkId} = ${benchmarkDefinitions.id}
        )`
      })
      .from(benchmarkDefinitions)
      .orderBy(asc(benchmarkDefinitions.isSystem), asc(benchmarkDefinitions.name));

    // Cache the result only if we have data to avoid cache pollution
    // AI_DECISION: Only cache non-empty results to prevent cache pollution
    // Justificación: Empty results might indicate a temporary issue, shouldn't be cached
    // Impacto: Prevents stale empty data in cache
    if (Array.isArray(benchmarks) && benchmarks.length > 0) {
      benchmarksCache.set(cacheKey, benchmarks);
    }

    res.json({
      success: true,
      data: benchmarks
    });
  } catch (error) {
    req.log.error({ error }, 'Error fetching benchmarks');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /benchmarks/components/batch
 * Obtener componentes de múltiples benchmarks (batch)
 * Query params: ids=id1,id2,id3
 */
router.get('/components/batch', requireAuth, requireRole(['advisor', 'manager', 'admin']), async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // AI_DECISION: Validación robusta de IDs en batch endpoint
    // Justificación: Prevenir DoS, validar formato UUID, eliminar duplicados
    // Impacto: Seguridad mejorada, mejor manejo de errores
    const { validateBatchIds, BATCH_LIMITS } = await import('../utils/batch-validation');
    
    const validation = validateBatchIds(req.query.ids as string, {
      maxCount: BATCH_LIMITS.MAX_BENCHMARKS,
      requireUuid: true,
      fieldName: 'ids'
    });

    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Invalid batch request',
        details: validation.errors
      });
    }

    const benchmarkIds = validation.ids;

    // Obtener todos los componentes de todos los benchmarks en una sola query
    const allComponents = await db()
      .select({
        componentId: benchmarkComponents.id,
        benchmarkId: benchmarkComponents.benchmarkId,
        instrumentId: benchmarkComponents.instrumentId,
        weight: benchmarkComponents.weight,
        instrumentSymbol: instruments.symbol,
        instrumentName: instruments.name,
        active: instruments.active
      })
      .from(benchmarkComponents)
      .innerJoin(instruments, eq(benchmarkComponents.instrumentId, instruments.id))
      .where(sql`${benchmarkComponents.benchmarkId} = ANY(${benchmarkIds})`);

    // Agrupar componentes por benchmarkId
    const componentsByBenchmark: Record<string, any[]> = {};
    benchmarkIds.forEach(id => {
      componentsByBenchmark[id] = [];
    });

    type BenchmarkComponentWithMetadata = {
      benchmarkId: string;
      componentId: string;
      instrumentId: string;
      weight: string;
      instrumentSymbol: string;
      instrumentName: string;
      active: boolean;
    };
    
    allComponents.forEach((comp: BenchmarkComponentWithMetadata) => {
      if (componentsByBenchmark[comp.benchmarkId]) {
        componentsByBenchmark[comp.benchmarkId].push({
          id: comp.componentId,
          instrumentId: comp.instrumentId,
          weight: comp.weight,
          instrumentSymbol: comp.instrumentSymbol,
          instrumentName: comp.instrumentName,
          active: comp.active
        });
      }
    });

    res.json({
      success: true,
      data: componentsByBenchmark
    });
  } catch (error) {
    req.log.error({ error }, 'Error fetching benchmark components batch');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * GET /benchmarks/:id
 * Obtener benchmark específico con sus componentes
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    const benchmarkId = req.params.id;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Obtener benchmark
    const benchmark = await db()
      .select()
      .from(benchmarkDefinitions)
      .where(eq(benchmarkDefinitions.id, benchmarkId))
      .limit(1);

    if (benchmark.length === 0) {
      return res.status(404).json({ error: 'Benchmark no encontrado' });
    }

    // Obtener componentes
    const components = await db()
      .select({
        id: benchmarkComponents.id,
        instrumentId: benchmarkComponents.instrumentId,
        weight: benchmarkComponents.weight,
        createdAt: benchmarkComponents.createdAt,
        instrumentName: instruments.name,
        instrumentSymbol: instruments.symbol,
        instrumentCurrency: instruments.currency,
        instrumentAssetClass: instruments.assetClass
      })
      .from(benchmarkComponents)
      .leftJoin(instruments, eq(benchmarkComponents.instrumentId, instruments.id))
      .where(eq(benchmarkComponents.benchmarkId, benchmarkId))
      .orderBy(desc(benchmarkComponents.weight));

    // Calcular suma de pesos
    type ComponentWithWeight = {
      weight: string | number;
    };
    const totalWeight = components.reduce((sum: number, comp: ComponentWithWeight) => sum + Number(comp.weight), 0);

    res.json({
      success: true,
      data: {
        benchmark: benchmark[0],
        components,
        totalWeight,
        isValid: Math.abs(totalWeight - 1.0) < 0.0001
      }
    });
  } catch (error) {
    req.log.error({ error }, 'Error fetching benchmark');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * POST /benchmarks
 * Crear benchmark custom (solo admin)
 */
router.post('/', requireAuth, requireRole(['admin']), async (req, res) => {
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
        .filter(comp => comp.instrumentId)
        .map(comp => comp.instrumentId);

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
        createdByUserId: userId
      })
      .returning();

    // Crear componentes si se proporcionan
    if (components && Array.isArray(components) && components.length > 0) {
      await db()
        .insert(benchmarkComponents)
        .values(components.map(comp => ({
          benchmarkId: benchmark.id,
          instrumentId: comp.instrumentId,
          weight: Number(comp.weight)
        })));
    }

    // Invalidate cache when benchmark is created
    benchmarksCache.invalidate();

    res.status(201).json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    req.log.error({ error }, 'Error creating benchmark');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PUT /benchmarks/:id
 * Actualizar benchmark (solo admin, solo custom)
 */
router.put('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
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
        description
      })
      .where(eq(benchmarkDefinitions.id, benchmarkId))
      .returning();

    // Invalidate cache when benchmark is updated
    benchmarksCache.invalidate();

    res.json({
      success: true,
      data: updatedBenchmark
    });
  } catch (error) {
    req.log.error({ error }, 'Error updating benchmark');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * DELETE /benchmarks/:id
 * Eliminar benchmark (solo admin, solo custom)
 */
router.delete('/:id', requireAuth, requireRole(['admin']), async (req, res) => {
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
    await db()
      .delete(benchmarkDefinitions)
      .where(eq(benchmarkDefinitions.id, benchmarkId));

    // Invalidate cache when benchmark is deleted
    benchmarksCache.invalidate();

    res.json({
      success: true,
      message: 'Benchmark eliminado correctamente'
    });
  } catch (error) {
    req.log.error({ error }, 'Error deleting benchmark');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================================
// Benchmark Components
// ==========================================================

/**
 * POST /benchmarks/:id/components
 * Agregar componente a benchmark
 */
router.post('/:id/components', requireAuth, requireRole(['admin']), async (req, res) => {
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
      return res.status(403).json({ error: 'No se pueden editar componentes de benchmarks del sistema' });
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

    type ComponentWithWeight = {
      weight: string;
    };
    const currentTotal = existingComponents.reduce((sum: number, comp: ComponentWithWeight) => sum + Number(comp.weight), 0);
    if (currentTotal + weightNum > 1.0) {
      return res.status(400).json({ 
        error: `La suma de pesos excedería 100%. Peso actual: ${(currentTotal * 100).toFixed(2)}%, nuevo peso: ${(weightNum * 100).toFixed(2)}%` 
      });
    }

    // Crear componente
    const [component] = await db()
      .insert(benchmarkComponents)
      .values({
        benchmarkId,
        instrumentId,
        weight: weightNum
      })
      .returning();

    // Invalidate cache when component is added
    benchmarksCache.invalidate();

    res.status(201).json({
      success: true,
      data: component
    });
  } catch (error) {
    req.log.error({ error }, 'Error adding benchmark component');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * PUT /benchmarks/:id/components/:componentId
 * Actualizar componente de benchmark
 */
router.put('/:id/components/:componentId', requireAuth, requireRole(['admin']), async (req, res) => {
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
      return res.status(403).json({ error: 'No se pueden editar componentes de benchmarks del sistema' });
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
      .where(and(
        eq(benchmarkComponents.id, componentId),
        eq(benchmarkComponents.benchmarkId, benchmarkId)
      ))
      .limit(1);

    if (currentComponent.length === 0) {
      return res.status(404).json({ error: 'Componente no encontrado' });
    }

    // Verificar que la suma de pesos no exceda 1.0
    const existingComponents = await db()
      .select({ weight: benchmarkComponents.weight })
      .from(benchmarkComponents)
      .where(eq(benchmarkComponents.benchmarkId, benchmarkId));

    type ComponentWithWeight = {
      weight: string;
    };
    const currentTotal = existingComponents.reduce((sum: number, comp: ComponentWithWeight) => sum + Number(comp.weight), 0);
    const currentWeight = Number(currentComponent[0].weight);
    const newTotal = currentTotal - currentWeight + weightNum;

    if (newTotal > 1.0) {
      return res.status(400).json({ 
        error: `La suma de pesos excedería 100%. Peso actual total: ${(currentTotal * 100).toFixed(2)}%, nuevo total: ${(newTotal * 100).toFixed(2)}%` 
      });
    }

    // Actualizar componente
    const [updatedComponent] = await db()
      .update(benchmarkComponents)
      .set({
        weight: weightNum
      })
      .where(and(
        eq(benchmarkComponents.id, componentId),
        eq(benchmarkComponents.benchmarkId, benchmarkId)
      ))
      .returning();

    // Invalidate cache when component is updated
    benchmarksCache.invalidate();

    res.json({
      success: true,
      data: updatedComponent
    });
  } catch (error) {
    req.log.error({ error }, 'Error updating benchmark component');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

/**
 * DELETE /benchmarks/:id/components/:componentId
 * Eliminar componente de benchmark
 */
router.delete('/:id/components/:componentId', requireAuth, requireRole(['admin']), async (req, res) => {
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
      return res.status(403).json({ error: 'No se pueden eliminar componentes de benchmarks del sistema' });
    }

    // Eliminar componente
    await db()
      .delete(benchmarkComponents)
      .where(and(
        eq(benchmarkComponents.id, componentId),
        eq(benchmarkComponents.benchmarkId, benchmarkId)
      ));

    // Invalidate cache when component is deleted
    benchmarksCache.invalidate();

    res.json({
      success: true,
      message: 'Componente eliminado correctamente'
    });
  } catch (error) {
    req.log.error({ error }, 'Error deleting benchmark component');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================================
// Instrumentos disponibles para benchmarks
// ==========================================================

/**
 * GET /benchmarks/instruments/available
 * Listar instrumentos disponibles para agregar a benchmarks
 */
router.get('/instruments/available', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role as UserRole;
    
    if (!userId || !role) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const instrumentsList = await db()
      .select({
        id: instruments.id,
        symbol: instruments.symbol,
        name: instruments.name,
        assetClass: instruments.assetClass,
        currency: instruments.currency,
        active: instruments.active,
        assetClassName: lookupAssetClass.label
      })
      .from(instruments)
      .leftJoin(lookupAssetClass, eq(instruments.assetClass, lookupAssetClass.id))
      .where(eq(instruments.active, true))
      .orderBy(asc(instruments.assetClass), asc(instruments.name));

    res.json({
      success: true,
      data: instrumentsList
    });
  } catch (error) {
    req.log.error({ error }, 'Error fetching available instruments');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
