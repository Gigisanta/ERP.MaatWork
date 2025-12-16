import { db } from '@cactus/db';
import { sql } from 'drizzle-orm';
import type { Logger } from 'pino';

/**
 * Resultado de EXPLAIN ANALYZE
 */
export interface ExplainAnalyzeResult {
  queryPlan: string;
  executionTime: number;
  planningTime: number;
  totalCost: number;
  rows: number;
  width: number;
  plan: ExplainPlanNode;
}

/**
 * Nodo del plan de ejecución
 */
export interface ExplainPlanNode {
  nodeType: string;
  relationName?: string;
  alias?: string;
  startupCost: number;
  totalCost: number;
  planRows: number;
  planWidth: number;
  actualStartupTime?: number;
  actualTotalTime?: number;
  actualRows?: number;
  actualLoops?: number;
  output?: string[];
  filter?: string;
  joinType?: string;
  indexName?: string;
  indexCond?: string;
  hashCond?: string;
  children?: ExplainPlanNode[];
}

/**
 * Ejecuta EXPLAIN ANALYZE en una query SQL
 *
 * AI_DECISION: Utilidad para análisis de performance de queries
 * Justificación: Permite identificar planes de ejecución subóptimos y sugerir índices faltantes
 * Impacto: Facilita debugging y optimización proactiva de queries lentas
 *
 * @param logger - Logger para registrar resultados
 * @param query - Query SQL a analizar (puede incluir placeholders $1, $2, etc.)
 * @param params - Parámetros para la query (opcional)
 * @returns Resultado del EXPLAIN ANALYZE parseado
 */
export async function explainAnalyze(
  logger: Logger,
  query: string,
  params: unknown[] = []
): Promise<ExplainAnalyzeResult> {
  try {
    // Ejecutar EXPLAIN ANALYZE con formato JSON para parsing fácil
    // Usar sql.raw con el query completo ya que params ya están interpolados en query
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON) ${query}`;

    const result = await db().execute(sql.raw(explainQuery));

    // El resultado de EXPLAIN ANALYZE con FORMAT JSON es un array con un objeto
    const planData = result.rows[0] as { 'QUERY PLAN': unknown };
    const planJson = planData['QUERY PLAN'];

    if (!planJson || typeof planJson !== 'object' || !Array.isArray(planJson)) {
      throw new Error('Invalid EXPLAIN ANALYZE result format');
    }

    const planRoot = planJson[0] as {
      Plan: ExplainPlanNode;
      'Planning Time': number;
      'Execution Time': number;
    };

    // Extraer información del plan
    const plan = planRoot.Plan;
    const planningTime = planRoot['Planning Time'];
    const executionTime = planRoot['Execution Time'];

    // Calcular costo total y filas totales recursivamente
    const { totalCost, totalRows } = calculatePlanMetrics(plan);

    // Formatear plan como texto legible
    const queryPlan = formatPlanAsText(plan, 0);

    const resultData: ExplainAnalyzeResult = {
      queryPlan,
      executionTime,
      planningTime,
      totalCost,
      rows: totalRows,
      width: plan.planWidth,
      plan,
    };

    logger.info(
      {
        executionTime,
        planningTime,
        totalCost,
        rows: totalRows,
        query: query.substring(0, 200), // Limitar longitud para logging
      },
      'EXPLAIN ANALYZE completed'
    );

    return resultData;
  } catch (error) {
    logger.error({ error, query: query.substring(0, 200) }, 'EXPLAIN ANALYZE failed');
    throw error;
  }
}

/**
 * Calcula métricas agregadas del plan de ejecución
 */
function calculatePlanMetrics(node: ExplainPlanNode): { totalCost: number; totalRows: number } {
  let totalCost = node.totalCost;
  let totalRows = node.planRows;

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const childMetrics = calculatePlanMetrics(child);
      totalCost = Math.max(totalCost, childMetrics.totalCost);
      totalRows += childMetrics.totalRows;
    }
  }

  return { totalCost, totalRows };
}

/**
 * Formatea el plan de ejecución como texto legible
 */
function formatPlanAsText(node: ExplainPlanNode, indent: number = 0): string {
  const indentStr = '  '.repeat(indent);
  const prefix = indent > 0 ? '└─ ' : '';

  let text = `${indentStr}${prefix}${node.nodeType}`;

  if (node.relationName) {
    text += ` on ${node.relationName}`;
    if (node.alias && node.alias !== node.relationName) {
      text += ` (${node.alias})`;
    }
  }

  if (node.indexName) {
    text += ` using ${node.indexName}`;
  }

  if (node.joinType) {
    text += ` (${node.joinType})`;
  }

  text += `\n${indentStr}  Cost: ${node.startupCost.toFixed(2)}..${node.totalCost.toFixed(2)}`;
  text += ` Rows: ${node.planRows}`;

  if (node.actualTotalTime !== undefined) {
    text += ` Actual Time: ${node.actualStartupTime?.toFixed(2)}..${node.actualTotalTime.toFixed(2)}`;
    text += ` Actual Rows: ${node.actualRows || 0}`;
    if (node.actualLoops && node.actualLoops > 1) {
      text += ` Loops: ${node.actualLoops}`;
    }
  }

  if (node.filter) {
    text += `\n${indentStr}  Filter: ${node.filter}`;
  }

  if (node.indexCond) {
    text += `\n${indentStr}  Index Cond: ${node.indexCond}`;
  }

  if (node.hashCond) {
    text += `\n${indentStr}  Hash Cond: ${node.hashCond}`;
  }

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      text += '\n' + formatPlanAsText(child, indent + 1);
    }
  }

  return text;
}

/**
 * Sugiere índices basado en el plan de ejecución
 *
 * @param plan - Plan de ejecución analizado
 * @returns Array de sugerencias de índices
 */
export function suggestIndexes(plan: ExplainPlanNode): string[] {
  const suggestions: string[] = [];

  function analyzeNode(node: ExplainPlanNode): void {
    // Detectar Sequential Scan sin filtros eficientes
    if (node.nodeType === 'Seq Scan' && node.relationName) {
      if (node.filter && !node.indexName) {
        suggestions.push(
          `Consider adding index on ${node.relationName} for filter: ${node.filter}`
        );
      }
    }

    // Detectar Nested Loop con Sequential Scan en el lado interno
    if (node.nodeType === 'Nested Loop' && node.children) {
      const innerChild = node.children.find((c) => c.nodeType === 'Seq Scan');
      if (innerChild && innerChild.relationName) {
        suggestions.push(
          `Consider adding index on ${innerChild.relationName} to optimize nested loop join`
        );
      }
    }

    // Detectar Hash Join sin índices en tablas grandes
    if (node.nodeType === 'Hash Join' && node.children) {
      for (const child of node.children) {
        if (child.nodeType === 'Seq Scan' && child.planRows > 1000) {
          suggestions.push(
            `Consider adding index on ${child.relationName} for hash join optimization`
          );
        }
      }
    }

    // Analizar hijos recursivamente
    if (node.children) {
      for (const child of node.children) {
        analyzeNode(child);
      }
    }
  }

  analyzeNode(plan);

  // Eliminar duplicados
  return Array.from(new Set(suggestions));
}

/**
 * Analiza una query problemática y retorna recomendaciones
 *
 * @param logger - Logger para registro
 * @param query - Query SQL a analizar
 * @param params - Parámetros opcionales
 * @returns Análisis completo con recomendaciones
 */
export async function analyzeQuery(
  logger: Logger,
  query: string,
  params: unknown[] = []
): Promise<{
  explain: ExplainAnalyzeResult;
  suggestions: string[];
  isSlow: boolean;
  hasSeqScan: boolean;
}> {
  const explain = await explainAnalyze(logger, query, params);
  const suggestions = suggestIndexes(explain.plan);

  // Detectar si es lenta (más de 100ms)
  const isSlow = explain.executionTime > 100;

  // Detectar Sequential Scans
  const hasSeqScan = hasSequentialScan(explain.plan);

  return {
    explain,
    suggestions,
    isSlow,
    hasSeqScan,
  };
}

/**
 * Verifica si el plan contiene Sequential Scans
 */
function hasSequentialScan(node: ExplainPlanNode): boolean {
  if (node.nodeType === 'Seq Scan') {
    return true;
  }

  if (node.children) {
    for (const child of node.children) {
      if (hasSequentialScan(child)) {
        return true;
      }
    }
  }

  return false;
}
