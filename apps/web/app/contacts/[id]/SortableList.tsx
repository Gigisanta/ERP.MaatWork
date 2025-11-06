"use client";
import React, { useState } from 'react';
import { Text, Button, Icon } from '@cactus/ui';
import { logger } from '@/lib/logger';

interface SortableListProps {
  items: string[];
  onItemsChange: (items: string[]) => void;
  onAdd: () => void;
  onEdit: (index: number, value: string) => void;
  onDelete: (index: number) => void;
  placeholder?: string;
  emptyMessage?: string;
  label?: string;
}

/**
 * SortableList - Componente para listas ordenables con drag and drop
 * 
 * Permite agregar, editar, eliminar y reordenar items mediante drag and drop
 */
export default function SortableList({
  items,
  onItemsChange,
  onAdd,
  onEdit,
  onDelete,
  placeholder = "Agregar item...",
  emptyMessage = "No hay items",
  label
}: SortableListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedIndex(null);
    setDraggedOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOverIndex(index);
  };

  const handleDragLeave = () => {
    setDraggedOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDraggedOverIndex(null);
      return;
    }

    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(dropIndex, 0, removed);
    
    onItemsChange(newItems);
    setDraggedIndex(null);
    setDraggedOverIndex(null);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(items[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editingValue.trim()) {
      onEdit(editingIndex, editingValue.trim());
    }
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  return (
    <div className="space-y-3">
      {label && (
        <Text size="sm" weight="medium" color="secondary">{label}</Text>
      )}
      
      {items.length === 0 ? (
        <div className="text-center py-4 text-gray-400 text-sm">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`
                flex items-center gap-2 p-2 rounded border bg-white
                cursor-move hover:bg-gray-50 transition-colors
                ${draggedOverIndex === index ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}
                ${draggedIndex === index ? 'opacity-50' : ''}
              `}
            >
              {/* Drag handle */}
              <div className="flex items-center text-gray-400 cursor-grab active:cursor-grabbing">
                <Icon name="more-vertical" size={16} />
              </div>

              {/* Item content */}
              {editingIndex === index ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    onBlur={handleSaveEdit}
                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveEdit}
                  >
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1">
                    <Text size="sm">{item}</Text>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartEdit(index)}
                    >
                      <Icon name="edit" size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(index)}
                    >
                      <Icon name="trash-2" size={14} />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={onAdd}
        className="w-full"
      >
        <Icon name="plus" size={14} className="mr-2" />
        Agregar
      </Button>
    </div>
  );
}

