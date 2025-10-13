import { db, users } from './src/index';

async function checkUsers() {
  try {
    console.log('Usuarios en la base de datos:\n');
    
    const allUsers = await db()
      .select({
        email: users.email,
        fullName: users.fullName,
        role: users.role
      })
      .from(users);
    
    if (allUsers.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
    } else {
      console.table(allUsers);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkUsers();


