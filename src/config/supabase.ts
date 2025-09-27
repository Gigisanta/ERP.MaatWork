import { createClient } from '@supabase/supabase-js';

// Configuración usando variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NDIyMDAsImV4cCI6MjA3MjUxODIwMH0.15QzSTr9KrkaBxuTptDjpusCXdv2CWCdA3gRI7WW0a8';

// Verificar que las variables de entorno estén configuradas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  console.log('📝 Asegúrate de tener un archivo .env.local con:');
  console.log('   VITE_SUPABASE_URL=tu_url_de_supabase');
  console.log('   VITE_SUPABASE_ANON_KEY=tu_clave_anon_de_supabase');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Log de configuración para debugging
console.log('🔧 Supabase configurado:', {
  url: supabaseUrl ? '✅ URL configurada' : '❌ URL faltante',
  key: supabaseAnonKey ? '✅ Clave configurada' : '❌ Clave faltante'
});

// Tipos para la base de datos
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'admin' | 'manager' | 'advisor';
          status: 'active' | 'inactive' | 'pending';
          phone?: string;
          avatar_url?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          role?: 'admin' | 'manager' | 'advisor';
          status?: 'active' | 'inactive' | 'pending';
          phone?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'admin' | 'manager' | 'advisor';
          status?: 'active' | 'inactive' | 'pending';
          phone?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          name: string;
          description?: string;
          manager_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          manager_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          manager_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: 'manager' | 'advisor';
          joined_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          role: 'manager' | 'advisor';
          joined_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string;
          role?: 'manager' | 'advisor';
          joined_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description?: string;
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          priority: 'low' | 'medium' | 'high';
          assigned_to: string;
          assigned_by: string;
          due_date?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          priority?: 'low' | 'medium' | 'high';
          assigned_to: string;
          assigned_by: string;
          due_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          priority?: 'low' | 'medium' | 'high';
          assigned_to?: string;
          assigned_by?: string;
          due_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          email: string;
          role: 'advisor' | 'manager';
          team_id: string;
          invited_by: string;
          status: 'pending' | 'accepted' | 'rejected' | 'expired';
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role: 'advisor' | 'manager';
          team_id: string;
          invited_by: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'expired';
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'advisor' | 'manager';
          team_id?: string;
          invited_by?: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'expired';
          expires_at?: string;
          created_at?: string;
        };
      };
      approval_requests: {
        Row: {
          id: string;
          user_id: string;
          requested_role: 'advisor' | 'manager';
          status: 'pending' | 'approved' | 'rejected';
          request_message?: string;
          reviewed_by?: string;
          reviewed_at?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          requested_role: 'advisor' | 'manager';
          status?: 'pending' | 'approved' | 'rejected';
          request_message?: string;
          reviewed_by?: string;
          reviewed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          requested_role?: 'advisor' | 'manager';
          status?: 'pending' | 'approved' | 'rejected';
          request_message?: string;
          reviewed_by?: string;
          reviewed_at?: string;
          created_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          name: string;
          email?: string;
          phone: string;
          company: string;
          status: string;
          stage?: string;
          assigned_to: string;
          value: number;
          notes: any;
          tags?: string[];
          last_contact_date?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string;
          phone: string;
          company: string;
          status?: string;
          stage?: string;
          assigned_to: string;
          value?: number;
          notes?: any;
          tags?: string[];
          last_contact_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string;
          company?: string;
          status?: string;
          stage?: string;
          assigned_to?: string;
          value?: number;
          notes?: any;
          tags?: string[];
          last_contact_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      contact_tags: {
        Row: {
          id: string;
          name: string;
          color: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          color: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          color?: string;
          user_id?: string;
          created_at?: string;
        };
      };
    };
  };
}