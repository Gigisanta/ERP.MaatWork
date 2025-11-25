'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRequireAuth } from '../../auth/useRequireAuth';
import { logger, toLogContext } from '../../../lib/logger';

export interface UseEntityWithComponentsConfig<TEntity, TComponent> {
  fetchEntities: () => Promise<{ success: boolean; data?: TEntity[]; error?: string }>;
  fetchComponentsBatch: (ids: string[]) => Promise<{ success: boolean; data?: Record<string, TComponent[]>; error?: string }>;
  createEntity: (data: any) => Promise<{ success: boolean; data?: TEntity; error?: string }>;
  updateEntity: (id: string, data: any) => Promise<{ success: boolean; data?: TEntity; error?: string }>;
  deleteEntity: (id: string) => Promise<{ success: boolean; error?: string }>;
  getEntityId: (entity: TEntity) => string;
  canManage?: (user: any) => boolean;
  entityName: string;
}

export function useEntityWithComponents<TEntity extends { id: string }, TComponent>(
  config: UseEntityWithComponentsConfig<TEntity, TComponent>
) {
  const { user, loading } = useRequireAuth();
  const [entities, setEntities] = useState<TEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = config.canManage ? config.canManage(user || null) : true;

  const fetchEntities = useCallback(async () => {
    if (!user || loading || !canManage) {
      setEntities([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const entitiesResponse = await config.fetchEntities();

      if (!entitiesResponse.success) {
        logger.warn(`Error fetching ${config.entityName}`, { error: entitiesResponse.error });
        setEntities([]);
        return;
      }

      if (entitiesResponse.data) {
        const entityIds = entitiesResponse.data.map((entity: TEntity) => config.getEntityId(entity));

        if (entityIds.length > 0) {
          try {
            const componentsBatchResponse = await config.fetchComponentsBatch(entityIds);

            if (componentsBatchResponse.success && componentsBatchResponse.data) {
              const componentsByEntity = componentsBatchResponse.data || {};

              const entitiesWithComponents = entitiesResponse.data.map((entity: TEntity) => {
                const entityId = config.getEntityId(entity);
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
              logger.warn(`Error fetching ${config.entityName} components, using entities without components`, {
                error: componentsBatchResponse.error,
              });
              setEntities(entitiesResponse.data.map((entity: TEntity) => ({ 
                ...entity, 
                components: [],
                lines: [] // For Portfolio compatibility
              })));
            }
          } catch (err) {
            logger.error(`Error fetching ${config.entityName} components batch`, toLogContext({ err, entityIds }));
            setEntities(entitiesResponse.data.map((entity: TEntity) => ({ 
              ...entity, 
              components: [],
              lines: [] // For Portfolio compatibility
            })));
          }
        } else {
          setEntities([]);
        }
      } else {
        setEntities([]);
      }
    } catch (err) {
      logger.error(`Error fetching ${config.entityName}`, toLogContext({ err }));
      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network') || err.message.includes('Failed to fetch')) {
          setError(`Error de conexión. Por favor verifica tu conexión a internet.`);
        } else if (err.message.includes('timeout')) {
          setError(`La solicitud tardó demasiado. Por favor intenta nuevamente.`);
        } else {
          setError(`Error al cargar ${config.entityName}: ${err.message}`);
        }
      } else {
        setError(`Error desconocido al cargar ${config.entityName}`);
      }
      setEntities([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, loading, canManage, config]);

  const createEntity = useCallback(
    async (data: Parameters<typeof config.createEntity>[0]) => {
      const response = await config.createEntity(data);
      if (response.success) {
        await fetchEntities();
      }
      return response;
    },
    [fetchEntities, config]
  );

  const updateEntity = useCallback(
    async (id: string, data: Parameters<typeof config.updateEntity>[1]) => {
      const response = await config.updateEntity(id, data);
      if (response.success) {
        await fetchEntities();
      }
      return response;
    },
    [fetchEntities, config]
  );

  const deleteEntity = useCallback(
    async (id: string) => {
      const response = await config.deleteEntity(id);
      if (response.success) {
        setEntities((prev) => prev.filter((entity) => config.getEntityId(entity) !== id));
      }
      return response;
    },
    [config]
  );

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  return {
    entities,
    isLoading,
    error,
    refetch: fetchEntities,
    createEntity,
    updateEntity,
    deleteEntity,
  };
}

