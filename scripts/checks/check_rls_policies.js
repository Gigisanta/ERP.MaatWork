import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pphrkrtjxwjvxokcwhjz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8'
);

console.log('🔍 VERIFICANDO PROBLEMA DE CONTACTOS MEZCLADOS');
console.log('=' .repeat(60));

// 1. Verificar contactos y sus asignaciones
const { data: contacts } = await supabase
  .from('contacts')
  .select('id, name, assigned_to')
  .limit(10);

console.log('\n📋 CONTACTOS EN PRODUCCIÓN:');
contacts.forEach(contact => {
  console.log(`- ${contact.name} -> assigned_to: ${contact.assigned_to}`);
});

// 2. Verificar usuarios reales
const { data: users } = await supabase
  .from('users')
  .select('id, email, full_name, role');

console.log('\n👥 USUARIOS REALES:');
users.forEach(user => {
  console.log(`- ${user.full_name} (${user.email}) -> ID: ${user.id} [${user.role}]`);
});

// 3. Verificar coincidencias
console.log('\n🔍 ANÁLISIS DE COINCIDENCIAS:');
const assignedIds = [...new Set(contacts.map(c => c.assigned_to).filter(Boolean))];
const userIds = users.map(u => u.id);

assignedIds.forEach(assignedId => {
  const isValidUser = userIds.includes(assignedId);
  const contactsWithThisId = contacts.filter(c => c.assigned_to === assignedId);
  console.log(`- ID ${assignedId}: ${isValidUser ? '✅ VÁLIDO' : '❌ INVÁLIDO'} (${contactsWithThisId.length} contactos)`);
  
  if (isValidUser) {
    const user = users.find(u => u.id === assignedId);
    console.log(`  Usuario: ${user.full_name} (${user.role})`);
  }
});

// 4. Verificar funciones RLS
console.log('\n🔧 VERIFICANDO FUNCIONES RLS:');
try {
  const { data: currentUserId } = await supabase.rpc('get_current_user_id');
  console.log('✅ get_current_user_id funciona:', currentUserId);
} catch (error) {
  console.log('❌ get_current_user_id ERROR:', error.message);
}

try {
  const { data: currentUserRole } = await supabase.rpc('get_current_user_role');
  console.log('✅ get_current_user_role funciona:', currentUserRole);
} catch (error) {
  console.log('❌ get_current_user_role ERROR:', error.message);
}

console.log('\n🎯 CONCLUSIÓN:');
const invalidAssignments = assignedIds.filter(id => !userIds.includes(id));
if (invalidAssignments.length > 0) {
  console.log('❌ PROBLEMA ENCONTRADO: Hay contactos asignados a IDs de usuarios inexistentes');
  console.log('🔧 SOLUCIÓN REQUERIDA: Actualizar assigned_to con IDs válidos o corregir políticas RLS');
} else {
  console.log('✅ Todas las asignaciones son válidas - el problema debe estar en las políticas RLS');
}

process.exit(0);