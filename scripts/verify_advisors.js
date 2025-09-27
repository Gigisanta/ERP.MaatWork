// Script para verificar el estado de los advisors creados
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const expectedEmails = [
  'mvicente@grupoabax.com',
  'nzappia@grupoabax.com', 
  'tdanziger@grupoabax.com',
  'pmolina@grupoabax.com',
  'ningilde@grupoabax.com',
  'fandreacchio@grupoabax.com'
];

async function verifyAdvisors() {
  console.log('🔍 Verificando estado de los advisors...');
  
  const { data: users, error } = await supabase
    .from('users')
    .select('email, full_name, role, is_approved')
    .eq('role', 'advisor')
    .in('email', expectedEmails);

  if (error) {
    console.error('❌ Error verificando usuarios:', error.message);
    return;
  }

  console.log('\n📋 Estado final de todos los usuarios advisor:');
  users.forEach(user => {
    console.log(`✅ ${user.full_name} <${user.email}> - Rol: ${user.role} - Aprobado: ${user.is_approved}`);
  });

  console.log(`\n📊 Total usuarios advisor encontrados: ${users.length}/6`);
  
  // Mostrar cuáles faltan
  const foundEmails = users.map(u => u.email);
  const missingEmails = expectedEmails.filter(email => !foundEmails.includes(email));
  
  if (missingEmails.length > 0) {
    console.log('\n⚠️ Usuarios faltantes:');
    missingEmails.forEach(email => console.log(`- ${email}`));
  } else {
    console.log('\n🎉 ¡Todos los usuarios advisor están registrados!');
  }
}

verifyAdvisors().catch(console.error);