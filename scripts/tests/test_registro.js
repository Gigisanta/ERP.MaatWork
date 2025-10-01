// Script de prueba para verificar el registro de managers
import { supabase } from './src/config/supabase.js';

async function probarRegistroManager() {
  console.log('🧪 PRUEBA: Iniciando prueba de registro de manager');
  
  try {
    // Datos de prueba para un manager
    const datosManager = {
      name: 'Manager Prueba',
      username: 'manager_test',
      email: 'manager.prueba@test.com',
      password: 'TestPassword123!',
      role: 'manager',
      phone: '+1234567890',
      department: 'Ventas',
      justification: 'Solicitud de prueba para verificar el sistema'
    };
    
    console.log('📊 PRUEBA: Datos del manager:', {
      name: datosManager.name,
      email: datosManager.email,
      role: datosManager.role
    });
    
    // Paso 1: Crear usuario en Supabase Auth
    console.log('🔐 PRUEBA: Creando usuario en Auth...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: datosManager.email,
      password: datosManager.password,
      options: {
        data: {
          full_name: datosManager.name,
          username: datosManager.username,
          role: datosManager.role
        }
      }
    });
    
    if (authError) {
      console.error('❌ PRUEBA: Error en Auth:', authError);
      return false;
    }
    
    console.log('✅ PRUEBA: Usuario creado en Auth:', authData.user.id);
    
    // Esperar para que la sesión se establezca
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Paso 2: Crear perfil en tabla users
    console.log('👤 PRUEBA: Creando perfil en tabla users...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: datosManager.email,
        full_name: datosManager.name,
        role: datosManager.role,
        phone: datosManager.phone,
        department: datosManager.department,
        is_approved: false, // Managers requieren aprobación
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (userError) {
      console.error('❌ PRUEBA: Error creando perfil:', userError);
      console.error('❌ PRUEBA: Detalles:', {
        code: userError.code,
        message: userError.message,
        details: userError.details,
        hint: userError.hint
      });
      return false;
    }
    
    console.log('✅ PRUEBA: Perfil creado:', userData.id);
    
    // Paso 3: Crear solicitud de aprobación
    console.log('📝 PRUEBA: Creando solicitud de aprobación...');
    const { data: approvalData, error: approvalError } = await supabase
      .from('approvals')
      .insert({
        user_id: authData.user.id,
        requested_role: 'manager',
        status: 'pending',
        comments: datosManager.justification,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (approvalError) {
      console.error('❌ PRUEBA: Error creando solicitud:', approvalError);
      console.error('❌ PRUEBA: Detalles:', {
        code: approvalError.code,
        message: approvalError.message,
        details: approvalError.details,
        hint: approvalError.hint
      });
      return false;
    }
    
    console.log('✅ PRUEBA: Solicitud creada:', approvalData.id);
    
    // Verificar que los datos se guardaron correctamente
    console.log('🔍 PRUEBA: Verificando datos guardados...');
    
    const { data: verificarUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();
      
    const { data: verificarApproval } = await supabase
      .from('approvals')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();
    
    console.log('📊 PRUEBA: Usuario verificado:', {
      id: verificarUser?.id,
      email: verificarUser?.email,
      role: verificarUser?.role,
      is_approved: verificarUser?.is_approved
    });
    
    console.log('📊 PRUEBA: Solicitud verificada:', {
      id: verificarApproval?.id,
      user_id: verificarApproval?.user_id,
      status: verificarApproval?.status,
      requested_role: verificarApproval?.requested_role
    });
    
    console.log('🎉 PRUEBA: ¡Registro de manager completado exitosamente!');
    return true;
    
  } catch (error) {
    console.error('💥 PRUEBA: Error general:', error);
    return false;
  }
}

// Ejecutar la prueba
probarRegistroManager()
  .then(resultado => {
    if (resultado) {
      console.log('✅ RESULTADO: La prueba fue exitosa');
    } else {
      console.log('❌ RESULTADO: La prueba falló');
    }
  })
  .catch(error => {
    console.error('💥 RESULTADO: Error ejecutando prueba:', error);
  });