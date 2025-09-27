import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function checkRLSStatus() {
  console.log('🔍 VERIFICANDO ESTADO DE RLS Y PERMISOS');
  console.log('============================================');
  
  try {
    // Verificar políticas RLS usando consulta SQL directa
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT 
            policyname,
            cmd,
            permissive,
            roles,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename = 'contacts'
          ORDER BY policyname;
        `
      });
    
    if (policiesError) {
      console.log('❌ Error al consultar políticas:', policiesError.message);
      
      // Método alternativo usando información del esquema
      const { data: altPolicies } = await supabase
        .from('information_schema.table_privileges')
        .select('*')
        .eq('table_name', 'contacts');
      
      console.log('📋 Permisos de tabla (método alternativo):', altPolicies);
    } else {
      console.log('📋 Políticas RLS encontradas:', policies);
    }
    
    // Verificar permisos usando consulta SQL
    const { data: grants, error: grantsError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT 
            grantee,
            table_name,
            privilege_type
          FROM information_schema.role_table_grants 
          WHERE table_schema = 'public' 
          AND table_name = 'contacts'
          AND grantee IN ('anon', 'authenticated')
          ORDER BY table_name, grantee;
        `
      });
    
    if (grantsError) {
      console.log('❌ Error al consultar permisos:', grantsError.message);
    } else {
      console.log('🔐 Permisos de roles:', grants);
    }
    
    // Verificar si RLS está habilitado
    const { data: rlsStatus, error: rlsError } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT 
            relname as table_name,
            relrowsecurity as rls_enabled,
            relforcerowsecurity as rls_forced
          FROM pg_class 
          WHERE relname = 'contacts';
        `
      });
    
    if (rlsError) {
      console.log('❌ Error al verificar RLS:', rlsError.message);
    } else {
      console.log('🛡️  Estado de RLS:', rlsStatus);
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.message);
  }
}

checkRLSStatus();