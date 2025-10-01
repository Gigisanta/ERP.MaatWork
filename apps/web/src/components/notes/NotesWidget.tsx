import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Phone, 
  Mail, 
  Calendar, 
  TrendingUp, 
  Clock, 
  User,
  Eye,
  Plus,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { useNotesStore, Note } from '../../store/notesStore';
import { NotesEditor } from './NotesEditor';


interface NotesWidgetProps {
  contactId?: string;
  showCreateButton?: boolean;
  maxRecentNotes?: number;
  className?: string;
}

const NOTE_TYPE_CONFIG = {
  call: { label: 'Llamadas', icon: Phone, color: 'text-cactus-600' },
  meeting: { label: 'Reuniones', icon: Calendar, color: 'text-green-600' },
  follow_up: { label: 'Seguimiento', icon: Clock, color: 'text-yellow-600' },
  general: { label: 'General', icon: FileText, color: 'text-secondary' }
};

const PRIORITY_CONFIG = {
  low: { label: 'Baja', color: 'text-muted' },
  normal: { label: 'Normal', color: 'text-cactus-600' },
  high: { label: 'Alta', color: 'text-yellow-600' },
  urgent: { label: 'Urgente', color: 'text-red-600' }
};

export const NotesWidget: React.FC<NotesWidgetProps> = ({
  contactId,
  showCreateButton = true,
  maxRecentNotes = 5,
  className = ''
}) => {
  const { 
    notes, 
    isLoading, 
    error, 
    fetchNotes 
  } = useNotesStore();
  
  const [showEditor, setShowEditor] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    byType: {} as Record<string, number>,
    byPriority: {} as Record<string, number>,
    recent: [] as Note[]
  });

  // Cargar notas y estadísticas
  useEffect(() => {
    const loadData = async () => {
      if (contactId) {
        await fetchNotes(contactId);
      } else {
        if (contactId) {
          await fetchNotes(contactId);
        }
      }
    };
    
    loadData();
  }, [contactId, fetchNotes]);

  // Actualizar estadísticas cuando cambien las notas
  useEffect(() => {
    const newStats = {
      total: notes.length,
      today: notes.filter(note => {
         const today = new Date();
         const noteDate = new Date(note.createdAt);
         return noteDate.toDateString() === today.toDateString();
       }).length,
       thisWeek: notes.filter(note => {
         const weekAgo = new Date();
         weekAgo.setDate(weekAgo.getDate() - 7);
         return new Date(note.createdAt) >= weekAgo;
       }).length,
      byType: notes.reduce((acc, note) => {
        acc[note.type] = (acc[note.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPriority: notes.reduce((acc, note) => {
        acc[note.priority] = (acc[note.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recent: notes.slice(0, maxRecentNotes)
    };
    setStats(newStats);
  }, [notes, maxRecentNotes]);

  // Formatear fecha relativa
  const formatRelativeDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 60) {
      return `Hace ${Math.floor(diffInMinutes)} min`;
    } else if (diffInMinutes < 1440) {
      return `Hace ${Math.floor(diffInMinutes / 60)} h`;
    } else {
      return `Hace ${Math.floor(diffInMinutes / 1440)} días`;
    }
  };

  // Truncar texto
  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Manejar creación de nueva nota
  const handleNewNote = () => {
    if (!contactId) {
      console.warn('No se puede crear una nota sin contactId');
      return;
    }
    setShowEditor(true);
  };

  // Cerrar editor
  const handleCloseEditor = () => {
    setShowEditor(false);
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-border p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-secondary">
            <div className="w-5 h-5 border-2 border-cactus-500 border-t-transparent rounded-full animate-spin" />
            Cargando notas...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg border border-red-300 p-6 ${className}`}>
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>Error al cargar las notas</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-secondary" />
          <h3 className="text-lg font-semibold text-primary">
            {contactId ? 'Notas del Contacto' : 'Resumen de Notas'}
          </h3>
        </div>
        {showCreateButton && contactId && (
          <button
            onClick={handleNewNote}
            className="px-3 py-2 bg-cactus-600 text-white rounded-lg hover:bg-cactus-700 flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Estadísticas generales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total de notas */}
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <div className="text-sm text-secondary">Total de Notas</div>
          </div>

          {/* Notas por tipo más común */}
          {Object.entries(stats.byType).length > 0 && (
            <div className="text-center">
              <div className="text-2xl font-bold text-cactus-600">
                {Math.max(...Object.values(stats.byType))}
              </div>
              <div className="text-sm text-secondary">
                {NOTE_TYPE_CONFIG[
                  Object.entries(stats.byType).reduce((a, b) => 
                    stats.byType[a[0]] > stats.byType[b[0]] ? a : b
                  )[0] as keyof typeof NOTE_TYPE_CONFIG
                ]?.label || 'Tipo más común'}
              </div>
            </div>
          )}

          {/* Notas de alta prioridad */}
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {(stats.byPriority.high || 0) + (stats.byPriority.urgent || 0)}
            </div>
            <div className="text-sm text-secondary">Alta Prioridad</div>
          </div>

          {/* Notas recientes */}
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.recent.filter(note => {
                const dayAgo = new Date();
                dayAgo.setDate(dayAgo.getDate() - 1);
                return new Date(note.createdAt) > dayAgo;
              }).length}
            </div>
            <div className="text-sm text-secondary">Últimas 24h</div>
          </div>
        </div>

        {/* Distribución por tipo */}
        {Object.entries(stats.byType).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Distribución por Tipo
            </h4>
            <div className="space-y-2">
              {Object.entries(stats.byType)
                .sort(([,a], [,b]) => b - a)
                .map(([type, count]) => {
                  const config = NOTE_TYPE_CONFIG[type as keyof typeof NOTE_TYPE_CONFIG];
                  const percentage = (count / stats.total) * 100;
                  
                  if (!config) return null;
                  
                  const Icon = config.icon;
                  
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-primary">{config.label}</span>
                          <span className="text-secondary">{count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                          <div 
                            className="bg-cactus-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        )}

        {/* Notas recientes */}
        {stats.recent.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Notas Recientes
            </h4>
            <div className="space-y-3">
              {stats.recent.map((note) => {
                const typeConfig = NOTE_TYPE_CONFIG[note.type];
                const priorityConfig = PRIORITY_CONFIG[note.priority];
                const TypeIcon = typeConfig?.icon || FileText;
                
                return (
                  <div 
                    key={note.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className={`p-1.5 rounded ${typeConfig?.color || 'text-secondary'} bg-white`}>
                      <TypeIcon className="w-3 h-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${priorityConfig?.color || 'text-secondary'}`}>
                          {priorityConfig?.label || note.priority}
                        </span>
                        <span className="text-xs text-secondary">
                          {formatRelativeDate(note.createdAt.toISOString())}
                        </span>
                        {note.is_private && (
                          <Eye className="w-3 h-3 text-yellow-600" />
                        )}
                      </div>
                      <p className="text-sm text-primary leading-relaxed">
                        {truncateText(note.content)}
                      </p>
                      {note.author && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-secondary">
                          <User className="w-3 h-3" />
                          {note.author}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Ver todas las notas */}
            {stats.total > maxRecentNotes && (
              <div className="mt-4 text-center">
                <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mx-auto">
                  Ver todas las notas ({stats.total})
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Estado vacío */}
        {stats.total === 0 && (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 mb-4">
              {contactId 
                ? 'No hay notas para este contacto'
                : 'No hay notas disponibles'
              }
            </p>
            {showCreateButton && contactId && (
              <button
                onClick={handleNewNote}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Crear primera nota
              </button>
            )}
          </div>
        )}
      </div>

      {/* Editor de notas */}
      {showEditor && contactId && (
        <NotesEditor
          contactId={contactId}
          onClose={handleCloseEditor}
          onSave={() => {
            // Las notas se actualizarán automáticamente a través del store
          }}
        />
      )}
    </div>
  );
};

export default NotesWidget;