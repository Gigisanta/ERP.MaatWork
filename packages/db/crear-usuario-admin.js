const { Client } = require('pg');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

async function crearUsuarioAdmin() {
  console.log('👤 Configurando usuario administrador...\n');

  let databaseUrl = null;
  
  try {
    const envPath = path.join(__dirname, '../../.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/DATABASE_URL=(.+)/);
    if (match) {
      databaseUrl = match[1];
    }
  } catch (error) {
    console.log('❌ Error leyendo archivo .env');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    // Crear hash de contraseña para "admin123"
    const password = 'admin123';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    const passwordHash = `${salt}:${hash}`;

    // Verificar si el usuario admin ya existe
    const existingAdmin = await client.query('SELECT id FROM users WHERE email = $1', ['admin@cactus.com']);
    
    if (existingAdmin.rows.length > 0) {
      // Actualizar usuario existente
      await client.query(`
        UPDATE users 
        SET "passwordHash" = $1, "updatedAt" = now()
        WHERE email = $2
      `, [passwordHash, 'admin@cactus.com']);
      console.log('✅ Usuario admin actualizado');
    } else {
      // Crear nuevo usuario admin
      await client.query(`
        INSERT INTO users (email, "fullName", role, "passwordHash", "isActive") 
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin@cactus.com', 'Administrador', 'admin', passwordHash, true]);
      console.log('✅ Usuario admin creado');
    }

    // Crear usuario asesor de prueba
    const asesorPassword = 'asesor123';
    const asesorSalt = crypto.randomBytes(16).toString('hex');
    const asesorHash = crypto.pbkdf2Sync(asesorPassword, asesorSalt, 10000, 64, 'sha512').toString('hex');
    const asesorPasswordHash = `${asesorSalt}:${asesorHash}`;

    const existingAsesor = await client.query('SELECT id FROM users WHERE email = $1', ['asesor@cactus.com']);
    
    if (existingAsesor.rows.length > 0) {
      await client.query(`
        UPDATE users 
        SET "passwordHash" = $1, "updatedAt" = now()
        WHERE email = $2
      `, [asesorPasswordHash, 'asesor@cactus.com']);
      console.log('✅ Usuario asesor actualizado');
    } else {
      await client.query(`
        INSERT INTO users (email, "fullName", role, "passwordHash", "isActive") 
        VALUES ($1, $2, $3, $4, $5)
      `, ['asesor@cactus.com', 'Asesor de Prueba', 'advisor', asesorPasswordHash, true]);
      console.log('✅ Usuario asesor creado');
    }

    // Verificar usuarios creados
    const usuarios = await client.query(`
      SELECT email, "fullName", role, "isActive" 
      FROM users 
      ORDER BY "createdAt"
    `);

    console.log('\n👥 Usuarios disponibles:');
    usuarios.rows.forEach(user => {
      console.log(`  📧 ${user.email}`);
      console.log(`     Nombre: ${user.fullName}`);
      console.log(`     Rol: ${user.role}`);
      console.log(`     Activo: ${user.isActive ? 'Sí' : 'No'}`);
      console.log('');
    });

    await client.end();

    console.log('🎉 Usuarios configurados exitosamente!');
    console.log('\n🔐 Credenciales de acceso:');
    console.log('📧 Admin: admin@cactus.com');
    console.log('🔑 Password: admin123');
    console.log('');
    console.log('📧 Asesor: asesor@cactus.com');
    console.log('🔑 Password: asesor123');
    console.log('\n🌐 Acceder a: http://localhost:3005');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

crearUsuarioAdmin();



