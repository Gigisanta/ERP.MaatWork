/**
 * Interaction Counter Component
 *
 * Displays +/- buttons to increment/decrement interaction count
 * Follows patterns from InlineStageSelect and InlineTextInput
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button, Text, Icon } from '@maatwork/ui';
import { updateContactInteraction } from '@/lib/api/contacts';
import { logger, toLogContextValue } from '@/lib/logger';
import type { Contact } from '@/types';

interface InteractionCounterProps {
  contact: Contact;
  onUpdate?: () => void;
  onError?: (error: Error) => void;
}

// AI_DECISION: Wrap InteractionCounter in React.memo to prevent unnecessary re-renders in large lists
// Justificación: In large contact lists, re-rendering every interaction counter on any state change is expensive.
// Impacto: Better scroll and interaction performance in the contacts table.
export default React.memo(function InteractionCounter({
  contact,
  onUpdate,
  onError,
}: InteractionCounterProps) {
  // Optimistic state for interaction count
  const [optimisticCount, setOptimisticCount] = useState(contact.interactionCount ?? 0);
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync optimistic count with prop when it changes (server source of truth)
  useEffect(() => {
    setOptimisticCount(contact.interactionCount ?? 0);
  }, [contact.interactionCount]);

  const handleInteraction = useCallback(
    async (action: 'increment' | 'decrement', event?: React.MouseEvent) => {
      // Prevent event propagation if event is provided
      if (event) {
        event.preventDefault(); // Always prevent default first
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation();
      }

      if (!contact.pipelineStageId) {
        logger.warn('InteractionCounter: Missing stageId');
        return;
      }

      if (isUpdating) {
        // AI_DECISION: Allow rapid clicks?
        // For now, simple optimistic UI with blocking to ensure consistency
        // But we update the UI immediately so it feels fast.
        // If we want to allow rapid fire, we need a queue or debouncing.
        // Given the requirement "fix unresponsiveness", showing the number change immediately is key.
        // We will NOT block execution, but we will track "isUpdating" for spinner/feedback if needed.
        // However, to prevent race conditions with the parent refresh, we might want to be careful.
        // Let's allow it but rely on atomic DB updates.
      }

      // 1. Optimistic Update
      const previousCount = optimisticCount;
      const newCount = action === 'increment' ? previousCount + 1 : Math.max(0, previousCount - 1);

      setOptimisticCount(newCount);
      setIsUpdating(true);

      logger.debug({
        action,
        newCount,
        contactId: contact.id,
      }, 'InteractionCounter: Optimistic update');

      try {
        // 2. API Call
        const response = await updateContactInteraction(
          contact.id,
          contact.pipelineStageId,
          action
        );

        if (!response.success) {
          throw new Error(response.error || 'Error al actualizar interacción');
        }

        logger.debug({
          data: toLogContextValue(response.data),
        }, 'InteractionCounter: Update successful');

        // 3. Sync with server response if needed, but onUpdate will trigger re-fetch
        // response.data.interactionCount should match newCount if no one else touched it
        if (response.data && typeof response.data.interactionCount === 'number') {
          setOptimisticCount(response.data.interactionCount);
        }

        // Call onUpdate to refresh the contact list (background revalidation)
        onUpdate?.();
      } catch (error) {
        logger.error({
          error: toLogContextValue(error),
          contactId: contact.id,
        }, 'InteractionCounter: Error updating interaction');

        // 4. Rollback on Error
        setOptimisticCount(previousCount);

        const errorMessage = error instanceof Error ? error : new Error('Error desconocido');
        onError?.(errorMessage);
      } finally {
        setIsUpdating(false);
      }
    },
    [contact.id, contact.pipelineStageId, optimisticCount, onUpdate, onError, isUpdating]
  );

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={(e) => void handleInteraction('decrement', e)}
        disabled={optimisticCount <= 0}
        className="h-6 w-6 p-0 flex items-center justify-center rounded-md hover:bg-surface-hover text-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
        aria-label="Decrementar interacción"
        type="button"
      >
        <span className="text-xs font-bold select-none">−</span>
      </button>

      <div className="min-w-[32px] flex justify-center relative">
        <Text
          size="sm"
          weight="medium"
          className={`select-none transition-opacity ${isUpdating ? 'opacity-70' : ''}`}
        >
          {optimisticCount}
        </Text>
        {isUpdating && (
          <div className="absolute -top-1 -right-1">
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
            </span>
          </div>
        )}
      </div>

      <button
        onClick={(e) => void handleInteraction('increment', e)}
        className="h-6 w-6 p-0 flex items-center justify-center rounded-md hover:bg-surface-hover text-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
        aria-label="Incrementar interacción"
        type="button"
      >
        <Icon name="plus" size={12} />
      </button>
    </div>
  );
});
