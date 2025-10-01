import React, { useState } from 'react';
import { X, Tag as TagIcon, Check, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Tag } from '../types/crm';
import { cn } from '../utils/cn';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactTags: Tag[];
  onTagsChange: (tags: Tag[]) => Promise<{ success: boolean; error?: string; message?: string }> | void;
  availableTags?: Tag[];
  contactName?: string; // Nombre del contacto para mostrar en el título
}

const TagManagerModal: React.FC<TagManagerModalProps> = ({
  isOpen,
  onClose,
  contactTags,
  onTagsChange,
  availableTags = [],
  contactName
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [processingTagId, setProcessingTagId] = useState<string | null>(null);
  
  // Combinar etiquetas disponibles con las del contacto
  const allTags = [...availableTags];
  contactTags.forEach(tag => {
    if (!allTags.find(t => t.id === tag.id)) {
      allTags.push(tag);
    }
  });
  
  // Filtrar etiquetas por búsqueda
  const filteredTags = allTags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleToggleTag = async (tag: Tag) => {
    if (isLoading || processingTagId) return;
    
    const isSelected = contactTags.some(t => t.id === tag.id);
    setProcessingTagId(tag.id);
    setIsLoading(true);
    setFeedback({ type: null, message: '' });
    
    try {
      const updatedTags = isSelected 
        ? contactTags.filter(t => t.id !== tag.id)
        : [...contactTags, tag];
      
      const result = await onTagsChange(updatedTags);
      
      if (result && typeof result === 'object' && 'success' in result) {
        if (result.success) {
          setFeedback({
            type: 'success',
            message: result.message || `Etiqueta ${isSelected ? 'removida' : 'agregada'} correctamente`
          });
          
          // Limpiar feedback después de 2 segundos
          setTimeout(() => {
            setFeedback({ type: null, message: '' });
          }, 2000);
        } else {
          setFeedback({
            type: 'error',
            message: result.error || 'Error al actualizar etiqueta'
          });
        }
      } else {
        // Manejo para onTagsChange que no retorna resultado
        setFeedback({
          type: 'success',
          message: `Etiqueta ${isSelected ? 'removida' : 'agregada'} correctamente`
        });
        
        setTimeout(() => {
          setFeedback({ type: null, message: '' });
        }, 2000);
      }
    } catch (error) {
      console.error('Error toggling tag:', error);
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error inesperado'
      });
    } finally {
      setIsLoading(false);
      setProcessingTagId(null);
    }
  };
  
  const handleClose = () => {
    if (isLoading) return; // Prevenir cierre durante operaciones
    setSearchTerm('');
    setFeedback({ type: null, message: '' });
    setProcessingTagId(null);
    onClose();
  };
  

  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl w-full max-w-sm max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cactus-100 dark:bg-cactus-900/30 rounded-lg">
              <TagIcon className="w-5 h-5 text-cactus-600 dark:text-cactus-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                Asignar Etiquetas
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {contactName ? `Selecciona etiquetas para ${contactName}` : 'Selecciona las etiquetas'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className={cn(
              "p-2 rounded-lg transition-colors",
              isLoading 
                ? "cursor-not-allowed opacity-50" 
                : "hover:bg-neutral-100 dark:hover:bg-neutral-700"
            )}
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Feedback */}
          {feedback.type && (
            <div className={cn(
              "p-3 rounded-lg border flex items-center gap-2 text-sm",
              feedback.type === 'success' 
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
            )}>
              {feedback.type === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
          {/* Información */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 Haz clic en las etiquetas para asignarlas o quitarlas
            </p>
          </div>
          
          {/* Buscar etiquetas */}
          <div className="space-y-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar etiquetas..."
              className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 focus:ring-2 focus:ring-cactus-500 focus:border-transparent transition-all"
            />
          </div>
          
          {/* Lista de etiquetas */}
          <div className="space-y-2">
            {filteredTags.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-neutral-400 dark:text-neutral-500 text-sm">
                  {searchTerm ? 'No se encontraron etiquetas' : 'No hay etiquetas disponibles'}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {filteredTags.map((tag) => {
                  const isSelected = contactTags.some(t => t.id === tag.id);
                  
                  return (
                    <div
                      key={tag.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all",
                        isSelected
                          ? "bg-cactus-50 dark:bg-cactus-900/20 border-cactus-200 dark:border-cactus-800 ring-1 ring-cactus-500/20"
                          : "bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600",
                        isLoading || processingTagId === tag.id
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer"
                      )}
                      onClick={() => handleToggleTag(tag)}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className={cn(
                        "text-sm font-medium flex-1",
                        isSelected
                          ? "text-cactus-700 dark:text-cactus-300"
                          : "text-neutral-700 dark:text-neutral-300"
                      )}>
                        {tag.name}
                      </span>
                      {processingTagId === tag.id ? (
                        <Loader2 className="w-4 h-4 text-cactus-600 dark:text-cactus-400 animate-spin" />
                      ) : isSelected ? (
                        <Check className="w-4 h-4 text-cactus-600 dark:text-cactus-400" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-neutral-200 dark:border-neutral-700 p-4">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className={cn(
                "px-4 py-2 text-sm border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg transition-colors",
                isLoading 
                  ? "cursor-not-allowed opacity-50" 
                  : "hover:bg-neutral-50 dark:hover:bg-neutral-700"
              )}
            >
              Cancelar
            </button>
            
            <button
              onClick={handleClose}
              disabled={isLoading}
              className={cn(
                "px-4 py-2 text-sm bg-cactus-500 text-white rounded-lg transition-colors flex items-center gap-2",
                isLoading 
                  ? "cursor-not-allowed opacity-50" 
                  : "hover:bg-cactus-600"
              )}
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {isLoading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TagManagerModal;