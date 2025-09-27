export interface Tag {
  id: string;
  name: string;
  color: string;
  backgroundColor: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  status: ContactStatus;
  stage: 'initial' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  source?: 'website' | 'referral' | 'cold_call' | 'social_media' | 'event' | 'other';
  assignedTo?: string;
  assignedToName?: string;
  createdAt: Date;
  updatedAt: Date;
  lastContactDate?: Date;
  lastActivity?: Date;
  nextFollowUp?: string;
  estimatedValue?: number;
  value?: number;
  probability?: number;
  priority?: 'low' | 'medium' | 'high';
  notes?: Note[];
  tags?: Tag[];
  products?: string[];
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
  customFields?: Record<string, any>;
}

export interface Deal {
  id: string;
  contactId: string;
  title: string;
  value: number;
  probability: number;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  expectedCloseDate: string;
  actualCloseDate?: string;
  assignedTo: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  activities: Activity[];
}

export interface Activity {
  id: string;
  contactId: string;
  dealId?: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'follow_up';
  title: string;
  description?: string;
  date: string;
  duration?: number;
  outcome?: 'successful' | 'unsuccessful' | 'no_answer' | 'rescheduled';
  assignedTo: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  probability: number;
  color: string;
}

export interface CRMFilters {
  status?: string[];
  stage?: string[];
  source?: string[];
  assignedTo?: string[];
  priority?: string[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

export interface TagManager {
  availableTags: Tag[];
  createTag: (name: string, color: string, backgroundColor: string) => Tag;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  getTagById: (id: string) => Tag | undefined;
  getTagsByIds: (ids: string[]) => Tag[];
}

export const DEFAULT_TAG_COLORS = [
  { color: '#FFFFFF', backgroundColor: '#3B82F6' }, // Azul brillante
  { color: '#FFFFFF', backgroundColor: '#10B981' }, // Verde esmeralda
  { color: '#FFFFFF', backgroundColor: '#8B5CF6' }, // Púrpura
  { color: '#FFFFFF', backgroundColor: '#EC4899' }, // Rosa
  { color: '#FFFFFF', backgroundColor: '#F59E0B' }, // Naranja
  { color: '#FFFFFF', backgroundColor: '#EF4444' }, // Rojo coral
  { color: '#FFFFFF', backgroundColor: '#06B6D4' }, // Turquesa
  { color: '#FFFFFF', backgroundColor: '#6366F1' }, // Índigo
  { color: '#FFFFFF', backgroundColor: '#84CC16' }, // Lima
  { color: '#FFFFFF', backgroundColor: '#F59E0B' }, // Ámbar
  { color: '#FFFFFF', backgroundColor: '#14B8A6' }, // Teal
  { color: '#FFFFFF', backgroundColor: '#F97316' }, // Naranja vibrante
  { color: '#FFFFFF', backgroundColor: '#A855F7' }, // Violeta
  { color: '#FFFFFF', backgroundColor: '#22C55E' }, // Verde brillante
  { color: '#FFFFFF', backgroundColor: '#E11D48' }, // Rosa intenso
  { color: '#FFFFFF', backgroundColor: '#0EA5E9' }, // Azul cielo
] as const;

export interface CRMStats {
  totalContacts: number;
  activeProspects: number;
  conversionRate: number;
  monthlyConversions: number;
  stageDistribution: Array<{
    stage: string;
    count: number;
  }>;
}

// Contact status type for CRM
export type ContactStatus = 'Prospecto' | 'Contactado' | 'Primera Reunion' | 'Segunda Reunion' | 'Apertura' | 'Cliente' | 'Caido' | 'Cuenta Vacia';

// Note type for CRM notes
export interface Note {
  id: string;
  content: string;
  type: 'call' | 'meeting' | 'email' | 'general';
  author: string;
  date: Date;
  createdAt: Date;
  createdBy: string;
  priority?: 'low' | 'medium' | 'high';
  isPrivate?: boolean;
  metadata?: Record<string, any>;
}

// Conversion event type
export interface ConversionEvent {
  id: string;
  contactId: string;
  userId: string;
  fromStatus: ContactStatus;
  toStatus: ContactStatus;
  timestamp: Date;
  value?: number;
  notes?: string;
}

// Conversion paths for tracking status changes
export const CONVERSION_PATHS = [
  { from: 'Prospecto' as ContactStatus, to: 'Contactado' as ContactStatus },
  { from: 'Contactado' as ContactStatus, to: 'Primera Reunion' as ContactStatus },
  { from: 'Primera Reunion' as ContactStatus, to: 'Segunda Reunion' as ContactStatus },
  { from: 'Segunda Reunion' as ContactStatus, to: 'Apertura' as ContactStatus },
  { from: 'Apertura' as ContactStatus, to: 'Cliente' as ContactStatus },
  { from: 'Contactado' as ContactStatus, to: 'Caido' as ContactStatus },
  { from: 'Primera Reunion' as ContactStatus, to: 'Caido' as ContactStatus },
  { from: 'Segunda Reunion' as ContactStatus, to: 'Caido' as ContactStatus },
  { from: 'Apertura' as ContactStatus, to: 'Caido' as ContactStatus },
  { from: 'Cliente' as ContactStatus, to: 'Cuenta Vacia' as ContactStatus }
] as const;

// Status flow configuration - can be customized by user
export const DEFAULT_STATUS_FLOW: ContactStatus[] = [
  'Prospecto',
  'Contactado', 
  'Primera Reunion',
  'Segunda Reunion',
  'Apertura',
  'Cliente'
];

// Alternative paths (negative outcomes)
export const ALTERNATIVE_STATUS_PATHS: Record<ContactStatus, ContactStatus[]> = {
  'Prospecto': ['Contactado', 'Caido'],
  'Contactado': ['Primera Reunion', 'Caido'],
  'Primera Reunion': ['Segunda Reunion', 'Caido'],
  'Segunda Reunion': ['Apertura', 'Caido'],
  'Apertura': ['Cliente', 'Caido'],
  'Cliente': ['Cuenta Vacia'],
  'Caido': [],
  'Cuenta Vacia': []
};

// Contact filters type
export interface ContactFilters {
  status?: ContactStatus | 'all';
  assignedTo?: string;
  dateRange?: { start: Date; end: Date };
  searchTerm?: string;
  source?: string;
  search?: string;
  stage?: string;
  tags?: string[];
}

// CRM view type
export type CRMViewType = 'list' | 'kanban' | 'grid';

// Pagination interface
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

// CRM State interface
export interface CRMState {
  contacts: Contact[];
  selectedContact: Contact | null;
  filters: ContactFilters;
  isLoading: boolean;
  viewType: CRMViewType;
  error: string | null;
  hasMoreContacts: boolean;
  tags: Tag[];
  view: CRMViewType;
  searchTerm: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  pagination: Pagination;
  conversions: ConversionEvent[];
  notes: Note[];
  addContact: (contactData: Partial<Contact>) => Promise<Contact>;
  updateContact: (id: string, updates: Partial<Contact>) => Promise<Contact>;
  updateContactStatus: (id: string, status: ContactStatus) => Promise<Contact>;
  deleteContact: (id: string) => Promise<void>;
  setSelectedContact: (contact: Contact | null) => void;
  setFilters: (filters: Partial<ContactFilters>) => void;
  setViewType: (viewType: CRMViewType) => void;
  setView: (view: CRMViewType) => void;
  setSearchTerm: (searchTerm: string) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (sortOrder: 'asc' | 'desc') => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  getFilteredContacts: () => Contact[];
  loadContacts: (page?: number, pageSize?: number) => Promise<void>;
  addNote: (contactId: string, note: Omit<Note, 'id' | 'createdAt'>) => Promise<Note>;
  updateNote: (contactId: string, noteId: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (contactId: string, noteId: string) => Promise<void>;
  clearError: () => void;
  startContactsSubscription?: () => Promise<void>;
  stopContactsSubscription?: () => Promise<void>;
  // Funciones de etiquetas
  updateContactTags: (contactId: string, tags: Tag[]) => Promise<Contact>;
  createTag: (tagData: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Tag>;
  updateTag: (id: string, updates: Partial<Tag>) => Promise<{ success: boolean; message?: string; error?: string }>;
  deleteTag: (tagId: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  setTagFilter: (tagIds: string[]) => void;
  // Funciones de validación y sincronización
  validateAndSyncUser: () => Promise<boolean>;
  checkSyncStatus: () => Promise<{ isSynced: boolean; message: string }>;
}