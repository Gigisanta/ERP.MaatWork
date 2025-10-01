import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Plus, Edit2, Trash2, Save, User } from 'lucide-react';
import { useAnnotationsStore, TaskAnnotation } from '../store/annotationsStore';
import { useAuthStore } from "../store/authStore";
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
// import { LayoutConfig } from '../styles/cactus-colors'; // Migrated to Cactus Dashboard palette

interface TaskAnnotationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  taskTitle: string;
}

export const TaskAnnotationsModal: React.FC<TaskAnnotationsModalProps> = ({
  isOpen,
  onClose,
  taskId,
  taskTitle
}) => {
  const { user } = useAuthStore();
  const {
    annotations,
    loading,
    error,
    fetchAnnotations,
    createAnnotation,
    updateAnnotation,
    deleteAnnotation,
    clearAnnotations,
    subscribeToAnnotations,
    unsubscribeFromAnnotations
  } = useAnnotationsStore();

  const [newAnnotation, setNewAnnotation] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      fetchAnnotations(taskId);
      subscribeToAnnotations(taskId);
    }
    
    return () => {
      if (!isOpen) {
        clearAnnotations();
        unsubscribeFromAnnotations();
      }
    };
  }, [isOpen, taskId, fetchAnnotations, clearAnnotations, subscribeToAnnotations, unsubscribeFromAnnotations]);

  const handleCreateAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnotation.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await createAnnotation(taskId, newAnnotation);
    if (result) {
      setNewAnnotation('');
    }
    setIsSubmitting(false);
  };

  const handleUpdateAnnotation = async (id: string) => {
    if (!editContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    await updateAnnotation(id, editContent);
    setEditingId(null);
    setEditContent('');
    setIsSubmitting(false);
  };

  const handleDeleteAnnotation = async (id: string) => {
    if (isSubmitting) return;
    
    if (window.confirm('¿Estás seguro de que quieres eliminar esta anotación?')) {
      setIsSubmitting(true);
      await deleteAnnotation(id);
      setIsSubmitting(false);
    }
  };

  const startEditing = (annotation: TaskAnnotation) => {
    setEditingId(annotation.id);
    setEditContent(annotation.content);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditContent('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-cactus-600 dark:text-cactus-400" />
            <div>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Anotaciones</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate max-w-md">{taskTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Annotations List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading && annotations.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cactus-500"></div>
              </div>
            ) : annotations.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
                <p className="text-neutral-400 dark:text-neutral-500">No hay anotaciones para esta tarea</p>
                <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">Sé el primero en agregar una anotación</p>
              </div>
            ) : (
              annotations.map((annotation) => (
                <div key={annotation.id} className="bg-neutral-50 dark:bg-neutral-700/50 rounded-lg p-4 border border-neutral-200 dark:border-neutral-600">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {annotation.user?.full_name || 'Usuario'}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {formatDistanceToNow(new Date(annotation.created_at), {
                          addSuffix: true,
                          locale: es
                        })}
                      </span>
                      {annotation.created_at !== annotation.updated_at && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">(editado)</span>
                      )}
                    </div>
                    {user?.id === annotation.user_id && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => startEditing(annotation)}
                          className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                          disabled={isSubmitting}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnnotation(annotation.id)}
                          className="text-neutral-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {editingId === annotation.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2 border border-neutral-200 dark:border-neutral-600 rounded-md resize-none focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                        rows={3}
                        placeholder="Editar anotación..."
                      />
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleUpdateAnnotation(annotation.id)}
                          disabled={!editContent.trim() || isSubmitting}
                          className="flex items-center space-x-1 px-3 py-1 bg-cactus-600 text-white rounded-md hover:bg-cactus-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          <Save className="h-3 w-3" />
                          <span>Guardar</span>
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={isSubmitting}
                          className="px-3 py-1 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-600 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{annotation.content}</p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* New Annotation Form */}
          <div className="border-t border-neutral-200 dark:border-neutral-700 p-6">
            <form onSubmit={handleCreateAnnotation} className="space-y-3">
              <textarea
                value={newAnnotation}
                onChange={(e) => setNewAnnotation(e.target.value)}
                placeholder="Agregar una nueva anotación..."
                className="w-full p-3 border border-neutral-200 dark:border-neutral-600 rounded-md resize-none focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                rows={3}
                disabled={isSubmitting}
              />
              <div className="flex items-center justify-between">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {newAnnotation.length}/1000 caracteres
                </div>
                <button
                  type="submit"
                  disabled={!newAnnotation.trim() || isSubmitting || newAnnotation.length > 1000}
                  className="flex items-center space-x-2 px-4 py-2 bg-cactus-600 text-white rounded-md hover:bg-cactus-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isSubmitting ? 'Guardando...' : 'Agregar Anotación'}</span>
                </button>
              </div>
            </form>
            
            {error && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskAnnotationsModal;