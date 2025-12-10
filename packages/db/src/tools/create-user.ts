import { db, users } from '../index';

async function createUser() {
  try {
    console.log('\n🔐 Creando usuario de prueba...\n');

    const [newUser] = await db()
      .insert(users)
      .values({
        email: 'test@example.com',
        fullName: 'Usuario de Prueba',
        role: 'admin',
        isActive: true,
      })
      .returning();

    console.log('✅ Usuario creado exitosamente!');
    console.log(`  ID: ${newUser.id}`);
    console.log(`  Email: ${newUser.email}`);
    console.log(`  Nombre: ${newUser.fullName}`);
    console.log(`  Role: ${newUser.role}\n`);

    console.log('📝 Para hacer login:');
    console.log('   1. Ve a http://localhost:3000');
    console.log('   2. Haz login con: test@example.com');
    console.log('   3. No necesitas contraseña\n');

    process.exit(0);
  } catch (err: unknown) {
    type ErrorWithMessage = {
      message?: string;
    };
    const error = err as ErrorWithMessage;
    if (error.message && error.message.includes('duplicate key')) {
      console.log('ℹ️  El usuario ya existe!');
      console.log('   Email: test@example.com\n');
      process.exit(0);
    }
    console.error('❌ Error:', error.message || err);
    process.exit(1);
  }
}

createUser();
