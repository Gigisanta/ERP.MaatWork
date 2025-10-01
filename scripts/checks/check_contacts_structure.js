import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkContactsTable() {
  console.log('🔍 VERIFICANDO TABLA CONTACTS');
  console.log('='.repeat(50));
  
  try {
    // Intentar hacer una consulta simple para ver si la tabla existe
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error al acceder a la tabla contacts:', error);
      
      if (error.code === 'PGRST205') {
        console.log('\n🚨 LA TABLA CONTACTS NO EXISTE');
        console.log('   Esto explica por qué no se pueden crear contactos.');
        
        // Verificar qué tablas existen
        console.log('\n📋 Verificando tablas disponibles...');
        const tables = ['users', 'teams', 'tasks', 'notifications', 'team_members'];
        
        for (const table of tables) {
          try {
            const { error: tableError } = await supabase
              .from(table)
              .select('id')
              .limit(1);
            
            if (tableError) {
              console.log(`   ❌ ${table}: NO EXISTE`);
            } else {
              console.log(`   ✅ ${table}: EXISTE`);
            }
          } catch (e) {
            console.log(`   ❌ ${table}: ERROR`);
          }
        }
      }
    } else {
      console.log('✅ Tabla contacts existe');
      console.log(`   Registros encontrados: ${data?.length || 0}`);
      
      if (data && data.length > 0) {
        console.log('\n📋 Estructura detectada (primer registro):');
        const firstRecord = data[0];
        Object.keys(firstRecord).forEach(key => {
          console.log(`   - ${key}: ${typeof firstRecord[key]}`);
        });
      }
      
      // Probar inserción con la estructura correcta
      console.log('\n🧪 PROBANDO INSERCIÓN DE CONTACTO');
      const testContact = {
        id: crypto.randomUUID(),
        name: 'Test Contact',
        email: `test-${Date.now()}@test.com`,
        phone: '+54911123456',
        company: 'Test Company',
        status: 'Prospecto',
        stage: 'initial',
        assigned_to: 'test-user-id',
        value: 0,
        notes: JSON.stringify([]),
        last_contact_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('contacts')
        .insert(testContact)
        .select();
      
      if (insertError) {
        console.error('❌ Error al insertar contacto de prueba:', insertError);
        console.error('   Código:', insertError.code);
        console.error('   Mensaje:', insertError.message);
        
        if (insertError.code === 'PGRST204') {
          console.log('\n🔍 COLUMNAS FALTANTES DETECTADAS');
          console.log('   El error indica que algunas columnas no existen en la tabla.');
        }
      } else {
        console.log('✅ Contacto de prueba insertado exitosamente');
        
        // Limpiar el contacto de prueba
        await supabase
          .from('contacts')
          .delete()
          .eq('id', testContact.id);
        console.log('🧹 Contacto de prueba eliminado');
      }
    }
  } catch (error) {
    console.error('💥 Error general:', error);
  }
}

checkContactsTable();