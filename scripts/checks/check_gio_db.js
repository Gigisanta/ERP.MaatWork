import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkGioStatus() {
  console.log('🔍 Verificando estado del usuario gio...');
  
  try {
    // Consultar usuario gio
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .or(`email.ilike.%gio%,full_name.ilike.%gio%,id.eq.550e8400-e29b-41d4-a716-446655440000`);
    
    if (usersError) {
      console.error('❌ Error consultando usuarios:', usersError);
      return;
    }
    
    console.log('\n📊 USUARIOS ENCONTRADOS:');
    console.log('========================');
    if (users && users.length > 0) {
      users.forEach(user => {
        console.log(`ID: ${user.id}`);
        console.log(`Email: ${user.email}`);
        console.log(`Nombre: ${user.full_name}`);
        console.log(`Rol: ${user.role}`);
        console.log(`Aprobado: ${user.is_approved}`);
        console.log(`Creado: ${user.created_at}`);
        console.log(`Actualizado: ${user.updated_at}`);
        console.log(`Aprobado por: ${user.approved_by}`);
        console.log(`Fecha aprobación: ${user.approved_at}`);
        console.log('------------------------');
      });
    } else {
      console.log('❌ No se encontraron usuarios con "gio"');
    }
    
    // Consultar aprobaciones relacionadas
    const { data: approvals, error: approvalsError } = await supabase
      .from('approvals')
      .select(`
        *,
        users!approvals_user_id_fkey(email, full_name)
      `)
      .or(`user_id.eq.550e8400-e29b-41d4-a716-446655440000`);
    
    if (approvalsError) {
      console.error('❌ Error consultando aprobaciones:', approvalsError);
      return;
    }
    
    console.log('\n📋 APROBACIONES RELACIONADAS:');
    console.log('=============================');
    if (approvals && approvals.length > 0) {
      approvals.forEach(approval => {
        console.log(`ID: ${approval.id}`);
        console.log(`Usuario ID: ${approval.user_id}`);
        console.log(`Estado: ${approval.status}`);
        console.log(`Rol solicitado: ${approval.requested_role}`);
        console.log(`Rol actual: ${approval.current_role}`);
        console.log(`Creado: ${approval.created_at}`);
        console.log(`Email usuario: ${approval.users?.email}`);
        console.log('------------------------');
      });
    } else {
      console.log('ℹ️ No se encontraron aprobaciones para el usuario gio');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkGioStatus();