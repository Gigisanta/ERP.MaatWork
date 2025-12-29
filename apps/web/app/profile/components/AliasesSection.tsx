'use client';

import React, { useMemo } from 'react';
import { Text, Stack, Input, Button, DataTable, Tooltip, Icon, type Column } from '@maatwork/ui';

interface AliasData {
  id: string;
  aliasRaw: string;
  aliasNormalized: string;
  userId: string;
}

interface AliasesSectionProps {
  aliases: AliasData[];
  newAlias: string;
  aliasLoading: boolean;
  onNewAliasChange: (value: string) => void;
  onAddAlias: () => void;
  deleteAliasRef: React.RefObject<((id: string) => Promise<void>) | null>;
  aliasLoadingRef: React.RefObject<boolean>;
}

/**
 * Sección de aliases AUM del perfil
 */
export function AliasesSection({
  aliases,
  newAlias,
  aliasLoading,
  onNewAliasChange,
  onAddAlias,
  deleteAliasRef,
  aliasLoadingRef,
}: AliasesSectionProps) {
  // Columnas para la tabla de aliases - completamente estables
  const aliasColumns: Column<AliasData & Record<string, unknown>>[] = useMemo(
    () => [
      {
        key: 'aliasRaw',
        header: 'Alias',
        sortable: true,
      },
      {
        key: 'aliasNormalized',
        header: 'Normalizado',
        sortable: true,
      },
      {
        key: 'actions',
        header: '',
        width: '80px',
        align: 'right',
        render: (alias) => {
          const handleDelete = () => {
            if (deleteAliasRef.current) {
              deleteAliasRef.current(alias.id);
            }
          };
          return (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={aliasLoadingRef.current}
                onClick={handleDelete}
                className="px-1.5 py-1 min-w-0 text-error hover:bg-error/10 hover:border-error"
                title="Eliminar alias"
              >
                <Icon name="x" size={14} />
              </Button>
            </div>
          );
        },
      },
    ],
    [deleteAliasRef, aliasLoadingRef]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1.5 mb-2">
        <Text weight="semibold" size="sm" className="text-text">
          Mi alias de AUM (asesor)
        </Text>
        <Tooltip
          content={
            <div className="max-w-xs">
              <Text size="xs">
                Este alias se usará para matchear el campo &quot;Asesor&quot; en los CSV de AUM.
                Coincidencia exacta tras trim + lowercase.
              </Text>
            </div>
          }
        >
          <button
            type="button"
            className="text-text-muted hover:text-text transition-colors flex-shrink-0"
          >
            <Icon name="info" size={14} />
          </button>
        </Tooltip>
      </div>
      <Stack direction="column" gap="sm" className="flex-1">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Ej: Juan Pérez"
            value={newAlias}
            onChange={(e) => onNewAliasChange(e.target.value)}
            className="flex-1"
            size="sm"
          />
          <Button size="sm" onClick={onAddAlias} disabled={aliasLoading || !newAlias.trim()}>
            Agregar
          </Button>
        </div>
        <div className="flex-1 min-h-[100px]">
          <div className="[&_table]:text-xs [&_th]:px-2 [&_th]:py-1.5 [&_td]:px-2 [&_td]:py-1.5">
            <DataTable<AliasData & Record<string, unknown>>
              data={aliases as (AliasData & Record<string, unknown>)[]}
              columns={aliasColumns}
              keyField="id"
              emptyMessage="Sin alias"
            />
          </div>
        </div>
      </Stack>
    </div>
  );
}
