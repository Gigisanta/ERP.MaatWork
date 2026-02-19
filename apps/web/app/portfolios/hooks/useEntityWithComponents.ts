'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRequireAuth } from '@/auth/useRequireAuth';
import { logger, toLogContext } from '@/lib/logger';
import type { AuthUser } from '@/auth/AuthContext';

interface UseEntityWithComponentsConfig<
  TEntity extends { id: string },
  TComponent,
  TCreateData = Partial<Omit<TEntity, 'id' | 'createdAt' | 'updatedAt'>>,
  TUpdateData = Partial<Omit<TEntity, 'id' | 'createdAt' | 'updatedAt'>>,
> {
  fetchEntities: () => Promise<{ success: boolean; data?: TEntity[]; error?: string }>;
  fetchComponentsBatch: (
    ids: string[]
  ) => Promise<{ success: boolean; data?: Record<string, TComponent[]>; error?: string }>;
  createEntity: (
    data: TCreateData
  ) => Promise<{ success: boolean; data?: TEntity; error?: string }>;
  updateEntity: (
    id: string,
    data: TUpdateData
  ) => Promise<{ success: boolean; data?: TEntity; error?: string }>;
  deleteEntity: (id: string) => Promise<{ success: boolean; error?: string }>;
  getEntityId: (entity: TEntity) => string;
  canManage?: (user: AuthUser | null) => boolean;
  entityName: string;
  refreshKey?: string | number | (string | number)[];
}

/**
 * Hook genérico para entidades con componentes anidados
 *
 * AI_DECISION: Usar refs para config functions para evitar loops infinitos
 * Justificación: Las funciones del config se crean nuevas en cada render del componente padre,
 *                lo que causaba que useCallback se re-creara constantemente, disparando
 *                el useEffect en un loop infinito (~100+ requests en segundos)
 * Impacto: Elimina el problema de performance/loop infinito en /portfolios
 */

// Helper for retries with exponential backoff
const retryOperation = async <T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  try {
    return await operation();
  } catch (err) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryOperation(operation, retries - 1, delay * 1.5);
    }
    throw err;
  }
};

export function useEntityWithComponents<
  TEntity extends { id: string },
  TComponent,
  TCreateData = Partial<Omit<TEntity, 'id' | 'createdAt' | 'updatedAt'>>,
  TUpdateData = Partial<Omit<TEntity, 'id' | 'createdAt' | 'updatedAt'>>,
>(config: UseEntityWithComponentsConfig<TEntity, TComponent, TCreateData, TUpdateData>) {
  const { user, loading } = useRequireAuth();
  const [entities, setEntities] = useState<TEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use explicit key for refetching instead of deep object comparison of config
  const refreshKey = Array.isArray(config.refreshKey) 
    ? config.refreshKey.join('-') 
    : String(config.refreshKey || '');

  // Usar refs para las funciones del config para evitar re-renders infinitos
  const configRef = useRef(config);
  configRef.current = config;

  const isFetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);
  const lastKeyRef = useRef(refreshKey);

  const canManage = config.canManage ? config.canManage(user || null) : true;

  const fetchEntities = useCallback(async (force = false) => {
    if (isFetchingRef.current) return;
    
    if (!user || loading || !canManage) {
      setEntities([]);
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const currentConfig = configRef.current;
      // Wrap fetch in retry
      const entitiesResponse = await retryOperation(() => currentConfig.fetchEntities());

      if (!entitiesResponse.success) {
        logger.warn(
          toLogContext({ error: entitiesResponse.error }),
          `Error fetching ${currentConfig.entityName}`
        );
        setEntities([]);
      } else if (entitiesResponse.data) {
        const entityIds = entitiesResponse.data.map((entity: TEntity) =>
          currentConfig.getEntityId(entity)
        );

        if (entityIds.length > 0) {
          try {
            // Wrap batch fetch in retry
            const componentsBatchResponse = await retryOperation(() => 
              currentConfig.fetchComponentsBatch(entityIds)
            );

            if (componentsBatchResponse.success && componentsBatchResponse.data) {
              const componentsByEntity = componentsBatchResponse.data || {};

              const entitiesWithComponents = entitiesResponse.data.map((entity: TEntity) => {
                const entityId = currentConfig.getEntityId(entity);
                const components = componentsByEntity[entityId] || [];
                // Support both 'components' and 'lines' property names
                return {
                  ...entity,
                  components,
                  lines: components, // For Portfolio compatibility
                } as TEntity & { components?: TComponent[]; lines?: TComponent[] };
              });

              setEntities(entitiesWithComponents);
            } else {
              logger.warn(
                toLogContext({
                  error: componentsBatchResponse.error,
                }),
                `Error fetching ${currentConfig.entityName} components, using entities without components`
              );
              setEntities(
                entitiesResponse.data.map((entity: TEntity) => ({
                  ...entity,
                  components: [],
                  lines: [], // For Portfolio compatibility
                }))
              );
            }
          } catch (err) {
            logger.error(
              toLogContext({ err, entityIds }),
              `Error fetching ${currentConfig.entityName} components batch after retries`
            );
            setEntities(
              entitiesResponse.data.map((entity: TEntity) => ({
                ...entity,
                components: [],
                lines: [], // For Portfolio compatibility
              }))
            );
          }
        } else {
          setEntities([]);
        }
      } else {
        setEntities([]);
      }
    } catch (err) {
      const currentConfig = configRef.current;
      logger.error(toLogContext({ err }), `Error fetching ${currentConfig.entityName}`);
      
      if (err instanceof Error) {
        if (
          err.message.includes('fetch') ||
          err.message.includes('network') ||
          err.message.includes('Failed to fetch')
        ) {
          setError(`Error de conexión. Se reintentó varias veces.`);
        } else if (err.message.includes('timeout')) {
          setError(`La solicitud tardó demasiado.`);
        } else {
          setError(`Error al cargar ${currentConfig.entityName}: ${err.message}`);
        }
      } else {
        setError(`Error desconocido al cargar ${configRef.current.entityName}`);
      }
      setEntities([]);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, loading, canManage]);

  const createEntity = useCallback(
    async (data: TCreateData) => {
      const response = await configRef.current.createEntity(data);
      if (response.success) {
        await fetchEntities();
      }
      return response;
    },
    [fetchEntities]
  );

  const updateEntity = useCallback(
    async (id: string, data: TUpdateData) => {
      // Optimistic update
      const previousEntities = [...entities];
      setEntities((prev) =>
        prev.map((entity) => {
          if (configRef.current.getEntityId(entity) === id) {
            return { ...entity, ...data } as TEntity;
          }
          return entity;
        })
      );

      try {
        const response = await retryOperation(() => configRef.current.updateEntity(id, data));
        if (response.success && response.data) {
           // Update with server response
           const updated = response.data;
           setEntities((prev) => 
             prev.map(e => configRef.current.getEntityId(e) === id ? updated : e)
           );
        } else {
           // Rollback
           setEntities(previousEntities);
           if (response.error) setError(response.error);
        }
        return response;
      } catch (err) {
        setEntities(previousEntities);
        throw err;
      }
    },
    [entities] 
  );

  const deleteEntity = useCallback(async (id: string) => {
    // Optimistic update
    const previousEntities = [...entities];
    setEntities((prev) => prev.filter((entity) => configRef.current.getEntityId(entity) !== id));

    try {
      const response = await retryOperation(() => configRef.current.deleteEntity(id));
      if (!response.success) {
         // Rollback
         setEntities(previousEntities);
         if (response.error) setError(response.error);
      }
      return response;
    } catch (err) {
      setEntities(previousEntities);
      throw err;
    }
  }, [entities]);

  // Re-fetch when refreshKey changes or for initial fetch
  useEffect(() => {
    if (!user || loading || !canManage) return;

    if (!hasFetchedRef.current || refreshKey !== lastKeyRef.current) {
        hasFetchedRef.current = true;
        lastKeyRef.current = refreshKey;
        fetchEntities(true);
    }
  }, [user, loading, canManage, fetchEntities, refreshKey]);

  return {
    entities,
    isLoading,
    error,
    refetch: () => fetchEntities(true),
    createEntity,
    updateEntity,
    deleteEntity,
  };
}
