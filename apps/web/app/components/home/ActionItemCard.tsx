/**
 * ActionItemCard Component
 *
 * AI_DECISION: Componente reutilizable para items del widget "Qué hacer hoy"
 * Justificación: Renderizado consistente para diferentes tipos de acciones, fácil de mantener
 * Impacto: Código más limpio, estilos unificados por tipo de acción
 *
 * Renderiza un item accionable con badge, ícono y metadata según su tipo
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Text, Badge, Icon, type IconName } from '@maatwork/ui';
import type { TodayActionItem } from '@/types/dashboard';
import { ACTION_TYPE_CONFIG } from '@/types/dashboard';

interface ActionItemCardProps {
  item: TodayActionItem;
}

export function ActionItemCard({ item }: ActionItemCardProps) {
  const config = ACTION_TYPE_CONFIG[item.type];

  // Construir subtítulo con metadata adicional
  const getSubtitleWithMetadata = () => {
    const parts: string[] = [item.subtitle];

    if (item.daysOverdue && item.daysOverdue > 0) {
      parts.push(`${item.daysOverdue} ${item.daysOverdue === 1 ? 'día' : 'días'} de retraso`);
    }

    if (item.daysStale && item.daysStale > 0) {
      parts.push(`${item.daysStale} ${item.daysStale === 1 ? 'día' : 'días'} sin avanzar`);
    }

    return parts.filter(Boolean).join(' • ');
  };

  return (
    <Link
      href={item.href}
      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-hover hover:border-primary/30 transition-all group"
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        {/* Ícono */}
        <div className={`shrink-0 ${config.color} group-hover:scale-110 transition-transform`}>
          <Icon name={config.icon as IconName} size={20} />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Text weight="medium" size="sm" className="truncate">
              {item.title}
            </Text>
            <Badge variant={config.badgeVariant} size="sm">
              {config.badgeLabel}
            </Badge>
          </div>
          <Text size="xs" color="secondary" className="line-clamp-1">
            {getSubtitleWithMetadata()}
          </Text>
        </div>
      </div>

      {/* Chevron */}
      <Icon
        name="ChevronRight"
        size={16}
        className="text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 ml-2"
      />
    </Link>
  );
}
