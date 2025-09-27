import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = 'https://pphrkrtjxwjvxokcwhjz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHJrcnRqeHdqdnhva2N3aGp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0MjIwMCwiZXhwIjoyMDcyNTE4MjAwfQ.qmxPrInJtCVjlJu4t4cegAvRadFlSBtST_uBXpEi5F8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkGioContacts() {
  console.log('📞 Verificando contactos del usuario gio...');
  
  try {
    // IDs de los usuarios gio
    const gioUserIds = [
      '856aaf16-6ab4-4da3-b672-01c8c545d760', // giolivosantarelli@gmail.com
      '28879afd-21c2-4877-b41d-775e987010cf', // gio@cactus.com
      '175f13d6-dd89-4e15-af28-f2020ed1e5d8'  // gio@test.com
    ];
    
    // Verificar si existe la tabla contacts
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'contacts');
    
    if (tablesError) {
      console.error('❌ Error verificando tablas:', tablesError);
      return;
    }
    
    if (!tables || tables.length === 0) {
      console.log('ℹ️ La tabla "contacts" no existe en la base de datos');
      
      // Verificar otras tablas relacionadas con contactos
      const { data: allTables, error: allTablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .like('table_name', '%contact%');
      
      if (allTablesError) {
        console.error('❌ Error obteniendo todas las tablas:', allTablesError);
        return;
      }
      
      console.log('\n📋 Tablas relacionadas con contactos encontradas:');
      if (allTables && allTables.length > 0) {
        allTables.forEach(table => {
          console.log(`- ${table.table_name}`);
        });
      } else {
        console.log('❌ No se encontraron tablas relacionadas con contactos');
      }
      return;
    }
    
    console.log('✅ Tabla "contacts" encontrada');
    
    // Consultar contactos para cada usuario gio
    for (const userId of gioUserIds) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.error(`❌ Error obteniendo usuario ${userId}:`, userError);
        continue;
      }
      
      console.log(`\n👤 Usuario: ${user.email} (${user.full_name})`);
      
      // Buscar contactos asignados a este usuario
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
      
      if (contactsError) {
        console.error(`❌ Error consultando contactos para ${userId}:`, contactsError);
        continue;
      }
      
      if (contacts && contacts.length > 0) {
        console.log(`📞 Contactos encontrados: ${contacts.length}`);
        contacts.slice(0, 3).forEach((contact, index) => {
          console.log(`   ${index + 1}. ${contact.name || contact.email || 'Sin nombre'} - Estado: ${contact.status || 'N/A'}`);
        });
        if (contacts.length > 3) {
          console.log(`   ... y ${contacts.length - 3} más`);
        }
      } else {
        console.log('ℹ️ No se encontraron contactos asignados');
      }
    }
    
    console.log('\n✅ Verificación de contactos completada!');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

checkGioContacts();