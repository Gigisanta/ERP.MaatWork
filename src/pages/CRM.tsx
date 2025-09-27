import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, Plus, List, Columns, Phone, Mail, Calendar, Edit, Trash2, Eye, MessageSquare, X, Tag as TagIcon, Settings, ChevronDown, User, Building, Clock, Star } from 'lucide-react';
import { useCRMStore } from '../store/crmStore';
import { useAuthStore } from '../store/authStore';
import { Contact, ContactStatus, Note } from '../types/crm';
import { cn } from '../utils/cn';
import KanbanBoard from '../components/KanbanBoard';
import StatusButton from '../components/StatusButton';
import TagsDisplay from '../components/TagsDisplay';
import TagManagerModal from '../components/TagManagerModal';
import TagCreatorModal from '../components/TagCreatorModal';


// Configuración temporal
  const TEMP_CONFIG = {
    enableRealTimeUpdates: true,
    autoSaveNotes: true,
    showDebugInfo: false
  };



const CRM: React.FC = () => {
  const { contacts, addContact, updateContact, updateContactTags, deleteContact, addNote, deleteNote, createTag, tags } = useCRMStore();
  const { user } = useAuthStore();
  
  // Estados para modales y UI
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteNoteModal, setShowDeleteNoteModal] = useState(false);

  const [showTagManagerModal, setShowTagManagerModal] = useState(false);
  const [showTagCreatorModal, setShowTagCreatorModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContactStatus | 'Todos'>('Todos');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [viewType, setViewType] = useState<'list' | 'kanban'>('list');
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  
  // Estados para formularios
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    status: 'Prospecto' as ContactStatus,
    lastContactDate: new Date().toISOString().split('T')[0],

  });
  
  const [noteForm, setNoteForm] = useState({
    type: 'call' as 'call' | 'meeting' | 'email' | 'other',
    content: ''
  });
  

  
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});

  // Sistema de etiquetas con paleta Cactus



  // Mapeo de colores por estado con paleta Cactus Dashboard
  const statusColors: Record<ContactStatus, string> = {
    'Prospecto': 'bg-cactus-50 text-cactus-700 border-cactus-200',
    'Contactado': 'bg-oasis-50 text-oasis-700 border-oasis-200',
    'Primera Reunion': 'bg-sunlight-50 text-sunlight-700 border-sunlight-200',
    'Segunda Reunion': 'bg-terracotta-50 text-terracotta-700 border-terracotta-200',
    'Apertura': 'bg-cactus-100 text-cactus-800 border-cactus-300',
    'Cliente': 'bg-oasis-100 text-oasis-800 border-oasis-300',
    'Caido': 'bg-error-50 text-error-700 border-error-200',
    'Cuenta Vacia': 'bg-neutral-50 text-neutral-700 border-neutral-200'
  };

  // Filtrar contactos
  /**
   * Filtra la lista de contactos basándose en los criterios de búsqueda, estado y tags seleccionados.
   * Utiliza useMemo para optimizar el rendimiento evitando recálculos innecesarios.
   * 
   * @description Aplica filtros múltiples a la lista de contactos:
   * - Búsqueda por texto: nombre, email o posición del contacto
   * - Filtro por estado: compara con el estado seleccionado ("Todos" incluye todos)
   * - Filtro por tags: actualmente siempre retorna true (pendiente implementación)
   * 
   * @dependencies
   * - contacts: Array de contactos a filtrar
   * - searchTerm: Término de búsqueda para filtrar por texto
   * - statusFilter: Estado seleccionado para filtrar contactos
   * - tagFilter: Filtro de tags (no implementado aún)
   * 
   * @returns {Contact[]} Array filtrado de contactos que cumplen todos los criterios
   */
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (contact.position && contact.position.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'Todos' || contact.status === statusFilter;
      const matchesTags = true;
      return matchesSearch && matchesStatus && matchesTags;
    });
  }, [contacts, searchTerm, statusFilter, tagFilter]);





  // Funciones para manejo de notas
  const handleAddNote = () => {
    if (!selectedContact || !noteForm.content.trim()) return;
    
    try {
      const newNote: Note = {
          id: Date.now().toString(),
          type: (noteForm.type === 'other' ? 'general' : noteForm.type) as 'call' | 'meeting' | 'email' | 'general',
          content: noteForm.content.trim(),
          author: user?.email || 'Usuario actual',
          date: new Date(),
          createdAt: new Date(),
          createdBy: user?.id || 'current-user'
        };
      
      addNote(selectedContact?.id || '', {
          type: (noteForm.type === 'other' ? 'general' : noteForm.type) as 'call' | 'meeting' | 'email' | 'general',
          content: noteForm.content.trim(),
          author: user?.email || 'Usuario actual',
          date: new Date(),
          createdBy: user?.id || 'current-user'
        });
      setNoteForm({ type: 'call', content: '' });
      setErrorMessage('');
    } catch (error) {
      console.error('Error al agregar nota:', error);
      setErrorMessage('Error al agregar la nota. Por favor, inténtalo de nuevo.');
    }
  };

  // Funciones de eliminación
  const handleDeleteNote = (note: Note) => {
    setNoteToDelete(note);
    setShowDeleteNoteModal(true);
  };

  const confirmDeleteNote = () => {
    if (!noteToDelete) return;
    
    try {
      deleteNote(selectedContact?.id || '', noteToDelete.id);
      setShowDeleteNoteModal(false);
      setNoteToDelete(null);
      setDeleteMessage('Nota eliminada correctamente');
      
      setTimeout(() => {
        setDeleteMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error al eliminar nota:', error);
      setErrorMessage('Error al eliminar la nota. Por favor, inténtalo de nuevo.');
    }
  };

  // Función para abrir modal de edición
  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      position: contact.position || '',
      status: contact.status,
      lastContactDate: contact.lastContactDate ? new Date(contact.lastContactDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setShowEditModal(true);
  };

  // Función para abrir modal de eliminación
  const handleDeleteContact = (contact: Contact) => {
    setContactToDelete(contact);
    setShowDeleteModal(true);
  };

  // Función para abrir modal de notas
  const handleViewNotes = (contact: Contact) => {
    setSelectedContact(contact);
    setShowNotesModal(true);
  };

  // Función para abrir gestor de etiquetas globales
  const handleManageTags = () => {
    setShowTagCreatorModal(true);
  };

  const statusFlow: ContactStatus[] = ['Prospecto', 'Contactado', 'Primera Reunion', 'Segunda Reunion', 'Apertura', 'Cliente'];

  const handleStatusChange = (contactId: string, newStatus: ContactStatus) => {
    const contact = contacts.find(c => c.id === contactId);
    if (!contact) return;

    updateContact(contact.id, {
      status: newStatus,
      lastContactDate: new Date()
    });
  };

  // Mapeo de estados internos a etiquetas en español
  const statusLabels: Record<ContactStatus, string> = {
    'Prospecto': 'Prospecto',
    'Contactado': 'Contactado',
    'Primera Reunion': 'Primera Reunión',
    'Segunda Reunion': 'Segunda Reunión',
    'Apertura': 'Apertura',
    'Cliente': 'Cliente',
    'Caido': 'Caído',
    'Cuenta Vacia': 'Cuenta Vacía'
  };

  // Componente ContactCard rediseñado
  const ContactCard: React.FC<{ contact: Contact }> = ({ contact }) => {
    const contactNotes = contact.notes || [];
  
    
    const getStatusColor = (status: ContactStatus) => {
      const colors = {
        'Prospecto': 'bg-gradient-to-r from-cactus-400 to-cactus-500 text-white',
        'Contactado': 'bg-gradient-to-r from-oasis-400 to-oasis-500 text-white',
        'Primera Reunion': 'bg-gradient-to-r from-sunlight-400 to-sunlight-500 text-white',
        'Segunda Reunion': 'bg-gradient-to-r from-terracotta-400 to-terracotta-500 text-white',
        'Apertura': 'bg-cactus-500 text-white',
        'Cliente': 'bg-oasis-500 text-white',
        'Caido': 'bg-gradient-to-r from-error-400 to-error-500 text-white',
        'Cuenta Vacia': 'bg-gradient-to-r from-neutral-400 to-neutral-500 text-white'
      };
      return colors[status] || 'bg-neutral-500 text-white';
    };

    const getStatusEmoji = (status: ContactStatus) => {
      const emojis = {
        'Prospecto': '🎯',
        'Contactado': '📞',
        'Primera Reunion': '🤝',
        'Segunda Reunion': '💼',
        'Apertura': '🔓',
        'Cliente': '✅',
        'Caido': '❌',
        'Cuenta Vacia': '📭'
      };
      return emojis[status] || '📋';
    };
    
    return (
      <div className="group bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 hover:shadow-xl hover:border-neutral-300 transition-all duration-300 transform hover:-translate-y-2">
        {/* Header con avatar y acciones */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-cactus-500 to-cactus-600 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-md group-hover:scale-110 transition-transform duration-200">
              {contact.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-neutral-900 text-lg truncate group-hover:text-cactus-600 transition-colors">{contact.name}</h3>
              {contact.position && (
                <p className="text-sm text-neutral-600 flex items-center mt-1 group-hover:text-neutral-700 transition-colors">
                  <Building className="w-3 h-3 mr-1" />
                  {contact.position}
                </p>
              )}
            </div>
          </div>
          
          {/* Acciones - solo visibles en hover */}
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
            <button
              onClick={() => {
                setSelectedContact(contact);
                setShowNotesModal(true);
              }}
              className="p-2 text-neutral-600 hover:text-cactus-600 hover:bg-cactus-50 rounded-xl transition-all duration-200 hover:scale-110"
              title="Ver notas"
            >
              <MessageSquare size={16} />
            </button>
            <button
              onClick={() => {
                setSelectedContact(contact);
                setFormData({
                  name: contact.name,
                  email: contact.email,
                  phone: contact.phone || '',
                  position: contact.position || '',
                  status: contact.status,
                  lastContactDate: contact.lastContactDate ? (contact.lastContactDate instanceof Date ? contact.lastContactDate.toISOString().split('T')[0] : contact.lastContactDate) : ''
                });
                setShowEditModal(true);
              }}
              className="p-2 text-neutral-600 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all duration-200 hover:scale-110"
              title="Editar contacto"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => {
                setContactToDelete(contact);
                setShowDeleteModal(true);
              }}
              className="p-2 text-neutral-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-110"
              title="Eliminar contacto"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        {/* Información de contacto */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center text-sm text-neutral-700 bg-transparent p-2 rounded-lg border border-neutral-200">
            <Mail className="w-4 h-4 mr-2 text-cactus-600" />
            <span className="truncate">{contact.email}</span>
          </div>
          {contact.phone && (
            <div className="flex items-center text-sm text-neutral-700 bg-transparent p-2 rounded-lg border border-neutral-200">
              <Phone className="w-4 h-4 mr-2 text-cactus-600" />
              <span>📞 {contact.phone}</span>
            </div>
          )}
        </div>
        
        {/* Etiquetas */}
        <div className="mb-4">
          <TagsDisplay
            tags={contact.tags || []}
            onTagsChange={(newTags) => {
              updateContactTags(contact.id, newTags);
            }}
            onManageTags={() => {
              setSelectedContact(contact);
              setShowTagManagerModal(true);
            }}
            maxVisible={2}
            compact={true}
            className="w-full"
          />
        </div>
        
        {/* Footer con información adicional */}
        <div className="flex items-center justify-between text-xs text-neutral-600 pt-3 border-t border-neutral-200">
          <div className="flex items-center bg-transparent p-2 rounded-lg border border-neutral-200">
            <Clock className="w-3 h-3 mr-1 text-cactus-600" />
            📅 Último contacto: {contact.lastContactDate ? new Date(contact.lastContactDate).toLocaleDateString() : 'N/A'}
          </div>
          <div className="flex items-center bg-transparent p-2 rounded-lg border border-neutral-200">
            <MessageSquare className="w-3 h-3 mr-1 text-cactus-600" />
            📝 {contactNotes.length} notas
          </div>
        </div>
        
        {/* Botón de estado */}
        <div className="mt-3">
          <StatusButton
            currentStatus={contact.status}
            onStatusChange={(newStatus) => handleStatusChange(contact.id, newStatus)}
            className="w-full"
          />
        </div>
      </div>
    );
  };

  // Función para manejar el envío del formulario de agregar contacto
  const handleAddContact = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }
    
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido';
    }
    
    if (formData.phone && formData.phone.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,}$/;
      if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
        newErrors.phone = 'El formato del teléfono no es válido';
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }
    
    try {
      const newContact: Contact = {
        id: crypto.randomUUID(),
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        position: formData.position.trim() || undefined,
        status: formData.status,
        lastContactDate: formData.lastContactDate ? new Date(formData.lastContactDate) : undefined,
        notes: [],
        stage: 'initial',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: [],
        products: []
      };
      
      await addContact(newContact);
      
      // Solo mostrar éxito y cerrar modal si la operación fue exitosa
      setSubmitMessage({ type: 'success', text: 'Contacto agregado correctamente' });
      setFormErrors({});
      setShowAddModal(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        position: '',
        status: 'Prospecto',
        lastContactDate: ''
      });
      
    } catch (error) {
      console.error('Error al agregar contacto:', error);
      setSubmitMessage({ type: 'error', text: 'Error al agregar el contacto. Inténtalo de nuevo.' });
    }
  }, [formData, addContact]);

  // Limpiar mensaje de eliminación
  useEffect(() => {
    if (deleteMessage) {
      const timer = setTimeout(() => setDeleteMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [deleteMessage]);

  // Cargar etiquetas al inicializar el componente
  useEffect(() => {
    const loadTags = async () => {
      try {
        console.log('🏷️ Inicializando carga de etiquetas en CRM...');
        // Tags are loaded automatically with the store
      } catch (error) {
        console.error('❌ Error cargando etiquetas en CRM:', error);
      }
    };

    loadTags();
  }, []);

  return (
    <div className="space-y-6">
        {/* Contenedor unificado con header, búsqueda y filtros */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-cactus-200 dark:border-cactus-700 overflow-hidden">
          <div className="p-6">
            {/* Fila superior: Título, contador y botones de acción */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3 animate-fade-in">
                <h1 className="text-xl font-bold bg-gradient-to-r from-cactus-500 to-cactus-600 bg-clip-text text-transparent font-cactus">🌵 CRM</h1>
                <span className="bg-cactus-50 dark:bg-cactus-900/20 px-2 py-1 rounded-lg border border-cactus-200 dark:border-cactus-700 text-cactus-700 dark:text-cactus-300 font-medium text-sm">{filteredContacts.length} contactos 👥</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleManageTags}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-cactus-600 dark:text-cactus-400 bg-cactus-50 dark:bg-cactus-900/20 border border-cactus-200 dark:border-cactus-700 rounded-lg hover:bg-cactus-100 dark:hover:bg-cactus-900/30 hover:scale-105 transition-all duration-200 ease-out"
                >
                  <TagIcon className="w-4 h-4 mr-1" />
                  Etiquetas
                </button>
                
                <div className="flex items-center bg-cactus-50 dark:bg-cactus-900/20 rounded-lg p-0.5 border border-cactus-200 dark:border-cactus-700">
                  <button
                    onClick={() => setViewType('list')}
                    className={cn(
                      "p-1.5 rounded transition-all duration-200 hover:scale-105",
                      viewType === 'list' ? "bg-gradient-to-r from-cactus-500 to-cactus-600 text-white" : "text-cactus-600 dark:text-cactus-400 hover:text-cactus-700 dark:hover:text-cactus-300"
                    )}
                  >
                    <List size={14} />
                  </button>
                  <button
                    onClick={() => setViewType('kanban')}
                    className={cn(
                      "p-1.5 rounded transition-all duration-200 hover:scale-105",
                      viewType === 'kanban' ? "bg-gradient-to-r from-cactus-500 to-cactus-600 text-white" : "text-cactus-600 dark:text-cactus-400 hover:text-cactus-700 dark:hover:text-cactus-300"
                    )}
                  >
                    <Columns size={14} />
                  </button>
                </div>
                
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-cactus-500 to-cactus-600 rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 ease-out"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nuevo
                </button>
              </div>
            </div>
            
            {/* Fila inferior: Búsqueda y filtros */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* Búsqueda principal */}
              <div className="flex-1 min-w-0">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cactus-600 dark:text-cactus-400 w-4 h-4 group-focus-within:text-cactus-700 transition-colors" />
                  <input
                    type="text"
                    placeholder="🔍 Buscar por nombre, email o posición..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-cactus-200 rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-cactus-50/50 focus:bg-white transition-all duration-200 text-sm placeholder-neutral-500"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cactus-600 hover:text-cactus-700 hover:scale-110 transition-all duration-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Filtros compactos */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-cactus-700 dark:text-cactus-300 bg-gradient-to-r from-cactus-50 to-cactus-100 px-3 py-1.5 rounded-full border border-cactus-200">
                  📊 Estado:
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as ContactStatus | 'Todos')}
                  className="px-3 py-1.5 text-xs font-medium border border-cactus-200 rounded-full bg-white focus:ring-2 focus:ring-cactus-500 focus:border-transparent transition-all duration-200 hover:bg-cactus-50"
                >
                  <option value="Todos">🌟 Todos</option>
                  <option value="Prospecto">🎯 Prospecto</option>
                  <option value="Contactado">📞 Contactado</option>
                  <option value="Primera reunión">🤝 Primera reunión</option>
                  <option value="Segunda reunión">💼 Segunda reunión</option>
                  <option value="Cliente">✅ Cliente</option>
                  <option value="Cuenta Vacia">📭 Cuenta Vacia</option>
                </select>
                
                {/* Contador y acciones */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-cactus-700 bg-gradient-to-r from-oasis-50 to-oasis-100 px-3 py-1.5 rounded-full border border-oasis-200">
                    📈 {filteredContacts.length}/{contacts.length}
                  </span>
                  {(searchTerm || statusFilter !== 'Todos') && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('Todos');
                        setTagFilter([]);
                      }}
                      className="text-xs font-medium text-error hover:text-error/80 bg-error/10 hover:bg-error/20 px-3 py-1.5 rounded-full border border-error/20 transition-all duration-200 hover:scale-105"
                    >
                      🗑️ Limpiar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {viewType === 'list' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {filteredContacts.map((contact, index) => (
                <div
                  key={contact.id}
                  className="animate-fade-in transform hover:scale-105 transition-all duration-200"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <ContactCard contact={contact} />
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <KanbanBoard contacts={filteredContacts} onStatusChange={handleStatusChange} />
            </div>
          )}
          
          {filteredContacts.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                <User className="w-12 h-12 text-neutral-500 dark:text-neutral-400" />
              </div>
              <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">No se encontraron contactos</h3>
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">Intenta ajustar los filtros o agrega un nuevo contacto.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-cactus-500 rounded-lg hover:bg-cactus-600 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar primer contacto
              </button>
            </div>
          )}
        </div>





      {/* Resto de modales existentes... */}
      {/* Modal para agregar contacto */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-cactus-200 dark:border-neutral-700 animate-scale-in">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 flex items-center">
                  <span className="mr-2">➕</span>
                  Nuevo Contacto
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({
                      name: '',
                      email: '',
                      phone: '',
                      position: '',
                      status: 'Prospecto',
                      lastContactDate: new Date().toISOString().split('T')[0]
                    });
                    setFormErrors({});
                    setSubmitMessage(null);
                  }}
                  className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:scale-110 transition-all duration-200"
                >
                  <X size={24} />
                </button>
              </div>
              
              {submitMessage && (
                <div className={cn(
                  "mb-4 p-3 rounded-lg text-sm",
                  submitMessage.type === 'success' 
                    ? "bg-oasis-50 dark:bg-oasis-900/20 text-oasis-600 dark:text-oasis-400 border border-oasis-200 dark:border-oasis-800"
                    : "bg-error-50 dark:bg-error-900/20 text-error dark:text-error-400 border border-error dark:border-error-800"
                )}>
                  {submitMessage.text}
                </div>
              )}
              
              <form onSubmit={handleAddContact} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2 flex items-center">
                    <span className="mr-1">👤</span> Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={cn(
                      "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-cactus-50 transition-all duration-200",
                      formErrors.name ? "border-error" : "border-cactus-200"
                    )}
                    placeholder="Nombre completo"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-error">{formErrors.name}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2 flex items-center">
                    <span className="mr-1">📧</span> Email (opcional)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={cn(
                      "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-cactus-50 transition-all duration-200",
                      formErrors.email ? "border-error" : "border-cactus-200"
                    )}
                    placeholder="email@ejemplo.com"
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-sm text-error">{formErrors.email}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2 flex items-center">
                    <span className="mr-1">📞</span> Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className={cn(
                      "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-cactus-50 transition-all duration-200",
                      formErrors.phone ? "border-error" : "border-cactus-200"
                    )}
                    placeholder="+54 11 1234-5678"
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-sm text-error">{formErrors.phone}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2 flex items-center">
                    <span className="mr-1">💼</span> Posición
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full px-4 py-3 border border-cactus-200 rounded-xl focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-cactus-50 transition-all duration-200"
                    placeholder="Ej: CEO, Gerente de Finanzas"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2 flex items-center">
                    <span className="mr-1">📊</span> Estado inicial
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ContactStatus }))}
                    className="w-full px-4 py-3 border border-cactus-200 rounded-xl focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-cactus-50 transition-all duration-200"
                  >
                    {Object.keys(statusLabels).map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status as ContactStatus]}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 hover:scale-105"
                  >
                    ❌ Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-cactus-500 to-cactus-600 rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    ➕ Crear contacto
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar contacto */}
      {showEditModal && selectedContact && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-cactus-200 dark:border-neutral-700 animate-scale-in">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 flex items-center">
                  <span className="mr-2">✏️</span>
                  Editar Contacto
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedContact(null);
                    setFormErrors({});
                    setSubmitMessage(null);
                  }}
                  className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:scale-110 transition-all duration-200"
                >
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                if (selectedContact) {
                  updateContact(selectedContact.id, {
                    name: formData.name,
                    email: formData.email || undefined,
                    phone: formData.phone || undefined,
                    position: formData.position || undefined,
                    status: formData.status,
                    lastContactDate: formData.lastContactDate ? new Date(formData.lastContactDate) : undefined
                  });
                  setShowEditModal(false);
                  setSelectedContact(null);
                }
              }} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2 flex items-center">
                    <span className="mr-1">👤</span> Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 border border-cactus-200 rounded-xl focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-cactus-50 transition-all duration-200"
                    placeholder="Nombre completo"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2 flex items-center">
                    <span className="mr-1">📧</span> Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-cactus-200 rounded-xl focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-cactus-50 transition-all duration-200"
                    placeholder="email@ejemplo.com"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2 flex items-center">
                    <span className="mr-1">📞</span> Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 border border-cactus-200 rounded-xl focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-cactus-50 transition-all duration-200"
                    placeholder="+54 11 1234-5678"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2 flex items-center">
                    <span className="mr-1">💼</span> Posición
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full px-4 py-3 border border-cactus-200 rounded-xl focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-cactus-50 transition-all duration-200"
                    placeholder="Ej: CEO, Gerente de Finanzas"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-2 flex items-center">
                    <span className="mr-1">📊</span> Estado
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as ContactStatus }))}
                    className="w-full px-4 py-3 border border-cactus-200 rounded-xl focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-cactus-50 transition-all duration-200"
                  >
                    {Object.keys(statusLabels).map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status as ContactStatus]}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 hover:scale-105"
                  >
                    ❌ Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-cactus-500 to-cactus-600 rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 shadow-lg"
                  >
                    💾 Guardar cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para eliminar contacto */}
      {showDeleteModal && contactToDelete && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md border border-error dark:border-error animate-scale-in">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-error flex items-center">
                  <span className="mr-2">🗑️</span>
                  Eliminar Contacto
                </h2>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setContactToDelete(null);
                  }}
                  className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:scale-110 transition-all duration-200"
                >
                  <X size={24} />
                </button>
              </div>
              
              <p className="text-neutral-700 dark:text-neutral-300 mb-6">
                ¿Estás seguro de que quieres eliminar el contacto <strong>{contactToDelete.name}</strong>? Esta acción no se puede deshacer.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setContactToDelete(null);
                  }}
                  className="px-6 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 hover:scale-105"
                >
                  ❌ Cancelar
                </button>
                <button
                  onClick={() => {
                    if (contactToDelete) {
                      deleteContact(contactToDelete.id);
                      setShowDeleteModal(false);
                      setContactToDelete(null);
                    }
                  }}
                  className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-error to-error/80 rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para notas */}
      {showNotesModal && selectedContact && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-cactus-200 dark:border-neutral-700 animate-scale-in">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 flex items-center">
                  <span className="mr-2">📝</span>
                  Notas de {selectedContact.name}
                </h2>
                <button
                  onClick={() => {
                    setShowNotesModal(false);
                    setSelectedContact(null);
                  }}
                  className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:scale-110 transition-all duration-200"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Formulario para agregar nota */}
              <div className="mb-6 p-4 bg-cactus-50 dark:bg-cactus-900/20 rounded-xl border border-cactus-200 dark:border-cactus-700">
                <h3 className="text-sm font-medium text-cactus-700 dark:text-cactus-300 mb-3">Agregar nueva nota</h3>
                <div className="space-y-3">
                  <select
                    value={noteForm.type}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, type: e.target.value as 'call' | 'meeting' | 'email' | 'other' }))}
                    className="w-full px-3 py-2 border border-cactus-200 rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-white text-sm"
                  >
                    <option value="call">📞 Llamada</option>
                    <option value="meeting">🤝 Reunión</option>
                    <option value="email">📧 Email</option>
                    <option value="other">📋 General</option>
                  </select>
                  <textarea
                    value={noteForm.content}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Escribe tu nota aquí..."
                    className="w-full px-3 py-2 border border-cactus-200 rounded-lg focus:ring-2 focus:ring-cactus-500 focus:border-transparent bg-white text-sm"
                    rows={3}
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!noteForm.content.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-cactus-500 to-cactus-600 rounded-lg hover:shadow-lg transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ➕ Agregar nota
                  </button>
                </div>
              </div>
              
              {/* Lista de notas */}
              <div className="space-y-3">
                {selectedContact.notes && selectedContact.notes.length > 0 ? (
                  selectedContact.notes.map((note) => (
                    <div key={note.id} className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs px-2 py-1 bg-cactus-100 text-cactus-700 rounded">
                            {note.type === 'call' ? '📞 Llamada' : 
                             note.type === 'meeting' ? '🤝 Reunión' : 
                             note.type === 'email' ? '📧 Email' : '📋 General'}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {new Date(note.date).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteNote(note)}
                          className="text-neutral-400 hover:text-error transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300">{note.content}</p>
                      <p className="text-xs text-neutral-500 mt-2">Por: {note.author}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-neutral-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay notas para este contacto</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para eliminar nota */}
      {showDeleteNoteModal && noteToDelete && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md border border-error animate-scale-in">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-error flex items-center">
                  <span className="mr-2">🗑️</span>
                  Eliminar Nota
                </h2>
                <button
                  onClick={() => {
                    setShowDeleteNoteModal(false);
                    setNoteToDelete(null);
                  }}
                  className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:scale-110 transition-all duration-200"
                >
                  <X size={24} />
                </button>
              </div>
              
              <p className="text-neutral-700 dark:text-neutral-300 mb-6">
                ¿Estás seguro de que quieres eliminar esta nota? Esta acción no se puede deshacer.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteNoteModal(false);
                    setNoteToDelete(null);
                  }}
                  className="px-6 py-3 text-sm font-medium text-neutral-600 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200 hover:scale-105"
                >
                  ❌ Cancelar
                </button>
                <button
                  onClick={confirmDeleteNote}
                  className="px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-error to-error/80 rounded-xl hover:shadow-lg transition-all duration-200 hover:scale-105 shadow-lg"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para gestor de etiquetas */}
      <TagManagerModal
        isOpen={showTagManagerModal}
        onClose={() => {
          setShowTagManagerModal(false);
          setSelectedContact(null); // Limpiar contacto seleccionado al cerrar
        }}
        contactTags={selectedContact?.tags || []}
        onTagsChange={(newTags) => {
          if (selectedContact) {
            updateContactTags(selectedContact.id, newTags);
          }
        }}
        availableTags={tags}
        contactName={selectedContact?.name} // Pasar el nombre del contacto
      />

      {/* Modal para creador de etiquetas globales */}
      <TagCreatorModal
        isOpen={showTagCreatorModal}
        onClose={() => setShowTagCreatorModal(false)}
      />
    </div>
  );
};

export default CRM;