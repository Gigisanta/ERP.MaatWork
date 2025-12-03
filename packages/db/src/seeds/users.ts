/**
 * Seed Users
 * 
 * Seeds admin, manager, and advisor users
 */

import { db } from '../index';
import { users } from '../schema';
import { eq, type InferSelectModel } from 'drizzle-orm';
import { hashPassword } from './helpers';

/**
 * Seed users (admin, managers, advisors)
 */
export async function seedUsers() {
  console.log('👥 Seeding users...');

  const defaultPassword = 'password123';
  const hashedPassword = await hashPassword(defaultPassword);

  // Admin user
  const adminEmail = 'admin@grupoabax.com';
  const existingAdmin = await db().select().from(users).where(eq(users.email, adminEmail)).limit(1);
  let adminUser: InferSelectModel<typeof users>;
  
  if (existingAdmin.length === 0) {
    const [admin] = await db().insert(users).values({
      email: adminEmail,
      username: 'admin',
      usernameNormalized: 'admin',
      fullName: 'Admin User',
      role: 'admin',
      passwordHash: hashedPassword,
      isActive: true
    }).returning();
    adminUser = admin;
    console.log(`  ✓ Created admin: ${adminEmail}`);
  } else {
    adminUser = existingAdmin[0]!;
    console.log(`  ⊙ Admin already exists: ${adminEmail}`);
  }

  // Manager users
  const managerData = [
    { email: 'manager1@grupoabax.com', username: 'manager1', fullName: 'María González' },
    { email: 'manager2@grupoabax.com', username: 'manager2', fullName: 'Carlos Rodríguez' },
    { email: 'manager3@grupoabax.com', username: 'manager3', fullName: 'Ana Martínez' }
  ];

  const managerUsers: InferSelectModel<typeof users>[] = [adminUser];
  for (const manager of managerData) {
    const existing = await db().select().from(users).where(eq(users.email, manager.email)).limit(1);
    if (existing.length === 0) {
      const [created] = await db().insert(users).values({
        email: manager.email,
        username: manager.username,
        usernameNormalized: manager.username.toLowerCase(),
        fullName: manager.fullName,
        role: 'manager',
        passwordHash: hashedPassword,
        isActive: true
      }).returning();
      managerUsers.push(created);
      console.log(`  ✓ Created manager: ${manager.email}`);
    } else {
      managerUsers.push(existing[0]!);
      console.log(`  ⊙ Manager already exists: ${manager.email}`);
    }
  }

  // Advisor users
  const advisorData = [
    { email: 'advisor1@grupoabax.com', username: 'advisor1', fullName: 'Juan Pérez' },
    { email: 'advisor2@grupoabax.com', username: 'advisor2', fullName: 'Laura Sánchez' },
    { email: 'advisor3@grupoabax.com', username: 'advisor3', fullName: 'Diego Fernández' },
    { email: 'advisor4@grupoabax.com', username: 'advisor4', fullName: 'Sofía López' },
    { email: 'advisor5@grupoabax.com', username: 'advisor5', fullName: 'Miguel Gómez' },
    { email: 'advisor6@grupoabax.com', username: 'advisor6', fullName: 'Camila Martínez' },
    { email: 'advisor7@grupoabax.com', username: 'advisor7', fullName: 'Pedro Ruiz' },
    { email: 'advisor8@grupoabax.com', username: 'advisor8', fullName: 'Valentina Díaz' }
  ];

  const advisorUsers: InferSelectModel<typeof users>[] = [];
  for (const advisor of advisorData) {
    const existing = await db().select().from(users).where(eq(users.email, advisor.email)).limit(1);
    if (existing.length === 0) {
      const [created] = await db().insert(users).values({
        email: advisor.email,
        username: advisor.username,
        usernameNormalized: advisor.username.toLowerCase(),
        fullName: advisor.fullName,
        role: 'advisor',
        passwordHash: hashedPassword,
        isActive: true
      }).returning();
      advisorUsers.push(created);
      console.log(`  ✓ Created advisor: ${advisor.email}`);
    } else {
      advisorUsers.push(existing[0]!);
      console.log(`  ⊙ Advisor already exists: ${advisor.email}`);
    }
  }

  console.log(`✅ Users seeded: 1 admin, ${managerUsers.length - 1} managers, ${advisorUsers.length} advisors\n`);
  
  return { adminUser, managerUsers, advisorUsers };
}





