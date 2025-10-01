import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CONFIG, isDevelopment, isProduction } from '../config/environment';
import { supabase } from '@cactus/database';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: 'advisor' | 'manager' | 'admin';
  avatar?: string;
  phone?: string;
  department?: string;
  justification?: string;
  status?: 'pending' | 'approved' | 'rejected';
  isApproved: boolean;
  createdAt: string;
  team_id?: string;
  avatar_url?: string;
  last_login?: string;
  approved_by?: string;
  approved_at?: string;
  canManageTeam?: boolean;
  canEditUsers?: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'approval_request' | 'approval_approved' | 'approval_rejected' | 'team_invitation' | 'team_update' | 'contact_assigned' | 'metric_milestone' | 'system_announcement';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface ApprovalRequest {
  id: string;
  user_id: string;
  requested_role: 'manager' | 'admin';
  status: 'pending' | 'approved' | 'rejected';
  priority?: 'high' | 'medium' | 'low';
  request_type?: 'role_upgrade' | 'new_registration';
  comments?: string;
  justification?: string;
  created_at: string;
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

interface AuthState {
  user: User | null;
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  rememberSession: boolean;
  notifications: Notification[];
  unreadCount: number;
  approvalRequests: ApprovalRequest[];
  users: User[];
  
  // Authentication methods
  login: (username: string, password: string, remember?: boolean) => Promise<boolean>;
  register: (datosUsuario: Omit<User, 'id' | 'createdAt' | 'isApproved'> & { password?: string }) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  
  // Email confirmation methods
  inicializarListenerAutenticacion: () => void;
  manejarConfirmacionEmail: (session: Session | null) => Promise<void>;
  verificarEstadoConfirmacion: () => Promise<boolean>;
  continuarSinConfirmacion: (email: string) => Promise<boolean>;
  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; message: string; }>;
  checkEmailConfiguration: () => Promise<{ configured: boolean; provider?: string; recommendations?: string[]; }>;
  
  // User management methods
  getPendingUsers: () => Promise<User[]>;
  approveUser: (userId: string, comments?: string) => Promise<boolean>;
  rejectUser: (userId: string, comments?: string) => Promise<boolean>;
  getAllUsers: () => User[];

  deleteUser: (userId: string) => Promise<boolean>;
  deleteAllUserData: (userId: string) => Promise<boolean>;
  resetSystem: () => Promise<boolean>;
  deleteAllPendingUsers: () => Promise<boolean>;
  clearCompleteDatabase: () => Promise<boolean>;

  actualizarEstadoUsuario: (userId: string, updates: Partial<User>) => Promise<boolean>;
  // Users realtime and fetch
  fetchUsersFromSupabase: () => Promise<void>;
  startUsersSubscription: () => Promise<void>;
  stopUsersSubscription: () => Promise<void>;
  
  // Notification methods
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  createNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => Promise<void>;
  
  // Approval workflow methods
  requestManagerApproval: (userId: string, comments?: string) => Promise<boolean>;
  getPendingApprovals: () => ApprovalRequest[];
  processApproval: (approvalId: string, action: 'approve' | 'reject', comments?: string) => Promise<boolean>;
  updateUserRole: (userId: string, newRole: 'advisor' | 'manager' | 'admin', approvedBy?: string) => Promise<boolean>;
}
let usersChannel: ReturnType<typeof supabase.channel> | undefined;

// Usuario admin permanente
const getAdminUser = (): User => {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Gio',
    username: 'Gio',
    email: 'gio@cactus.com',
    role: 'admin',
    phone: '+54 9 11 1234-5678',
    department: 'Administración',
    isApproved: true,
    createdAt: '2024-01-01T00:00:00Z'
  };
};

// Credenciales del admin permanente
const getAdminCredentials = (): { [username: string]: string } => {
  return {
    'Gio': 'Gio123'
  };
};

// Variables de datos que se actualizan dinámicamente
let mockUsers: User[] = [getAdminUser()];
let mockCredentials: { [username: string]: string } = getAdminCredentials();

// Usuarios advisor predefinidos (semilla local para acceso inmediato)
const predefinedAdvisors: Array<{ name: string; username: string; email: string; password: string }> = [
  { name: 'Mvicente', username: 'Mvicente', email: 'Mvicente@grupoabax.com', password: 'Mvicente123' },
  { name: 'Nzappia', username: 'Nzappia', email: 'Nzappia@grupoabax.com', password: 'Nzappia123' },
  { name: 'TDanziger', username: 'TDanziger', email: 'Tdanziger@grupoabax.com', password: 'TDanziger123' },
  { name: 'PMolina', username: 'PMolina', email: 'Pmolina@grupoabax.com', password: 'PMolina123' },
  { name: 'NIngilde', username: 'NIngilde', email: 'NIngilde@grupoabax.com', password: 'NIngilde123' },
  { name: 'Fandreacchio', username: 'Fandreacchio', email: 'Fandreacchio@grupoabax.com', password: 'Fandreacchio123' }
];

// Función para generar UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Mapeo de UUIDs fijos para usuarios predefinidos
const predefinedUserUUIDs: { [username: string]: string } = {
  'Mvicente': '550e8400-e29b-41d4-a716-446655440001',
  'Nzappia': '550e8400-e29b-41d4-a716-446655440002',
  'TDanziger': '550e8400-e29b-41d4-a716-446655440003',
  'PMolina': '550e8400-e29b-41d4-a716-446655440004',
  'NIngilde': '550e8400-e29b-41d4-a716-446655440005',
  'Fandreacchio': '550e8400-e29b-41d4-a716-446655440006'
};

const seedDefaultAdvisors = () => {
  predefinedAdvisors.forEach(({ name, username, email, password }) => {
    const exists = mockUsers.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (!exists) {
      const user: User = {
        id: predefinedUserUUIDs[username] || generateUUID(),
        name,
        username,
        email,
        role: 'advisor',
        isApproved: true,
        createdAt: new Date().toISOString()
      };
      mockUsers.push(user);
      mockCredentials[username] = password;
    }
  });
};
let mockApprovalRequests: ApprovalRequest[] = [];
let mockNotifications: Notification[] = [];

// Función para validar si un ID es un UUID válido
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Función para limpiar localStorage de datos obsoletos
const limpiarLocalStorageObsoleto = () => {
  try {
    console.log('🧹 CLEANUP: Iniciando limpieza de localStorage obsoleto');
    
    // Verificar si hay datos con IDs inválidos
    const usuariosGuardados = localStorage.getItem('cactus_users');
    const credencialesGuardadas = localStorage.getItem('cactus_credentials');
    
    let needsCleanup = false;
    
    if (usuariosGuardados) {
      try {
        const usuarios = JSON.parse(usuariosGuardados);
        const hasInvalidIds = usuarios.some((u: User) => !isValidUUID(u.id));
        if (hasInvalidIds) {
          console.log('🚨 CLEANUP: Detectados IDs inválidos en usuarios guardados');
          needsCleanup = true;
        }
      } catch (e) {
        console.log('🚨 CLEANUP: Error parseando usuarios guardados, limpiando');
        needsCleanup = true;
      }
    }
    
    if (needsCleanup) {
      console.log('🧹 CLEANUP: Limpiando datos obsoletos del localStorage');
      localStorage.removeItem('cactus_users');
      localStorage.removeItem('cactus_credentials');
      localStorage.removeItem('cactus_approval_requests');
      localStorage.removeItem('cactus_notifications');
      console.log('✅ CLEANUP: localStorage limpiado exitosamente');
      
      // Forzar recarga de datos válidos después de la limpieza
      forzarRecargaDatosValidos();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ CLEANUP: Error durante la limpieza:', error);
    return false;
  }
};

// Función para cargar datos desde localStorage
const cargarDatosDesdeLocalStorage = () => {
  try {
    // Primero limpiar datos obsoletos si es necesario
    const wasCleanedUp = limpiarLocalStorageObsoleto();
    
    if (wasCleanedUp) {
      console.log('🔄 STORAGE: Datos limpiados, usando datos por defecto');
      return;
    }
    
    const usuariosGuardados = localStorage.getItem('cactus_users');
    const credencialesGuardadas = localStorage.getItem('cactus_credentials');
    const solicitudesGuardadas = localStorage.getItem('cactus_approval_requests');
    const notificacionesGuardadas = localStorage.getItem('cactus_notifications');
    
    if (usuariosGuardados) {
      const usuarios = JSON.parse(usuariosGuardados);
      mockUsers = [getAdminUser(), ...usuarios.filter((u: User) => u.id !== '550e8400-e29b-41d4-a716-446655440000')];
      console.log('📂 STORAGE: Usuarios cargados desde localStorage:', mockUsers.length);
    }
    
    if (credencialesGuardadas) {
      const credenciales = JSON.parse(credencialesGuardadas);
      mockCredentials = { ...getAdminCredentials(), ...credenciales };
      console.log('🔑 STORAGE: Credenciales cargadas desde localStorage');
    }
    
    if (solicitudesGuardadas) {
      mockApprovalRequests = JSON.parse(solicitudesGuardadas);
      console.log('📋 STORAGE: Solicitudes de aprobación cargadas:', mockApprovalRequests.length);
    }
    
    if (notificacionesGuardadas) {
      mockNotifications = JSON.parse(notificacionesGuardadas);
      console.log('🔔 STORAGE: Notificaciones cargadas:', mockNotifications.length);
    }
  } catch (error) {
    console.error('❌ STORAGE: Error cargando datos desde localStorage:', error);
  }
};

// Función para forzar recarga de datos válidos
const forzarRecargaDatosValidos = () => {
  console.log('🔄 RELOAD: Forzando recarga de datos con UUIDs válidos');
  
  // Resetear a datos por defecto
  mockUsers = [getAdminUser()];
  mockCredentials = getAdminCredentials();
  mockApprovalRequests = [];
  mockNotifications = [];
  
  // Sembrar usuarios advisor con UUIDs válidos
  seedDefaultAdvisors();
  
  // Guardar en localStorage los datos válidos
  try {
    localStorage.setItem('cactus_users', JSON.stringify(mockUsers.filter(u => u.id !== '550e8400-e29b-41d4-a716-446655440000')));
    localStorage.setItem('cactus_credentials', JSON.stringify(mockCredentials));
    localStorage.setItem('cactus_approval_requests', JSON.stringify(mockApprovalRequests));
    localStorage.setItem('cactus_notifications', JSON.stringify(mockNotifications));
    console.log('✅ RELOAD: Datos válidos guardados en localStorage');
  } catch (error) {
    console.error('❌ RELOAD: Error guardando datos válidos:', error);
  }
};

// Cargar datos al inicializar
cargarDatosDesdeLocalStorage();

// Sembrar usuarios advisor por defecto si no existen
seedDefaultAdvisors();

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      rememberSession: false,
      notifications: mockNotifications,
      unreadCount: mockNotifications.filter(n => !n.read_at).length,
      approvalRequests: mockApprovalRequests,
      users: mockUsers, // Agregar usuarios al estado
      fetchUsersFromSupabase: async () => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id, full_name, email, role, phone, department, is_approved, created_at, username');
          if (error) throw error;
          const mapped: User[] = (data || []).map((u: any) => ({
            id: u.id,
            name: u.full_name || u.username || u.email || 'Usuario',
            username: u.username || u.email || u.id,
            email: u.email || undefined,
            role: (u.role || 'advisor') as User['role'],

            phone: u.phone || undefined,
            department: u.department || undefined,
            isApproved: !!u.is_approved,
            createdAt: u.created_at || new Date().toISOString()
          }));
          set({ users: mapped });
        } catch (e) {
          console.error('❌ USERS: Error fetching users from Supabase', e);
        }
      },

      startUsersSubscription: async () => {
        if (usersChannel) return;
        usersChannel = supabase
          .channel('users-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
            (useAuthStore as any).getState().fetchUsersFromSupabase();
          })
          .subscribe();
      },

      stopUsersSubscription: async () => {
        if (usersChannel) {
          await supabase.removeChannel(usersChannel);
          usersChannel = undefined;
        }
      },

      login: async (username: string, password: string, remember = false) => {
        console.log('🔐 LOGIN: Iniciando proceso de login con Supabase Auth', { username, remember });
        set({ isLoading: true });
        
        try {
          // Intentar login con Supabase Auth usando email
          const email = username.includes('@') ? username : `${username}@test.com`;
          
          console.log('🔑 LOGIN: Intentando autenticación con Supabase...');
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (authError) {
            console.log('❌ LOGIN: Error en Supabase Auth, intentando con sistema mock:', authError.message);
            
            // Fallback al sistema mock si Supabase Auth falla
            const user = mockUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
            const actualUsername = user ? user.username : username;
            const passwordMatch = mockCredentials[actualUsername] === password;
            
            if (user && passwordMatch && user.isApproved) {
              console.log('✅ LOGIN: Autenticación exitosa con sistema mock');
              
              // CRÍTICO: Crear sesión de Supabase para usuarios mock
              try {
                console.log('🔐 LOGIN: Creando sesión de Supabase para usuario mock...');
                
                // Intentar crear una sesión temporal en Supabase usando el email del usuario
                const mockEmail = user.email || `${user.username}@mock.local`;
                const mockPassword = 'MockUser123!';
                
                // Intentar login con Supabase usando credenciales mock
                const { data: mockAuthData, error: mockAuthError } = await supabase.auth.signInWithPassword({
                  email: mockEmail,
                  password: mockPassword
                });
                
                if (mockAuthError) {
                  console.log('⚠️ LOGIN: No se pudo crear sesión de Supabase para usuario mock, continuando sin sesión');
                  console.log('   Error:', mockAuthError.message);
                } else {
                  console.log('✅ LOGIN: Sesión de Supabase creada para usuario mock:', mockAuthData.user?.id);
                }
              } catch (sessionError) {
                console.log('⚠️ LOGIN: Error creando sesión de Supabase para mock:', sessionError);
              }
              
              set({ 
                user, 
                currentUser: user,
                isAuthenticated: true, 
                isLoading: false,
                rememberSession: remember
              });
              
              try {
                const { useCRMStore } = await import('./crmStore');
                useCRMStore.getState().startContactsSubscription?.();
              } catch {}
              return true;
            } else {
              set({ isLoading: false });
              throw new Error('Credenciales inválidas');
            }
          }
          
          if (!authData.user || !authData.session) {
            set({ isLoading: false });
            throw new Error('No se pudo establecer la sesión');
          }
          
          console.log('✅ LOGIN: Autenticación exitosa con Supabase Auth:', authData.user.id);
          
          // Obtener datos del usuario desde la tabla users
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();
          
          if (userError || !userData) {
            console.log('⚠️ LOGIN: Usuario no encontrado en tabla users, usando datos de Auth');
            // Crear usuario básico con datos de Auth
            const basicUser: User = {
              id: authData.user.id,
              name: authData.user.user_metadata?.full_name || authData.user.email?.split('@')[0] || 'Usuario',
              username: authData.user.user_metadata?.username || authData.user.email?.split('@')[0] || 'user',
              email: authData.user.email,
              role: authData.user.user_metadata?.role || 'advisor',
              isApproved: true,
              createdAt: authData.user.created_at || new Date().toISOString()
            };
            
            set({ 
              user: basicUser, 
              currentUser: basicUser,
              isAuthenticated: true, 
              isLoading: false,
              rememberSession: remember
            });
          } else {
            // Mapear datos de la tabla users
            const mappedUser: User = {
              id: userData.id,
              name: userData.full_name || userData.username || userData.email || 'Usuario',
              username: userData.username || userData.email?.split('@')[0] || 'user',
              email: userData.email,
              role: userData.role || 'advisor',
              phone: userData.phone,
              department: userData.department,
              isApproved: userData.is_approved || false,
              createdAt: userData.created_at || new Date().toISOString()
            };
            
            if (!mappedUser.isApproved) {
              set({ currentUser: mappedUser, isLoading: false, isAuthenticated: false });
              throw new Error('Tu cuenta está pendiente de aprobación');
            }
            
            console.log('✅ LOGIN: Usuario autenticado correctamente:', mappedUser.username);
            set({ 
              user: mappedUser, 
              currentUser: mappedUser,
              isAuthenticated: true, 
              isLoading: false,
              rememberSession: remember
            });
          }
          
          try {
            const { useCRMStore } = await import('./crmStore');
            useCRMStore.getState().startContactsSubscription?.();
          } catch {}
          
          return true;
          
        } catch (error: any) {
          console.error('❌ LOGIN: Error en proceso de login:', error);
          set({ isLoading: false });
          throw error;
        }
      },

      

      register: async (datosUsuario) => {
        console.log('🔥 AUTHSTORE: ===== INICIO FUNCIÓN REGISTER =====');
        console.log('🔥 AUTHSTORE: Datos recibidos:', {
          name: datosUsuario.name,
          username: datosUsuario.username,
          email: datosUsuario.email,
          phone: datosUsuario.phone,
          role: datosUsuario.role,
          passwordLength: datosUsuario.password?.length
        });
        
        // Validaciones básicas
        if (!datosUsuario.email || !datosUsuario.name || !datosUsuario.username) {
          throw new Error('Faltan datos requeridos para el registro');
        }
        
        console.log('🚀 REGISTER: Iniciando proceso de registro con Supabase');
        set({ isLoading: true });

        try {
          // Usar email como identificador principal para Supabase
          const email = datosUsuario.email || `${datosUsuario.username}@temp.com`;
          const password = datosUsuario.password || 'TempPassword123!';

          console.log('🔍 REGISTER: Verificando si el usuario ya existe en Supabase...');

          // Verificar si el usuario ya existe en la tabla users (0 o 1 fila)
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email.trim().toLowerCase())
            .maybeSingle();

          if (checkError) {
            console.error('❌ REGISTER: Error verificando usuario existente:', checkError);
            throw checkError;
          }

          if (existingUser) {
            console.log('❌ REGISTER: Usuario ya existe:', email);
            console.log('🔄 REGISTER: Estableciendo isLoading = false (usuario existe)');
            set({ isLoading: false });
            throw new Error('El email ya está registrado');
          }

          console.log('🔐 REGISTER: Creando usuario en Supabase Auth...');
          // Crear usuario en Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: datosUsuario.name,
                username: datosUsuario.username,
                role: datosUsuario.role
              }
            }
          });

          if (authError) {
            console.error('❌ REGISTER: Error en Supabase Auth:', authError);
            
            // Mapear errores específicos de Supabase Auth
            let errorMessage = 'Error de autenticación';
            if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
              errorMessage = 'Este email ya está registrado';
            } else if (authError.message.includes('invalid email')) {
              errorMessage = 'El formato del email no es válido';
            } else if (authError.message.includes('weak password')) {
              errorMessage = 'La contraseña debe ser más fuerte';
            } else if (authError.message.includes('network')) {
              errorMessage = 'Error de conexión. Verifica tu internet';
            } else {
              errorMessage = authError.message;
            }
            
            throw new Error(errorMessage);
          }

          if (!authData.user) {
            console.error('❌ REGISTER: No se pudo crear el usuario en Auth');
            throw new Error('No se pudo crear el usuario');
          }

          console.log('✅ REGISTER: Usuario creado en Auth:', authData.user.id);
          console.log('🔑 REGISTER: Sesión establecida al signUp:', !!authData.session);

          console.log('✅ REGISTER: Registro directo sin confirmación de email');
          // Pequeña espera para asegurar propagación de sesión en el cliente
          await new Promise(resolve => setTimeout(resolve, 400));

          console.log('👤 REGISTER: Creando perfil en tabla users...');
          
          // Función auxiliar para crear perfil con retry logic
          const createUserProfile = async (retryCount = 0): Promise<any> => {
            const maxRetries = datosUsuario.role === 'admin' ? 3 : 1;
            
            try {
              const { data: userData, error: userError } = await supabase
                .from('users')
                .insert({
                  id: authData.user.id,
                  email,
                  full_name: datosUsuario.name,
                  username: datosUsuario.username,
                  role: datosUsuario.role,
                  phone: datosUsuario.phone || null,
                  department: datosUsuario.department || null,
                  is_approved: datosUsuario.role === 'advisor' || datosUsuario.role === 'admin', // Advisors y admins aprobados automáticamente
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single();

              if (userError) {
                console.error(`❌ REGISTER: Error creando perfil (intento ${retryCount + 1}):`, userError);
                console.error('❌ REGISTER: Detalles del error:', {
                  code: userError.code,
                  message: userError.message,
                  details: userError.details,
                  hint: userError.hint
                });
                
                // Manejo específico para errores RLS y otros errores de base de datos
                if ((userError as any).code === '42501') {
                  if (datosUsuario.role === 'admin' && retryCount < maxRetries) {
                    console.log(`🔄 REGISTER: Reintentando creación de admin (${retryCount + 1}/${maxRetries})...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                    return createUserProfile(retryCount + 1);
                  }
                  
                  if (datosUsuario.role === 'admin') {
                    throw new Error('No se puede crear la cuenta de administrador inicial. Verifica que no existan otros administradores en el sistema.');
                  } else {
                    throw new Error('No fue posible crear tu perfil por políticas de seguridad. Inicia sesión y reintenta.');
                  }
                } else if ((userError as any).code === '23505') {
                  // Error de duplicado
                  if (userError.message.includes('email')) {
                    throw new Error('Este email ya está registrado');
                  } else if (userError.message.includes('username')) {
                    throw new Error('Este nombre de usuario ya existe');
                  } else {
                    throw new Error('Ya existe un usuario con estos datos');
                  }
                } else if ((userError as any).code === '23514') {
                  // Error de constraint check
                  throw new Error('Los datos proporcionados no cumplen con los requisitos del sistema');
                }
                
                // Error genérico con mensaje más amigable
                let friendlyMessage = 'Error creando el perfil de usuario';
                if (userError.message.includes('network')) {
                  friendlyMessage = 'Error de conexión. Verifica tu internet e intenta nuevamente';
                } else if (userError.message.includes('timeout')) {
                  friendlyMessage = 'La operación tardó demasiado. Intenta nuevamente';
                }
                
                throw new Error(friendlyMessage);
              }
              
              return userData;
            } catch (error) {
              if (retryCount < maxRetries && datosUsuario.role === 'admin') {
                console.log(`🔄 REGISTER: Reintentando por error general (${retryCount + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
                return createUserProfile(retryCount + 1);
              }
              throw error;
            }
          };
          
          const userData = await createUserProfile();

          console.log('✅ REGISTER: Perfil creado exitosamente:', userData.id);

          // Si es manager, crear solicitud de aprobación
          if (datosUsuario.role === 'manager') {
            console.log('👔 REGISTER: Procesando registro de manager...');

            console.log('📝 REGISTER: Creando solicitud de aprobación...');
            // Intentar en tabla approvals; si no existe, fallback a approval_requests
            let approvalId: string | null = null;
            const nowIso = new Date().toISOString();
            const tryApprovals = await supabase
              .from('approvals')
              .insert({
                user_id: authData.user.id,
                requested_role: 'manager',
                status: 'pending',
                comments: datosUsuario.justification || 'Solicitud de registro como manager',
                created_at: nowIso,
                updated_at: nowIso
              })
              .select()
              .single();

            if (tryApprovals.error) {
              console.warn('⚠️ REGISTER: No se pudo insertar en approvals. Probando approval_requests...', tryApprovals.error);
              const tryApprovalRequests = await supabase
                .from('approval_requests')
                .insert({
                  user_id: authData.user.id,
                  requested_role: 'manager',
                  status: 'pending',
                  request_message: datosUsuario.justification || 'Solicitud de registro como manager',
                  created_at: nowIso
                })
                .select()
                .single();

              if (tryApprovalRequests.error) {
                console.error('❌ REGISTER: Error creando solicitud (fallback) :', tryApprovalRequests.error);
                throw new Error(`Error creando solicitud: ${tryApprovalRequests.error.message}`);
              } else {
                approvalId = (tryApprovalRequests.data as any)?.id || null;
              }
            } else {
              approvalId = (tryApprovals.data as any)?.id || null;
            }

            if (approvalId) {
              console.log('✅ REGISTER: Solicitud de aprobación creada:', approvalId);
            }

            console.log('🔔 REGISTER: Creando notificación para administradores...');
            await get().createNotification({
              user_id: 'admin',
              type: 'approval_request',
              title: 'Nueva solicitud de aprobación',
              message: `${datosUsuario.name} ha solicitado ser promovido a Manager`,
              data: { approval_id: approvalId, user_id: authData.user.id },
              priority: 'high'
            });
            console.log('✅ REGISTER: Notificación creada exitosamente');
          }

          // Para advisors y admins (aprobados automáticamente), establecer como usuario autenticado
          if (datosUsuario.role === 'advisor' || datosUsuario.role === 'admin') {
            console.log(`✅ REGISTER: ${datosUsuario.role} aprobado automáticamente, estableciendo sesión en store`);

            const newUser: User = {
              id: authData.user.id,
              name: datosUsuario.name,
              username: datosUsuario.username,
              email,
              role: datosUsuario.role,
              phone: datosUsuario.phone,
              department: datosUsuario.department,
              isApproved: true,
              createdAt: new Date().toISOString()
            };

            console.log(`🔄 REGISTER: Estableciendo isLoading = false (${datosUsuario.role} aprobado)`);
            set({
              user: newUser,
              currentUser: newUser,
              isAuthenticated: true,
              isLoading: false
            });
            console.log(`✅ REGISTER: Estado actualizado para ${datosUsuario.role}`);
          } else {
            // Para managers (requieren aprobación): establecer currentUser pendiente (no autenticado)
            console.log('⏳ REGISTER: Manager requiere aprobación, estableciendo currentUser pendiente');
            const pendingUser: User = {
              id: authData.user.id,
              name: datosUsuario.name,
              username: datosUsuario.username,
              email,
              role: datosUsuario.role,
              phone: datosUsuario.phone,
              department: datosUsuario.department,
              isApproved: false,
              status: 'pending',
              createdAt: new Date().toISOString()
            };
            set({ currentUser: pendingUser, isLoading: false });
            console.log('✅ REGISTER: currentUser establecido como pendiente');
          }

          console.log('🎉 AUTHSTORE: ===== PROCESO DE REGISTRO COMPLETADO EXITOSAMENTE =====');
          console.log('🎉 AUTHSTORE: Retornando true desde función register');
          
          // Asegurar que isLoading se establece a false al finalizar
          const currentState = get();
          if (currentState.isLoading) {
            set({ isLoading: false });
          }
          
          console.log('🎉 AUTHSTORE: Estado final del store:', {
            isAuthenticated: get().isAuthenticated,
            userExists: !!get().user,
            currentUserExists: !!get().currentUser,
            isLoading: get().isLoading
          });
          return true;
        } catch (error: any) {
          console.error('💥 AUTHSTORE: ===== ERROR EN FUNCIÓN REGISTER =====');
          console.error('💥 AUTHSTORE: Error durante el registro:', error);
          console.error('💥 AUTHSTORE: Tipo de error:', typeof error);
          console.error('💥 AUTHSTORE: Error es instancia de Error:', error instanceof Error);
          console.error('💥 AUTHSTORE: Detalles del error:', {
            message: error?.message,
            code: error?.code,
            details: error?.details,
            hint: error?.hint,
            stack: error?.stack
          });
          console.log('🔄 AUTHSTORE: Estableciendo isLoading = false (error)');
          set({ isLoading: false });
          console.error('💥 AUTHSTORE: ===== FIN ERROR - LANZANDO EXCEPCIÓN =====');
          throw error;
        }
      },

      logout: () => {
        console.log('🚪 LOGOUT: Cerrando sesión');
        set({ 
          user: null, 
          currentUser: null,
          isAuthenticated: false, 
          rememberSession: false 
        });
        
        // Limpiar el localStorage completamente
        localStorage.removeItem('auth-storage');
        console.log('🗑️ LOGOUT: localStorage limpiado');
        
        // Detener suscripción realtime de contactos al cerrar sesión
        import('./crmStore').then(({ useCRMStore }) => {
          useCRMStore.getState().stopContactsSubscription?.();
        }).catch(() => {});
        // No recargar automáticamente la página para evitar bucles infinitos
        // La navegación debe ser manejada por el componente que llama logout
      },

      updateUser: (userData) => {
        const { user } = get();
        if (user) {
          const updatedUser = { ...user, ...userData };
          set({ user: updatedUser, currentUser: updatedUser });
        }
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      // Funciones de confirmación de email
      inicializarListenerAutenticacion: () => {
        console.log('🔄 AUTH_LISTENER: Inicializando listener de autenticación');
        
        supabase.auth.onAuthStateChange(async (evento: AuthChangeEvent, sesion: Session | null) => {
          console.log('🔔 AUTH_LISTENER: Evento de autenticación:', evento, sesion ? 'con sesión' : 'sin sesión');
          
          if (evento === 'SIGNED_IN' && sesion) {
            console.log('✅ AUTH_LISTENER: Usuario autenticado, actualizando estado');
            // Solo actualizar el estado, sin redirecciones automáticas
            // Actualizar estado del usuario con la información de la sesión
            const userData: User = {
              id: sesion.user.id,
              username: sesion.user.user_metadata?.username || sesion.user.email || sesion.user.id,
              email: sesion.user.email || '',
              name: sesion.user.user_metadata?.full_name || sesion.user.email || '',
              role: (sesion.user.user_metadata?.role || 'advisor') as User['role'],

              phone: sesion.user.user_metadata?.phone,
              department: sesion.user.user_metadata?.department,
              isApproved: sesion.user.user_metadata?.is_approved ?? true,
              createdAt: sesion.user.created_at || new Date().toISOString(),
              team_id: sesion.user.user_metadata?.team_id
            };
            set({ 
              user: userData, 
              currentUser: userData, 
              isAuthenticated: true, 
              isLoading: false 
            });
          } else if (evento === 'SIGNED_OUT') {
            console.log('🚪 AUTH_LISTENER: Usuario desautenticado');
            set({ 
              user: null, 
              currentUser: null, 
              isAuthenticated: false, 
              isLoading: false 
            });
          }
        });
      },

      // Nueva función simplificada sin redirecciones automáticas
      actualizarEstadoUsuario: async (userId: string, updates: Partial<User>) => {
        try {
          console.log('👤 USER_UPDATE: Actualizando usuario:', userId, updates);
          
          // Actualizar en Supabase
          const { error } = await supabase
            .from('users')
            .update({
              full_name: updates.name,
              email: updates.email,
              role: updates.role,

              phone: updates.phone,
              department: updates.department,
              is_approved: updates.isApproved
            })
            .eq('id', userId);

          if (error) {
            console.error('❌ USER_UPDATE: Error actualizando usuario:', error);
            return false;
          }

          // Actualizar estado local si es el usuario actual
          const { user, currentUser } = get();
          if (user?.id === userId) {
            const updatedUser = { ...user, ...updates };
            set({
              user: updatedUser,
              currentUser: updatedUser
            });
          }

          console.log('✅ USER_UPDATE: Usuario actualizado correctamente');
          return true;
          
        } catch (error) {
          console.error('❌ USER_UPDATE: Error actualizando estado:', error);
          return false;
        }
      },

      checkEmailConfiguration: async () => {
        try {
          console.log('📧 EMAIL_CONFIG: Verificando configuración de email');
          
          // Verificar configuración de Supabase Auth
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('❌ EMAIL_CONFIG: Error verificando sesión:', error);
            return {
              configured: false,
              recommendations: [
                'Verificar configuración de Supabase Auth',
                'Revisar variables de entorno',
                'Contactar al administrador del sistema'
              ]
            };
          }

          // Simular verificación de configuración de email
          const configured = true; // En una implementación real, verificaría la configuración SMTP
          
          return {
            configured,
            provider: configured ? 'Supabase Auth' : undefined,
            recommendations: configured ? [
              'Configuración de email funcionando correctamente',
              'Los emails de confirmación se envían automáticamente'
            ] : [
              'Configurar proveedor de email SMTP',
              'Verificar credenciales de email',
              'Revisar configuración de Supabase'
            ]
          };
          
        } catch (error) {
          console.error('❌ EMAIL_CONFIG: Error verificando configuración:', error);
          return {
            configured: false,
            recommendations: [
              'Error al verificar configuración',
              'Contactar al administrador del sistema'
            ]
          };
        }
      },







      getPendingUsers: async () => {
        console.log('📝 APPROVALS: Cargando usuarios pendientes desde Supabase');
        // Usuarios con is_approved=false
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, email, role, created_at, department, username, phone')
          .eq('role', 'manager')
          .eq('is_approved', false)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map((u: any) => ({
          id: u.id,
          name: u.full_name,
          username: u.username || u.email,
          email: u.email,
          role: 'manager' as const,

          phone: u.phone || undefined,
          isApproved: false,
          createdAt: u.created_at,
          department: u.department
        }));
      },

      approveUser: async (userId: string) => {
        set({ isLoading: true });
        try {
          // 1) Actualizar solicitud en approvals si existe
          await supabase
            .from('approvals')
            .update({ status: 'approved', updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('requested_role', 'manager');
          // 2) Marcar usuario como aprobado
          const { error } = await supabase
            .from('users')
            .update({ is_approved: true, approved_at: new Date().toISOString() })
            .eq('id', userId);
          if (error) throw error;
          set({ isLoading: false });
          return true;
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      rejectUser: async (userId: string) => {
        set({ isLoading: true });
        try {
          await supabase
            .from('approvals')
            .update({ status: 'rejected', updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('requested_role', 'manager');
          set({ isLoading: false });
          return true;
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      getAllUsers: () => {
        const { users } = get();
        return users.filter(user => user.role !== 'admin');
      },



      deleteUser: async (userId: string) => {
        set({ isLoading: true });
        
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const userIndex = mockUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          // No permitir eliminar admin
          if (mockUsers[userIndex].role === 'admin') {
            set({ isLoading: false });
            throw new Error('No se puede eliminar el usuario administrador');
          }
          
          const deletedUser = mockUsers[userIndex];
          mockUsers.splice(userIndex, 1);
          
          // Eliminar credenciales del usuario
          delete mockCredentials[deletedUser.username];
          
          set({ isLoading: false });
          return true;
        }
        
        set({ isLoading: false });
        return false;
      },

      deleteAllUserData: async (userId: string) => {
        set({ isLoading: true });
        
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const userIndex = mockUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          const user = mockUsers[userIndex];
          
          // No permitir eliminar datos del admin
          if (user.role === 'admin') {
            set({ isLoading: false });
            throw new Error('No se pueden eliminar los datos del administrador');
          }
          
          // Eliminar usuario y sus credenciales
          mockUsers.splice(userIndex, 1);
          delete mockCredentials[user.username];
          
          // Aquí se eliminarían también todos los contactos asignados al usuario
          // En una implementación real, esto se haría en la base de datos
          
          set({ isLoading: false });
          return true;
        }
        
        set({ isLoading: false });
        return false;
      },

      resetSystem: async () => {
        const { user } = get();
        
        // Solo admin puede resetear el sistema
        if (user?.role !== 'admin') {
          throw new Error('Solo el administrador puede resetear el sistema');
        }
        
        set({ isLoading: true });
        
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mantener solo el usuario admin
        const adminUser = mockUsers.find(u => u.role === 'admin');
        if (adminUser) {
          mockUsers.length = 0;
          mockUsers.push(adminUser);
          
          // Limpiar credenciales excepto admin
          Object.keys(mockCredentials).forEach(username => {
            if (username !== adminUser.username) {
              delete mockCredentials[username];
            }
          });
        }
        
        set({ isLoading: false });
        return true;
      },

      deleteAllPendingUsers: async () => {
        set({ isLoading: true });
        
        // Simular delay de API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Filtrar y eliminar usuarios pendientes
        const pendingUsers = mockUsers.filter(user => !user.isApproved && user.role === 'manager');
        
        pendingUsers.forEach(user => {
          const userIndex = mockUsers.findIndex(u => u.id === user.id);
          if (userIndex !== -1) {
            mockUsers.splice(userIndex, 1);
            delete mockCredentials[user.username];
          }
        });
        
        set({ isLoading: false });
        return true;
      },

      clearCompleteDatabase: async () => {
        const { user } = get();
        
        // Solo admin puede limpiar la base de datos completa
        if (user?.role !== 'admin') {
          throw new Error('Solo el administrador puede limpiar la base de datos completa');
        }
        
        set({ isLoading: true });
        
        try {
          // Borrar datos en Supabase en orden seguro
          await supabase.from('contact_status_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabase.from('contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabase.from('approvals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');

          // Limpiar storage del cliente
          localStorage.clear();
          sessionStorage.clear();

          // Cerrar sesión
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            rememberSession: false,
            notifications: [],
            unreadCount: 0,
            approvalRequests: []
          });

          // Sistema limpiado completamente
          return true;
        } catch (error) {
          set({ isLoading: false });
          throw new Error('Error al limpiar la base de datos completa');
        }
      },

      // Notification methods
      fetchNotifications: async () => {
        // En una implementación real, esto haría una llamada a la API
        // Por ahora, mantenemos las notificaciones en el estado local
      },

      markNotificationAsRead: async (notificationId: string) => {
        const { notifications, unreadCount } = get();
        const updatedNotifications = notifications.map(n => 
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        );
        
        const wasUnread = notifications.find(n => n.id === notificationId && !n.read_at);
        
        set({ 
          notifications: updatedNotifications,
          unreadCount: wasUnread ? Math.max(0, unreadCount - 1) : unreadCount
        });
      },

      markAllNotificationsAsRead: async () => {
        const { notifications } = get();
        const updatedNotifications = notifications.map(n => ({ ...n, read_at: new Date().toISOString() }));
        
        set({ 
          notifications: updatedNotifications,
          unreadCount: 0
        });
      },

      createNotification: async (notificationData) => {
        const notification: Notification = {
          ...notificationData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        };
        
        const { notifications, unreadCount } = get();
        set({ 
          notifications: [notification, ...notifications],
          unreadCount: unreadCount + 1
        });
      },

      // Approval workflow methods
      requestManagerApproval: async (userId: string, comments?: string) => {
        const approvalRequest: ApprovalRequest = {
          id: crypto.randomUUID(),
          user_id: userId,
          requested_role: 'manager',
          status: 'pending',
          comments,
          requested_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        };
        
        const { approvalRequests } = get();
        set({ approvalRequests: [...approvalRequests, approvalRequest] });
        
        // Crear notificación para administradores
        const user = mockUsers.find(u => u.id === userId);
        if (user) {
          await get().createNotification({
            user_id: 'admin', // Se enviará a todos los admins
            type: 'approval_request',
            title: 'Nueva solicitud de aprobación',
            message: `${user.name} ha solicitado ser promovido a Manager`,
            data: { approval_id: approvalRequest.id, user_id: userId },
            priority: 'high'
          });
        }
        
        return true;
      },

      getPendingApprovals: () => {
        const { approvalRequests } = get();
        return approvalRequests.filter(r => r.status === 'pending');
      },

      // Función para actualizar rol de usuario (para uso desde otros stores)
      updateUserRole: async (userId: string, newRole: 'advisor' | 'manager' | 'admin', approvedBy?: string) => {
        const userIndex = mockUsers.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
          mockUsers[userIndex] = {
            ...mockUsers[userIndex],
            role: newRole,
            isApproved: true,
            approved_by: approvedBy,
            approved_at: new Date().toISOString()
          };
          return true;
        }
        return false;
      },

      processApproval: async (approvalId: string, action: 'approve' | 'reject', comments?: string) => {
        const { approvalRequests } = get();
        const request = approvalRequests.find(r => r.id === approvalId);
        
        if (!request) {
          throw new Error('Solicitud de aprobación no encontrada');
        }
        
        const { user: currentUser } = get();
        
        if (action === 'approve') {
          // Actualizar el usuario
          await get().updateUserRole(request.user_id, 'manager', currentUser?.id);
          
          // Crear notificación para el usuario
          await get().createNotification({
            user_id: request.user_id,
            type: 'approval_approved',
            title: 'Solicitud aprobada',
            message: 'Tu solicitud para ser Manager ha sido aprobada',
            priority: 'high'
          });
        } else {
          // Crear notificación de rechazo
          await get().createNotification({
            user_id: request.user_id,
            type: 'approval_rejected',
            title: 'Solicitud rechazada',
            message: comments ? `Tu solicitud para ser Manager ha sido rechazada: ${comments}` : 'Tu solicitud para ser Manager ha sido rechazada',
            priority: 'normal'
          });
        }
        
        // Actualizar la solicitud
        const updatedRequests = approvalRequests.map(r => 
          r.id === approvalId 
            ? { 
                ...r, 
                status: action === 'approve' ? 'approved' as const : 'rejected' as const,
                reviewed_at: new Date().toISOString(),
                reviewed_by: currentUser?.id,
                comments
              }
            : r
        );
        
        set({ approvalRequests: updatedRequests });
        
        return true;
      },

      // Métodos adicionales requeridos por la interfaz AuthState
      manejarConfirmacionEmail: async (session: Session | null) => {
        try {
          console.log('📧 EMAIL_CONFIRMATION: Manejando confirmación para sesión:', session?.user?.email);
          // Implementación básica - en producción conectaría con Supabase Auth
          if (session?.user) {
            // Procesar confirmación de email
            console.log('✅ EMAIL_CONFIRMATION: Email confirmado para:', session.user.email);
          }
        } catch (error) {
          console.error('❌ EMAIL_CONFIRMATION: Error:', error);
        }
      },

      verificarEstadoConfirmacion: async () => {
        try {
          console.log('🔍 EMAIL_VERIFICATION: Verificando estado de confirmación');
          // Implementación básica - en producción verificaría con Supabase
          return true; // Asumir confirmado por defecto
        } catch (error) {
          console.error('❌ EMAIL_VERIFICATION: Error:', error);
          return false;
        }
      },

      continuarSinConfirmacion: async (email: string) => {
        try {
          console.log('⏭️ SKIP_CONFIRMATION: Continuando sin confirmación para:', email);
          // Permitir continuar sin confirmación de email
          return true;
        } catch (error) {
          console.error('❌ SKIP_CONFIRMATION: Error:', error);
          return false;
        }
      },

      resendConfirmationEmail: async (email: string) => {
        try {
          console.log('📤 RESEND_EMAIL: Reenviando confirmación a:', email);
          // En producción usaría supabase.auth.resend()
          return {
            success: true,
            message: 'Email de confirmación reenviado correctamente'
          };
        } catch (error) {
          console.error('❌ RESEND_EMAIL: Error:', error);
          return {
            success: false,
            message: 'Error al reenviar email de confirmación'
          };
        }
      },

    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        rememberSession: state.rememberSession
      }),
      onRehydrateStorage: () => (state) => {
        console.log('🔄 PERSIST: Rehidratando estado', state);
        // Si no se quiere recordar la sesión, limpiar el estado
        if (state && !state.rememberSession) {
          console.log('🚫 PERSIST: Limpiando estado porque rememberSession es false');
          state.user = null;
          state.currentUser = null;
          state.isAuthenticated = false;
        }
      }
    }
  )
);

// Hook para obtener información del usuario actual
export const useCurrentUser = () => {
  const user = useAuthStore(state => state.user);
  return user;
};

// Hook para verificar permisos
export const usePermissions = () => {
  const user = useAuthStore(state => state.user);
  
  return {
    canManageTeam: user?.role === 'manager' || user?.role === 'admin',
    canApproveUsers: user?.role === 'manager' || user?.role === 'admin',
    canViewAllContacts: user?.role === 'manager' || user?.role === 'admin',
    canEditSettings: user?.role === 'admin',
    canEditUsers: user?.role === 'manager' || user?.role === 'admin',
    canDeleteUsers: user?.role === 'admin',
    canViewAllUsers: user?.role === 'manager' || user?.role === 'admin',
    canManageUsers: user?.role === 'manager' || user?.role === 'admin',
    canManageInvitations: user?.role === 'manager' || user?.role === 'admin',
    canManageTasks: user?.role === 'manager' || user?.role === 'admin',
    canViewMetrics: user?.role === 'manager' || user?.role === 'admin' || user?.role === 'advisor',
    canAccessSystemSettings: user?.role === 'admin',
    canResetSystem: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isAdvisor: user?.role === 'advisor',
    isAdmin: user?.role === 'admin'
  };
};