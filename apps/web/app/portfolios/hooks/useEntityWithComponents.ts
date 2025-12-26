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

  // Usar refs para las funciones del config para evitar re-renders infinitos
  // Las funciones del config se actualizan en cada render pero no queremos
  // que eso dispare re-fetches
  const configRef = useRef(config);
  configRef.current = config;

  // Flag para evitar múltiples fetches simultáneos
  const isFetchingRef = useRef(false);
  // Flag para saber si ya hicimos el fetch inicial
  const hasFetchedRef = useRef(false);

  const canManage = config.canManage ? config.canManage(user || null) : true;

  const fetchEntities = useCallback(async () => {
    // Evitar múltiples fetches simultáneos
    if (isFetchingRef.current) {
      return;
    }

    if (!user || loading || !canManage) {
      setEntities([]);
      return;
    }

    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const currentConfig = configRef.current;
      const entitiesResponse = await currentConfig.fetchEntities();

      if (!entitiesResponse.success) {
        logger.warn(`Error fetching ${currentConfig.entityName}`, {
          error: entitiesResponse.error,
        });
        setEntities([]);
        return;
      }

      if (entitiesResponse.data) {
        const entityIds = entitiesResponse.data.map((entity: TEntity) =>
          currentConfig.getEntityId(entity)
        );

        if (entityIds.length > 0) {
          try {
            const componentsBatchResponse = await currentConfig.fetchComponentsBatch(entityIds);

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
                `Error fetching ${currentConfig.entityName} components, using entities without components`,
                {
                  error: componentsBatchResponse.error,
                }
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
              `Error fetching ${currentConfig.entityName} components batch`,
              toLogContext({ err, entityIds })
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
      logger.error(`Error fetching ${currentConfig.entityName}`, toLogContext({ err }));
      if (err instanceof Error) {
        if (
          err.message.includes('fetch') ||
          err.message.includes('network') ||
          err.message.includes('Failed to fetch')
        ) {
          setError(`Error de conexión. Por favor verifica tu conexión a internet.`);
        } else if (err.message.includes('timeout')) {
          setError(`La solicitud tardó demasiado. Por favor intenta nuevamente.`);
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
  }, [user, loading, canManage]); // Solo dependencias estables, no config

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
      const response = await configRef.current.updateEntity(id, data);
      if (response.success) {
        await fetchEntities();
      }
      return response;
    },
    [fetchEntities]
  );

  const deleteEntity = useCallback(async (id: string) => {
    const response = await configRef.current.deleteEntity(id);
    if (response.success) {
      setEntities((prev) => prev.filter((entity) => configRef.current.getEntityId(entity) !== id));
    }
    return response;
  }, []);

  // Fetch inicial - solo una vez cuando el usuario está autenticado
  useEffect(() => {
    if (user && !loading && canManage && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchEntities();
    }
  }, [user, loading, canManage, fetchEntities]);

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
