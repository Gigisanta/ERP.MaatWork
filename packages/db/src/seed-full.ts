/**
 * FULL Database Seeding Script
 * 
 * Seeds comprehensive test data for all app functionalities (except AUM).
 * Generates realistic data for testing: users, teams, contacts, tasks, notes,
 * portfolios, broker data, notifications, and more.
 * 
 * Can be run manually via: pnpm -F @cactus/db seed:full
 * 
 * REGLA CURSOR: This script is idempotent - safe to run multiple times
 * REGLA CURSOR: Does NOT seed AUM data (aumImportFiles, aumImportRows, etc.)
 */

import 'dotenv/config';
import bcrypt from 'bcrypt';
import { db } from './index';
import {
  users,
  teams,
  teamMembership,
  teamMembershipRequests,
  pipelineStages,
  contacts,
  pipelineStageHistory,
  tags,
  contactTags,
  tagRules,
  segments,
  segmentMembers,
  tasks,
  taskRecurrences,
  notes,
  noteTags,
  portfolioTemplates,
  portfolioTemplateLines,
  clientPortfolioAssignments,
  clientPortfolioOverrides,
  brokerAccounts,
  brokerBalances,
  brokerPositions,
  brokerTransactions,
  notifications,
  userChannelPreferences,
  monthlyGoals,
  capacitaciones,
  lookupTaskStatus,
  lookupPriority,
  lookupNotificationType,
  lookupAssetClass,
  instruments,
  notificationTemplates,
  activityEvents
} from './index';
import { eq, and, isNull, inArray, sql, type InferSelectModel } from 'drizzle-orm';

// ==========================================================
// Helper Functions
// ==========================================================

/**
 * Get a random element from an array
 */
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]!;
}

/**
 * Get multiple random elements from an array
 */
function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Generate a random date between daysAgo and daysFuture
 */
function getRandomDate(daysAgo: number, daysFuture: number = 0): Date {
  const now = new Date();
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const future = new Date(now.getTime() + daysFuture * 24 * 60 * 60 * 1000);
  const randomTime = past.getTime() + Math.random() * (future.getTime() - past.getTime());
  return new Date(randomTime);
}

/**
 * Generate a random date (date only, no time)
 */
function getRandomDateOnly(daysAgo: number, daysFuture: number = 0): string {
  const date = getRandomDate(daysAgo, daysFuture);
  return date.toISOString().split('T')[0]!;
}

/**
 * Generate random Argentine first name
 */
const ARGENTINE_FIRST_NAMES = [
  'Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Laura', 'Diego', 'Sofía',
  'Pedro', 'Valentina', 'Miguel', 'Camila', 'José', 'Martina', 'Fernando', 'Isabella',
  'Roberto', 'Lucía', 'Daniel', 'Emma', 'Andrés', 'Olivia', 'Javier', 'Sara',
  'Ricardo', 'Emma', 'Gustavo', 'Mía', 'Martín', 'Julia', 'Alejandro', 'Victoria',
  'Sergio', 'Andrea', 'Pablo', 'Gabriela', 'Francisco', 'Natalia', 'Rodrigo', 'Paula'
];

/**
 * Generate random Argentine last name
 */
const ARGENTINE_LAST_NAMES = [
  'García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez',
  'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Álvarez',
  'Muñoz', 'Romero', 'Alonso', 'Gutiérrez', 'Navarro', 'Torres', 'Domínguez', 'Vázquez',
  'Ramos', 'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Molina', 'Morales', 'Suárez',
  'Ortega', 'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Núñez'
];

function generateRandomName(): { firstName: string; lastName: string } {
  return {
    firstName: getRandomElement(ARGENTINE_FIRST_NAMES),
    lastName: getRandomElement(ARGENTINE_LAST_NAMES)
  };
}

/**
 * Generate random email
 */
function generateRandomEmail(firstName: string, lastName: string): string {
  const domains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'grupoabax.com'];
  const domain = getRandomElement(domains);
  const number = Math.floor(Math.random() * 1000);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${number}@${domain}`;
}

/**
 * Generate random Argentine phone number
 */
function generateRandomPhone(): string {
  const areaCodes = ['11', '15', '351', '341', '299', '387', '381', '385', '383', '381'];
  const areaCode = getRandomElement(areaCodes);
  const number = Math.floor(1000000 + Math.random() * 9000000);
  return `+54${areaCode}${number}`;
}

/**
 * Generate random Argentine DNI
 */
function generateRandomDNI(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// ==========================================================
// Dependency Checking
// ==========================================================

/**
 * Ensure dependencies exist (pipeline stages, lookup tables, instruments)
 */
async function ensureDependencies(): Promise<void> {
  console.log('🔍 Verifying dependencies...\n');

  // Check pipeline stages
  const stages = await db().select().from(pipelineStages).where(eq(pipelineStages.isActive, true));
  if (stages.length === 0) {
    console.log('⚠️  Pipeline stages not found. Please run: pnpm -F @cactus/db seed:all');
    throw new Error('Pipeline stages are required. Run seed:all first.');
  }
  console.log(`  ✓ Pipeline stages: ${stages.length} stages found`);

  // Check lookup tables
  const taskStatuses = await db().select().from(lookupTaskStatus);
  const priorities = await db().select().from(lookupPriority);
  const notificationTypes = await db().select().from(lookupNotificationType);
  const assetClasses = await db().select().from(lookupAssetClass);

  if (taskStatuses.length === 0 || priorities.length === 0 || notificationTypes.length === 0 || assetClasses.length === 0) {
    console.log('⚠️  Lookup tables not found. Please run: pnpm -F @cactus/db seed:all');
    throw new Error('Lookup tables are required. Run seed:all first.');
  }
  console.log(`  ✓ Lookup tables: task statuses (${taskStatuses.length}), priorities (${priorities.length}), notification types (${notificationTypes.length}), asset classes (${assetClasses.length})`);

  // Check instruments (optional, but recommended)
  const instrumentsList = await db().select().from(instruments).limit(1);
  if (instrumentsList.length === 0) {
    console.log('⚠️  Instruments not found. Consider running: pnpm -F @cactus/db seed:benchmarks');
    console.log('   Continuing without instruments (some portfolio features may not work)...\n');
  } else {
    console.log(`  ✓ Instruments: Found (run seed:benchmarks for full set)`);
  }

  console.log('');
}

// ==========================================================
// Seed Functions
// ==========================================================

/**
 * Seed users (admin, managers, advisors)
 */
async function seedUsers() {
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

/**
 * Seed teams and team memberships
 */
async function seedTeams(
  managerUsers: InferSelectModel<typeof users>[],
  advisorUsers: InferSelectModel<typeof users>[]
): Promise<InferSelectModel<typeof teams>[]> {
  console.log('👥 Seeding teams...');

  const teamNames = ['Equipo Norte', 'Equipo Sur', 'Equipo Centro'];
  const createdTeams: InferSelectModel<typeof teams>[] = [];

  for (let i = 0; i < Math.min(teamNames.length, managerUsers.length - 1); i++) {
    const manager = managerUsers[i + 1]; // Skip admin (index 0)
    if (!manager) continue;

    const teamName = teamNames[i]!;
    const existing = await db().select().from(teams).where(eq(teams.name, teamName)).limit(1);
    
    let team: InferSelectModel<typeof teams>;
    if (existing.length === 0) {
      const [created] = await db().insert(teams).values({
        name: teamName,
        managerUserId: manager.id
      }).returning();
      team = created;
      console.log(`  ✓ Created team: ${teamName} (manager: ${manager.fullName})`);
    } else {
      team = existing[0]!;
      // Update manager if needed
      if (team.managerUserId !== manager.id) {
        await db().update(teams).set({ managerUserId: manager.id }).where(eq(teams.id, team.id));
      }
      console.log(`  ⊙ Team already exists: ${teamName}`);
    }
    createdTeams.push(team);

    // Assign advisors to team
    const advisorsPerTeam = Math.ceil(advisorUsers.length / teamNames.length);
    const startIdx = i * advisorsPerTeam;
    const endIdx = Math.min(startIdx + advisorsPerTeam, advisorUsers.length);
    const teamAdvisors = advisorUsers.slice(startIdx, endIdx);

    for (const advisor of teamAdvisors) {
      const existingMembership = await db()
        .select()
        .from(teamMembership)
        .where(and(eq(teamMembership.teamId, team.id), eq(teamMembership.userId, advisor.id)))
        .limit(1);

      if (existingMembership.length === 0) {
        await db().insert(teamMembership).values({
          teamId: team.id,
          userId: advisor.id,
          role: 'member'
        }).onConflictDoNothing();
        console.log(`    ✓ Added ${advisor.fullName} to ${teamName}`);
      }
    }
  }

  // Create some team membership requests
  if (createdTeams.length > 0 && advisorUsers.length > 0) {
    const advisor = advisorUsers[advisorUsers.length - 1]!;
    const manager = managerUsers[1];
    if (manager) {
      const existingRequest = await db()
        .select()
        .from(teamMembershipRequests)
        .where(and(
          eq(teamMembershipRequests.userId, advisor.id),
          eq(teamMembershipRequests.managerId, manager.id)
        ))
        .limit(1);

      if (existingRequest.length === 0) {
        await db().insert(teamMembershipRequests).values({
          userId: advisor.id,
          managerId: manager.id,
          status: 'pending'
        }).onConflictDoNothing();
        console.log(`  ✓ Created team membership request`);
      }
    }
  }

  console.log(`✅ Teams seeded: ${createdTeams.length} teams\n`);
  return createdTeams;
}

/**
 * Seed contacts with pipeline stages
 */
async function seedContacts(
  advisorUsers: InferSelectModel<typeof users>[],
  teamsList: InferSelectModel<typeof teams>[],
  pipelineStagesList: InferSelectModel<typeof pipelineStages>[]
): Promise<InferSelectModel<typeof contacts>[]> {
  console.log('📇 Seeding contacts...');

  const existingContacts = await db().select().from(contacts).limit(50);
  if (existingContacts.length >= 40) {
    console.log(`  ⊙ Contacts already seeded: ${existingContacts.length} contacts found\n`);
    return existingContacts;
  }

  const riskProfiles = ['low', 'mid', 'high'];
  const sources = ['referral', 'website', 'event', 'cold_call', 'social_media', 'other'];
  const occupations = [
    'Ingeniero', 'Médico', 'Abogado', 'Contador', 'Empresario', 'Ejecutivo', 'Profesor', 'Arquitecto',
    'Consultor', 'Comerciante', 'Inversor', 'Retirado', 'Emprendedor', 'Directivo'
  ];
  const prioritiesList = [
    'Ahorro para retiro',
    'Educación de hijos',
    'Protección de patrimonio',
    'Crecimiento de inversiones',
    'Planificación fiscal'
  ];
  const concernsList = [
    'Volatilidad del mercado',
    'Inseguridad económica',
    'Inflación',
    'Riesgo de pérdida',
    'Falta de conocimiento'
  ];

  // Distribute contacts across pipeline stages (more in early stages)
  const stageDistribution = [
    { stageName: 'Prospecto', count: 12 },
    { stageName: 'Contactado', count: 10 },
    { stageName: 'Primera reunion', count: 8 },
    { stageName: 'Segunda reunion', count: 6 },
    { stageName: 'Cliente', count: 8 },
    { stageName: 'Cuenta vacia', count: 3 },
    { stageName: 'Caido', count: 3 }
  ];

  const createdContacts: InferSelectModel<typeof contacts>[] = [];
  let contactCount = 0;

  for (const distribution of stageDistribution) {
    const stage = pipelineStagesList.find(s => s.name === distribution.stageName);
    if (!stage) continue;

    for (let i = 0; i < distribution.count; i++) {
      const name = generateRandomName();
      const email = generateRandomEmail(name.firstName, name.lastName);
      
      // Check if email already exists
      const existing = await db().select().from(contacts).where(eq(contacts.email, email)).limit(1);
      if (existing.length > 0) continue;

      const advisor = getRandomElement(advisorUsers);
      const team = teamsList.length > 0 ? getRandomElement(teamsList) : null;
      const riskProfile = getRandomElement(riskProfiles);
      const source = getRandomElement(sources);
      const occupation = getRandomElement(occupations);
      
      // Generate financial data
      const ingresos = (Math.random() * 500000 + 100000).toFixed(2);
      const gastos = (Math.random() * 400000 + 80000).toFixed(2);
      const excedente = (parseFloat(ingresos) - parseFloat(gastos)).toFixed(2);
      
      // Generate priorities and concerns
      const numPriorities = Math.floor(Math.random() * 3) + 1;
      const numConcerns = Math.floor(Math.random() * 3) + 1;
      const prioridades = getRandomElements(prioritiesList, numPriorities);
      const preocupaciones = getRandomElements(concernsList, numConcerns);

      // Generate dates
      const createdAt = getRandomDate(90, 0);
      const contactLastTouchAt = Math.random() > 0.3 
        ? getRandomDate(30, 0) 
        : getRandomDate(60, 0);

      const contactData: {
        firstName: string;
        lastName: string;
        fullName: string;
        email: string;
        phone: string;
        dni: string;
        country: string;
        pipelineStageId: string;
        source: string;
        riskProfile: string;
        assignedAdvisorId: string;
        assignedTeamId: string | null;
        queSeDedica: string;
        familia: string;
        expectativas: string;
        objetivos: string;
        requisitosPlanificacion: string;
        prioridades: string[];
        preocupaciones: string[];
        ingresos: string;
        gastos: string;
        excedente: string;
        contactLastTouchAt: Date;
        pipelineStageUpdatedAt: Date;
        createdAt: Date;
        updatedAt: Date;
      } = {
        firstName: name.firstName,
        lastName: name.lastName,
        fullName: `${name.firstName} ${name.lastName}`,
        email,
        phone: generateRandomPhone(),
        dni: generateRandomDNI(),
        country: 'AR',
        pipelineStageId: stage.id,
        source,
        riskProfile,
        assignedAdvisorId: advisor.id,
        assignedTeamId: team?.id ?? null,
        queSeDedica: occupation,
        familia: Math.random() > 0.5 ? 'Casado/a con hijos' : 'Soltero/a',
        expectativas: 'Busco asesoramiento profesional para mis inversiones',
        objetivos: 'Aumentar patrimonio a largo plazo',
        requisitosPlanificacion: 'Necesito entender las opciones disponibles',
        prioridades: prioridades,
        preocupaciones: preocupaciones,
        ingresos: ingresos,
        gastos: gastos,
        excedente: excedente,
        contactLastTouchAt,
        pipelineStageUpdatedAt: createdAt,
        createdAt,
        updatedAt: createdAt
      };

      const [contact] = await db().insert(contacts).values(contactData).returning();

      createdContacts.push(contact);
      contactCount++;

      // Create some pipeline stage history
      if (Math.random() > 0.7 && contactCount > 1) {
        const previousStage = pipelineStagesList.find(s => s.order! < stage.order!);
        if (previousStage) {
          await db().insert(pipelineStageHistory).values({
            contactId: contact.id,
            fromStage: previousStage.name,
            toStage: stage.name,
            reason: 'Avance en el proceso',
            changedByUserId: advisor.id,
            changedAt: createdAt
          }).onConflictDoNothing();
        }
      }
    }
  }

  console.log(`✅ Contacts seeded: ${createdContacts.length} contacts\n`);
  return createdContacts;
}

/**
 * Seed tags and contact tags
 */
async function seedTags(
  usersList: InferSelectModel<typeof users>[],
  contactsList: InferSelectModel<typeof contacts>[]
) {
  console.log('🏷️  Seeding tags...');

  const contactTagData = [
    { name: 'VIP', color: '#FFD700', icon: '⭐', description: 'Cliente VIP', isSystem: true },
    { name: 'Alto Patrimonio', color: '#9B59B6', icon: '💎', description: 'Alto patrimonio neto', isSystem: false },
    { name: 'Nuevo Cliente', color: '#3498DB', icon: '🆕', description: 'Cliente nuevo', isSystem: false },
    { name: 'Inversor Activo', color: '#2ECC71', icon: '📈', description: 'Inversor activo', isSystem: false },
    { name: 'Conservador', color: '#95A5A6', icon: '🛡️', description: 'Perfil conservador', isSystem: false },
    { name: 'Agresivo', color: '#E74C3C', icon: '⚡', description: 'Perfil agresivo', isSystem: false },
    { name: 'Requiere Seguimiento', color: '#F39C12', icon: '🔔', description: 'Requiere seguimiento', isSystem: false },
    { name: 'Interesado en Fondos', color: '#1ABC9C', icon: '💰', description: 'Interesado en fondos', isSystem: false },
    { name: 'Interesado en Acciones', color: '#34495E', icon: '📊', description: 'Interesado en acciones', isSystem: false },
    { name: 'Retirado', color: '#7F8C8D', icon: '🏖️', description: 'Cliente retirado', isSystem: false }
  ];

  const noteTagData = [
    { name: 'Importante', color: '#E74C3C', icon: '❗', description: 'Nota importante', isSystem: false },
    { name: 'Seguimiento', color: '#F39C12', icon: '📝', description: 'Requiere seguimiento', isSystem: false },
    { name: 'Reunión', color: '#3498DB', icon: '📅', description: 'Nota de reunión', isSystem: false },
    { name: 'Llamada', color: '#9B59B6', icon: '📞', description: 'Nota de llamada', isSystem: false },
    { name: 'Email', color: '#1ABC9C', icon: '✉️', description: 'Nota de email', isSystem: false },
    { name: 'Acción Requerida', color: '#E67E22', icon: '✅', description: 'Acción requerida', isSystem: false },
    { name: 'Resumen', color: '#95A5A6', icon: '📋', description: 'Resumen', isSystem: false }
  ];

  const createdContactTags: InferSelectModel<typeof tags>[] = [];
  const createdNoteTags: InferSelectModel<typeof tags>[] = [];
  const adminUser = usersList.find(u => u.role === 'admin') || usersList[0]!;

  // Create contact tags
  for (const tagData of contactTagData) {
    const existing = await db()
      .select()
      .from(tags)
      .where(and(eq(tags.scope, 'contact'), eq(tags.name, tagData.name)))
      .limit(1);

    if (existing.length === 0) {
      const [tag] = await db().insert(tags).values({
        scope: 'contact',
        name: tagData.name,
        color: tagData.color,
        icon: tagData.icon,
        description: tagData.description,
        isSystem: tagData.isSystem,
        createdByUserId: adminUser.id
      }).returning();
      createdContactTags.push(tag);
      console.log(`  ✓ Created contact tag: ${tagData.name}`);
    } else {
      createdContactTags.push(existing[0]!);
      console.log(`  ⊙ Contact tag already exists: ${tagData.name}`);
    }
  }

  // Create note tags
  for (const tagData of noteTagData) {
    const existing = await db()
      .select()
      .from(tags)
      .where(and(eq(tags.scope, 'note'), eq(tags.name, tagData.name)))
      .limit(1);

    if (existing.length === 0) {
      const [tag] = await db().insert(tags).values({
        scope: 'note',
        name: tagData.name,
        color: tagData.color,
        icon: tagData.icon,
        description: tagData.description,
        isSystem: tagData.isSystem,
        createdByUserId: adminUser.id
      }).returning();
      createdNoteTags.push(tag);
      console.log(`  ✓ Created note tag: ${tagData.name}`);
    } else {
      createdNoteTags.push(existing[0]!);
      console.log(`  ⊙ Note tag already exists: ${tagData.name}`);
    }
  }

  // Assign tags to contacts
  console.log('  📌 Assigning tags to contacts...');
  let tagAssignmentCount = 0;
  for (const contact of contactsList) {
    const numTags = Math.floor(Math.random() * 3) + 1;
    const contactTagsToAssign = getRandomElements(createdContactTags, numTags);

    for (const tag of contactTagsToAssign) {
      const existing = await db()
        .select()
        .from(contactTags)
        .where(and(eq(contactTags.contactId, contact.id), eq(contactTags.tagId, tag.id)))
        .limit(1);

      if (existing.length === 0) {
        await db().insert(contactTags).values({
          contactId: contact.id,
          tagId: tag.id
        }).onConflictDoNothing();
        tagAssignmentCount++;
      }
    }
  }
  console.log(`    ✓ Assigned ${tagAssignmentCount} tags to contacts`);

  console.log(`✅ Tags seeded: ${createdContactTags.length} contact tags, ${createdNoteTags.length} note tags\n`);
  return { contactTags: createdContactTags, noteTags: createdNoteTags };
}

/**
 * Seed tasks
 */
async function seedTasks(
  usersList: InferSelectModel<typeof users>[],
  contactsList: InferSelectModel<typeof contacts>[]
) {
  console.log('📋 Seeding tasks...');

  const existingTasks = await db().select().from(tasks).limit(60);
  if (existingTasks.length >= 50) {
    console.log(`  ⊙ Tasks already seeded: ${existingTasks.length} tasks found\n`);
    return existingTasks;
  }

  const taskStatuses = await db().select().from(lookupTaskStatus);
  const priorities = await db().select().from(lookupPriority);
  const taskTitles = [
    'Llamar al cliente',
    'Enviar propuesta',
    'Seguimiento de reunión',
    'Enviar documentación',
    'Revisar portfolio',
    'Actualizar información',
    'Agendar reunión',
    'Enviar cotización',
    'Revisar contratos',
    'Seguimiento de inversión'
  ];

  const createdTasks: InferSelectModel<typeof tasks>[] = [];
  const numTasks = 50;

  for (let i = 0; i < numTasks; i++) {
    const contact = getRandomElement(contactsList);
    const assignedUser = getRandomElement(usersList.filter(u => u.role === 'advisor' || u.role === 'manager'));
    const createdBy = getRandomElement(usersList);
    const status = getRandomElement(taskStatuses);
    const priority = getRandomElement(priorities);
    const title = getRandomElement(taskTitles);
    const description = `Tarea relacionada con ${contact.fullName || `${contact.firstName} ${contact.lastName}`}`;
    
    // Some tasks are completed, some are open
    const isCompleted = Math.random() > 0.6;
    const dueDate = isCompleted 
      ? getRandomDateOnly(30, 0) 
      : getRandomDateOnly(0, 30);
    
    const completedAt = isCompleted && status.id === 'completed' 
      ? getRandomDate(30, 0) 
      : null;

    const createdAt = getRandomDate(60, 0);

    const [task] = await db().insert(tasks).values({
      contactId: contact.id,
      title,
      description,
      status: status.id,
      dueDate,
      priority: priority.id,
      assignedToUserId: assignedUser.id,
      createdByUserId: createdBy.id,
      createdFrom: 'manual',
      completedAt,
      createdAt,
      updatedAt: createdAt
    }).returning();

    createdTasks.push(task);
  }

  console.log(`✅ Tasks seeded: ${createdTasks.length} tasks\n`);
  return createdTasks;
}

/**
 * Seed notes
 */
async function seedNotes(
  usersList: InferSelectModel<typeof users>[],
  contactsList: InferSelectModel<typeof contacts>[],
  noteTagsList: InferSelectModel<typeof tags>[]
) {
  console.log('📝 Seeding notes...');

  const existingNotes = await db().select().from(notes).limit(30);
  if (existingNotes.length >= 25) {
    console.log(`  ⊙ Notes already seeded: ${existingNotes.length} notes found\n`);
    return existingNotes;
  }

  const noteTypes = ['general', 'summary', 'action_items'];
  const sources = ['manual', 'ai'];
  const noteContents = [
    'Cliente interesado en opciones de inversión a largo plazo.',
    'Reunión realizada, se discutieron objetivos financieros.',
    'Cliente requiere seguimiento en los próximos días.',
    'Enviada documentación sobre productos disponibles.',
    'Cliente muestra interés en fondos de inversión.',
    'Revisada situación financiera actual del cliente.',
    'Discutidas estrategias de diversificación.',
    'Cliente prefiere enfoque conservador.',
    'Se acordó próxima reunión para revisar portfolio.',
    'Cliente satisfecho con el servicio proporcionado.'
  ];

  const createdNotes: InferSelectModel<typeof notes>[] = [];
  const numNotes = 25;

  for (let i = 0; i < numNotes; i++) {
    const contact = getRandomElement(contactsList);
    const author = getRandomElement(usersList.filter(u => u.role === 'advisor' || u.role === 'manager'));
    const noteType = getRandomElement(noteTypes);
    const source = getRandomElement(sources);
    const content = getRandomElement(noteContents);
    const createdAt = getRandomDate(60, 0);

    const [note] = await db().insert(notes).values({
      contactId: contact.id,
      authorUserId: author.id,
      source,
      noteType,
      content,
      createdAt
    }).returning();

    createdNotes.push(note);

    // Assign tags to some notes
    if (Math.random() > 0.5 && noteTagsList.length > 0) {
      const numTags = Math.floor(Math.random() * 2) + 1;
      const tagsToAssign = getRandomElements(noteTagsList, numTags);

      for (const tag of tagsToAssign) {
        await db().insert(noteTags).values({
          noteId: note.id,
          tagId: tag.id
        }).onConflictDoNothing();
      }
    }
  }

  console.log(`✅ Notes seeded: ${createdNotes.length} notes\n`);
  return createdNotes;
}

/**
 * Seed portfolio templates and assignments
 */
async function seedPortfolios(
  usersList: InferSelectModel<typeof users>[],
  contactsList: InferSelectModel<typeof contacts>[],
  instrumentsList: InferSelectModel<typeof instruments>[],
  assetClasses: InferSelectModel<typeof lookupAssetClass>[]
) {
  console.log('💼 Seeding portfolios...');

  if (instrumentsList.length === 0) {
    console.log('  ⚠️  No instruments found. Skipping portfolio seeding.\n');
    return { templates: [], assignments: [] };
  }

  const advisorUsers = usersList.filter(u => u.role === 'advisor' || u.role === 'manager');
  const createdTemplates: InferSelectModel<typeof portfolioTemplates>[] = [];

  // Create portfolio templates
  const templateData = [
    { name: 'Conservadora', description: 'Cartera conservadora 40/60', riskLevel: 'low' },
    { name: 'Balanceada', description: 'Cartera balanceada 60/40', riskLevel: 'mid' },
    { name: 'Agresiva', description: 'Cartera agresiva 80/20', riskLevel: 'high' }
  ];

  for (const templateInfo of templateData) {
    const existing = await db()
      .select()
      .from(portfolioTemplates)
      .where(eq(portfolioTemplates.name, templateInfo.name))
      .limit(1);

    let template: InferSelectModel<typeof portfolioTemplates>;
    const creator = getRandomElement(advisorUsers);

    if (existing.length === 0) {
      const [created] = await db().insert(portfolioTemplates).values({
        name: templateInfo.name,
        description: templateInfo.description,
        riskLevel: templateInfo.riskLevel,
        createdByUserId: creator.id
      }).returning();
      template = created;
      console.log(`  ✓ Created template: ${templateInfo.name}`);
    } else {
      template = existing[0]!;
      console.log(`  ⊙ Template already exists: ${templateInfo.name}`);
    }
    createdTemplates.push(template);

    // Create template lines
    const equityAssets = assetClasses.find(ac => ac.id === 'equity');
    const fixedIncomeAssets = assetClasses.find(ac => ac.id === 'fixed_income');

    if (templateInfo.riskLevel === 'low' && fixedIncomeAssets) {
      // 40% equity, 60% fixed income
      const lines = [
        { templateId: template.id, targetType: 'asset_class' as const, assetClass: equityAssets?.id ?? null, targetWeight: '0.4000' },
        { templateId: template.id, targetType: 'asset_class' as const, assetClass: fixedIncomeAssets.id, targetWeight: '0.6000' }
      ];
      await db().insert(portfolioTemplateLines).values(lines).onConflictDoNothing();
    } else if (templateInfo.riskLevel === 'mid' && equityAssets && fixedIncomeAssets) {
      // 60% equity, 40% fixed income
      const lines = [
        { templateId: template.id, targetType: 'asset_class' as const, assetClass: equityAssets.id, targetWeight: '0.6000' },
        { templateId: template.id, targetType: 'asset_class' as const, assetClass: fixedIncomeAssets.id, targetWeight: '0.4000' }
      ];
      await db().insert(portfolioTemplateLines).values(lines).onConflictDoNothing();
    } else if (templateInfo.riskLevel === 'high' && equityAssets && fixedIncomeAssets) {
      // 80% equity, 20% fixed income
      const lines = [
        { templateId: template.id, targetType: 'asset_class' as const, assetClass: equityAssets.id, targetWeight: '0.8000' },
        { templateId: template.id, targetType: 'asset_class' as const, assetClass: fixedIncomeAssets.id, targetWeight: '0.2000' }
      ];
      await db().insert(portfolioTemplateLines).values(lines).onConflictDoNothing();
    }
  }

  // Create client portfolio assignments
  const assignmentStatuses = ['active', 'paused', 'ended'];
  const clientContacts = contactsList.filter(c => {
    // Only assign portfolios to contacts in 'Cliente' stage or later
    // We'll check this by checking if they have a pipeline stage with order >= 5
    return true; // Simplified for now
  }).slice(0, 15);

  const createdAssignments: InferSelectModel<typeof clientPortfolioAssignments>[] = [];
  for (const contact of clientContacts) {
    const template = getRandomElement(createdTemplates);
    const status = getRandomElement(assignmentStatuses);
    const startDate = getRandomDateOnly(180, 0);
    const endDate = status === 'ended' ? getRandomDateOnly(30, 0) : null;
    const creator = getRandomElement(advisorUsers);

    const existing = await db()
      .select()
      .from(clientPortfolioAssignments)
      .where(and(
        eq(clientPortfolioAssignments.contactId, contact.id),
        eq(clientPortfolioAssignments.templateId, template.id),
        eq(clientPortfolioAssignments.startDate, startDate)
      ))
      .limit(1);

    if (existing.length === 0) {
      const [assignment] = await db().insert(clientPortfolioAssignments).values({
        contactId: contact.id,
        templateId: template.id,
        status,
        startDate,
        endDate,
        createdByUserId: creator.id
      }).returning();
      createdAssignments.push(assignment);
    }
  }

  console.log(`✅ Portfolios seeded: ${createdTemplates.length} templates, ${createdAssignments.length} assignments\n`);
  return { templates: createdTemplates, assignments: createdAssignments };
}

/**
 * Seed broker accounts, balances, positions, and transactions
 */
async function seedBrokerData(
  contactsList: InferSelectModel<typeof contacts>[],
  instrumentsList: InferSelectModel<typeof instruments>[]
) {
  console.log('🏦 Seeding broker data...');

  if (instrumentsList.length === 0) {
    console.log('  ⚠️  No instruments found. Skipping broker data seeding.\n');
    return { accounts: [], balances: [], positions: [], transactions: [] };
  }

  const broker = 'balanz';
  const clientContacts = contactsList.slice(0, 20);
  const createdAccounts: InferSelectModel<typeof brokerAccounts>[] = [];

  // Create broker accounts
  for (const contact of clientContacts) {
    const accountNumber = `BAL${Math.floor(100000 + Math.random() * 900000)}`;
    const status = Math.random() > 0.2 ? 'active' : 'closed';

    const existing = await db()
      .select()
      .from(brokerAccounts)
      .where(and(
        eq(brokerAccounts.broker, broker),
        eq(brokerAccounts.accountNumber, accountNumber)
      ))
      .limit(1);

    if (existing.length === 0) {
      const [account] = await db().insert(brokerAccounts).values({
        broker,
        accountNumber,
        holderName: contact.fullName || `${contact.firstName} ${contact.lastName}`,
        contactId: contact.id,
        status,
        lastSyncedAt: getRandomDate(7, 0)
      }).returning();
      createdAccounts.push(account);

      // Create balances (last 6 months)
      if (status === 'active') {
        for (let i = 0; i < 6; i++) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const asOfDate = date.toISOString().split('T')[0]!;
          
          const liquidBalance = (Math.random() * 1000000 + 50000).toFixed(6);
          const totalBalance = (parseFloat(liquidBalance) * (1 + Math.random() * 0.5)).toFixed(6);

          await db().insert(brokerBalances).values({
            brokerAccountId: account.id,
            asOfDate,
            currency: 'ARS',
            liquidBalance,
            totalBalance
          }).onConflictDoNothing();
        }
      }

      // Create positions (current)
      if (status === 'active' && Math.random() > 0.3) {
        const numPositions = Math.floor(Math.random() * 5) + 1;
        const selectedInstruments = getRandomElements(instrumentsList, numPositions);
        const today = new Date().toISOString().split('T')[0]!;

        for (const instrument of selectedInstruments) {
          const quantity = (Math.random() * 1000 + 10).toFixed(8);
          const avgPrice = (Math.random() * 1000 + 10).toFixed(6);
          const marketValue = (parseFloat(quantity) * parseFloat(avgPrice)).toFixed(6);

          await db().insert(brokerPositions).values({
            brokerAccountId: account.id,
            asOfDate: today,
            instrumentId: instrument.id,
            quantity,
            avgPrice,
            marketValue
          }).onConflictDoNothing();
        }
      }

      // Create transactions (last 3 months)
      if (status === 'active') {
        const transactionTypes = ['buy', 'sell', 'deposit', 'withdrawal', 'fee'];
        const numTransactions = Math.floor(Math.random() * 20) + 5;

        for (let i = 0; i < numTransactions; i++) {
          const transactionType = getRandomElement(transactionTypes);
          const tradeDate = getRandomDateOnly(90, 0);
          const settleDate = getRandomDateOnly(90, 0);
          const instrument = transactionType === 'buy' || transactionType === 'sell' 
            ? getRandomElement(instrumentsList) 
            : null;

          const quantity = instrument ? (Math.random() * 100 + 1).toFixed(8) : null;
          const price = instrument ? (Math.random() * 1000 + 10).toFixed(6) : null;
          const grossAmount = (Math.random() * 50000 + 1000).toFixed(6);
          const fees = (parseFloat(grossAmount) * 0.001).toFixed(6);
          const netAmount = transactionType === 'buy' || transactionType === 'deposit'
            ? (parseFloat(grossAmount) - parseFloat(fees)).toFixed(6)
            : (parseFloat(grossAmount) - parseFloat(fees)).toFixed(6);

          const transactionData: {
            brokerAccountId: string;
            tradeDate: string;
            settleDate: string;
            type: string;
            instrumentId: string | null;
            quantity: string | null;
            price: string | null;
            grossAmount: string;
            fees: string;
            netAmount: string;
            reference: string;
          } = {
            brokerAccountId: account.id,
            tradeDate,
            settleDate,
            type: transactionType,
            instrumentId: instrument?.id ?? null,
            quantity,
            price,
            grossAmount,
            fees,
            netAmount,
            reference: `REF-${Math.floor(100000 + Math.random() * 900000)}`
          };

          await db().insert(brokerTransactions).values(transactionData).onConflictDoNothing();
        }
      }
    }
  }

  console.log(`✅ Broker data seeded: ${createdAccounts.length} accounts\n`);
  return { accounts: createdAccounts, balances: [], positions: [], transactions: [] };
}

/**
 * Seed notifications and user channel preferences
 */
async function seedNotifications(
  usersList: InferSelectModel<typeof users>[],
  contactsList: InferSelectModel<typeof contacts>[],
  tasksList: InferSelectModel<typeof tasks>[],
  notificationTypes: InferSelectModel<typeof lookupNotificationType>[]
) {
  console.log('🔔 Seeding notifications...');

  const existingNotifications = await db().select().from(notifications).limit(30);
  if (existingNotifications.length >= 25) {
    console.log(`  ⊙ Notifications already seeded: ${existingNotifications.length} notifications found\n`);
    return existingNotifications;
  }

  const severities = ['info', 'warning', 'critical'];
  const createdNotifications: InferSelectModel<typeof notifications>[] = [];
  const numNotifications = 25;

  for (let i = 0; i < numNotifications; i++) {
    const user = getRandomElement(usersList);
    const notificationType = getRandomElement(notificationTypes);
    const severity = getRandomElement(severities);
    const isRead = Math.random() > 0.6;
    const contact = Math.random() > 0.5 ? getRandomElement(contactsList) : null;
    const task = contact && Math.random() > 0.7 ? getRandomElement(tasksList) : null;

    const payload = {
      message: `Notificación de tipo ${notificationType.label}`,
      contactName: contact?.fullName || contact?.firstName || null,
      taskTitle: task?.title || null
    };

    const notificationData: {
      userId: string;
      type: string;
      severity: string;
      contactId: string | null;
      taskId: string | null;
      payload: { message: string; contactName: string | null; taskTitle: string | null };
      renderedBody: string;
      deliveredChannels: string[];
      readAt: Date | null;
      processed: boolean;
      createdAt: Date;
    } = {
      userId: user.id,
      type: notificationType.id,
      severity,
      contactId: contact?.id ?? null,
      taskId: task?.id ?? null,
      payload,
      renderedBody: `Notificación: ${notificationType.label}`,
      deliveredChannels: ['in_app'],
      readAt: isRead ? getRandomDate(7, 0) : null,
      processed: true,
      createdAt: getRandomDate(30, 0)
    };

    const [notification] = await db().insert(notifications).values(notificationData).returning();

    createdNotifications.push(notification);
  }

  // Create user channel preferences
  const channels = ['email', 'whatsapp', 'push'];
  for (const user of usersList.slice(0, 5)) {
    for (const channel of channels) {
      const existing = await db()
        .select()
        .from(userChannelPreferences)
        .where(and(
          eq(userChannelPreferences.userId, user.id),
          eq(userChannelPreferences.channel, channel)
        ))
        .limit(1);

      if (existing.length === 0) {
        await db().insert(userChannelPreferences).values({
          userId: user.id,
          channel,
          enabled: Math.random() > 0.3,
          address: channel === 'email' ? { email: user.email } : {}
        }).onConflictDoNothing();
      }
    }
  }

  console.log(`✅ Notifications seeded: ${createdNotifications.length} notifications\n`);
  return createdNotifications;
}

/**
 * Seed activity events and monthly goals
 */
async function seedActivityEvents(
  usersList: InferSelectModel<typeof users>[],
  contactsList: InferSelectModel<typeof contacts>[]
) {
  console.log('📊 Seeding activity events...');

  const existingEvents = await db().select().from(activityEvents).limit(100);
  if (existingEvents.length >= 80) {
    console.log(`  ⊙ Activity events already seeded: ${existingEvents.length} events found\n`);
  } else {
    const eventTypes = [
      'note_created',
      'meeting_added',
      'task_completed',
      'login',
      'download',
      'portfolio_alert',
      'contact_created',
      'contact_updated'
    ];

    const numEvents = 80;
    for (let i = 0; i < numEvents; i++) {
      const user = getRandomElement(usersList);
      const advisor = user.role === 'advisor' ? user : getRandomElement(usersList.filter(u => u.role === 'advisor'));
      const contact = Math.random() > 0.3 ? getRandomElement(contactsList) : null;
      const eventType = getRandomElement(eventTypes);

      const activityData: {
        userId: string;
        advisorUserId: string | null;
        contactId: string | null;
        type: string;
        metadata: { action: string; timestamp: string };
        occurredAt: Date;
      } = {
        userId: user.id,
        advisorUserId: advisor?.id ?? null,
        contactId: contact?.id ?? null,
        type: eventType,
        metadata: {
          action: eventType,
          timestamp: new Date().toISOString()
        },
        occurredAt: getRandomDate(30, 0)
      };

      await db().insert(activityEvents).values(activityData).onConflictDoNothing();
    }
    console.log(`  ✓ Created ${numEvents} activity events`);
  }

  // Seed monthly goals
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const existingGoal = await db()
    .select()
    .from(monthlyGoals)
    .where(and(
      eq(monthlyGoals.month, currentMonth),
      eq(monthlyGoals.year, currentYear)
    ))
    .limit(1);

  if (existingGoal.length === 0) {
    await db().insert(monthlyGoals).values({
      month: currentMonth,
      year: currentYear,
      newProspectsGoal: 20,
      firstMeetingsGoal: 15,
      secondMeetingsGoal: 10,
      newClientsGoal: 5
    }).onConflictDoNothing();
    console.log(`  ✓ Created monthly goal for ${currentMonth}/${currentYear}`);
  }

  // Next month goal
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

  const existingNextGoal = await db()
    .select()
    .from(monthlyGoals)
    .where(and(
      eq(monthlyGoals.month, nextMonth),
      eq(monthlyGoals.year, nextYear)
    ))
    .limit(1);

  if (existingNextGoal.length === 0) {
    await db().insert(monthlyGoals).values({
      month: nextMonth,
      year: nextYear,
      newProspectsGoal: 20,
      firstMeetingsGoal: 15,
      secondMeetingsGoal: 10,
      newClientsGoal: 5
    }).onConflictDoNothing();
    console.log(`  ✓ Created monthly goal for ${nextMonth}/${nextYear}`);
  }

  console.log(`✅ Activity events and monthly goals seeded\n`);
}

/**
 * Seed capacitaciones
 */
async function seedCapacitaciones(usersList: InferSelectModel<typeof users>[]) {
  console.log('📚 Seeding capacitaciones...');

  const existingCapacitaciones = await db().select().from(capacitaciones).limit(15);
  if (existingCapacitaciones.length >= 12) {
    console.log(`  ⊙ Capacitaciones already seeded: ${existingCapacitaciones.length} found\n`);
    return existingCapacitaciones;
  }

  const temas = [
    'Podcast',
    'Libros',
    'TED',
    'Administración',
    'Carácter',
    'Método',
    'Role Play',
    'Mktg Digital',
    'Producto',
    'Vida',
    'Zurich'
  ];

  const capacitacionesData = [
    { titulo: 'Introducción a las Inversiones', tema: 'Producto', link: 'https://example.com/cap1' },
    { titulo: 'Gestión del Tiempo', tema: 'Administración', link: 'https://example.com/cap2' },
    { titulo: 'Comunicación Efectiva', tema: 'Carácter', link: 'https://example.com/cap3' },
    { titulo: 'Ventas y Negociación', tema: 'Método', link: 'https://example.com/cap4' },
    { titulo: 'Marketing Digital para Asesores', tema: 'Mktg Digital', link: 'https://example.com/cap5' },
    { titulo: 'Planificación Financiera', tema: 'Producto', link: 'https://example.com/cap6' },
    { titulo: 'TED Talk: Liderazgo', tema: 'TED', link: 'https://example.com/cap7' },
    { titulo: 'Libro: Hábitos Atómicos', tema: 'Libros', link: 'https://example.com/cap8' },
    { titulo: 'Podcast: Finanzas Personales', tema: 'Podcast', link: 'https://example.com/cap9' },
    { titulo: 'Role Play: Objeciones Comunes', tema: 'Role Play', link: 'https://example.com/cap10' },
    { titulo: 'Productos Zurich', tema: 'Zurich', link: 'https://example.com/cap11' },
    { titulo: 'Balance Vida-Trabajo', tema: 'Vida', link: 'https://example.com/cap12' }
  ];

  const createdCapacitaciones: InferSelectModel<typeof capacitaciones>[] = [];
  const advisorUsers = usersList.filter(u => u.role === 'advisor' || u.role === 'manager');

  for (const capData of capacitacionesData) {
    const existing = await db()
      .select()
      .from(capacitaciones)
      .where(eq(capacitaciones.titulo, capData.titulo))
      .limit(1);

    if (existing.length === 0) {
      const creator = getRandomElement(advisorUsers);
      const fecha = getRandomDateOnly(180, 0);

      const [cap] = await db().insert(capacitaciones).values({
        titulo: capData.titulo,
        tema: capData.tema,
        link: capData.link,
        fecha,
        createdByUserId: creator.id
      }).returning();
      createdCapacitaciones.push(cap);
      console.log(`  ✓ Created capacitación: ${capData.titulo}`);
    } else {
      createdCapacitaciones.push(existing[0]!);
      console.log(`  ⊙ Capacitación already exists: ${capData.titulo}`);
    }
  }

  console.log(`✅ Capacitaciones seeded: ${createdCapacitaciones.length} capacitaciones\n`);
  return createdCapacitaciones;
}

/**
 * Seed segments and segment members
 */
async function seedSegments(
  usersList: InferSelectModel<typeof users>[],
  contactsList: InferSelectModel<typeof contacts>[]
) {
  console.log('📊 Seeding segments...');

  const existingSegments = await db().select().from(segments).limit(5);
  if (existingSegments.length >= 3) {
    console.log(`  ⊙ Segments already seeded: ${existingSegments.length} segments found\n`);
    return existingSegments;
  }

  const managerUsers = usersList.filter(u => u.role === 'manager' || u.role === 'admin');
  const createdSegments: InferSelectModel<typeof segments>[] = [];

  const segmentData = [
    {
      name: 'Clientes VIP',
      description: 'Clientes con alto patrimonio',
      filters: { riskProfile: 'high', tags: ['VIP'] },
      isDynamic: true
    },
    {
      name: 'Nuevos Clientes',
      description: 'Clientes agregados en los últimos 30 días',
      filters: { createdAt: { $gte: '30 days ago' } },
      isDynamic: true
    },
    {
      name: 'Requieren Seguimiento',
      description: 'Clientes que requieren seguimiento',
      filters: { tags: ['Requiere Seguimiento'] },
      isDynamic: true
    },
    {
      name: 'Clientes Conservadores',
      description: 'Clientes con perfil conservador',
      filters: { riskProfile: 'low', tags: ['Conservador'] },
      isDynamic: false
    }
  ];

  for (const segmentInfo of segmentData) {
    const existing = await db()
      .select()
      .from(segments)
      .where(eq(segments.name, segmentInfo.name))
      .limit(1);

    let segment: InferSelectModel<typeof segments>;
    const owner = getRandomElement(managerUsers);

    if (existing.length === 0) {
      const [created] = await db().insert(segments).values({
        name: segmentInfo.name,
        description: segmentInfo.description,
        filters: segmentInfo.filters,
        isDynamic: segmentInfo.isDynamic,
        contactCount: 0,
        ownerId: owner.id,
        isShared: Math.random() > 0.5
      }).returning();
      segment = created;
      console.log(`  ✓ Created segment: ${segmentInfo.name}`);
    } else {
      segment = existing[0]!;
      console.log(`  ⊙ Segment already exists: ${segmentInfo.name}`);
    }
    createdSegments.push(segment);

    // For static segments, add members
    if (!segmentInfo.isDynamic) {
      const segmentContacts = getRandomElements(contactsList, Math.floor(Math.random() * 10) + 5);
      for (const contact of segmentContacts) {
        await db().insert(segmentMembers).values({
          segmentId: segment.id,
          contactId: contact.id
        }).onConflictDoNothing();
      }
      console.log(`    ✓ Added ${segmentContacts.length} contacts to ${segmentInfo.name}`);
    }
  }

  console.log(`✅ Segments seeded: ${createdSegments.length} segments\n`);
  return createdSegments;
}

// ==========================================================
// Main Seed Function
// ==========================================================

/**
 * Main seeding function
 * Orchestrates all seed operations in the correct order
 */
async function seedFull() {
  console.log('🌱 Starting FULL database seeding...\n');

  try {
    // 1. Verify dependencies
    await ensureDependencies();

    // 2. Get existing data needed for seeds
    const pipelineStagesList = await db()
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.isActive, true))
      .orderBy(pipelineStages.order);

    const assetClasses = await db().select().from(lookupAssetClass);
    const instrumentsList = await db().select().from(instruments);
    const notificationTypes = await db().select().from(lookupNotificationType);

    // 3. Seed users
    const { adminUser, managerUsers, advisorUsers } = await seedUsers();
    const allUsers = [adminUser, ...managerUsers.slice(1), ...advisorUsers];

    // 4. Seed teams
    const createdTeams = await seedTeams(managerUsers, advisorUsers);

    // 5. Seed contacts
    const createdContacts = await seedContacts(advisorUsers, createdTeams, pipelineStagesList);

    // 6. Seed tags
    const { contactTags: createdContactTags, noteTags: createdNoteTags } = await seedTags(allUsers, createdContacts);

    // 7. Seed tasks
    const createdTasks = await seedTasks(allUsers, createdContacts);

    // 8. Seed notes
    const createdNotes = await seedNotes(allUsers, createdContacts, createdNoteTags);

    // 9. Seed portfolios
    await seedPortfolios(allUsers, createdContacts, instrumentsList, assetClasses);

    // 10. Seed broker data
    await seedBrokerData(createdContacts, instrumentsList);

    // 11. Seed notifications
    await seedNotifications(allUsers, createdContacts, createdTasks, notificationTypes);

    // 12. Seed activity events and monthly goals
    await seedActivityEvents(allUsers, createdContacts);

    // 13. Seed capacitaciones
    await seedCapacitaciones(allUsers);

    // 14. Seed segments
    await seedSegments(allUsers, createdContacts);

    console.log('✅ FULL seeding completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   - Users: ${allUsers.length} (1 admin, ${managerUsers.length - 1} managers, ${advisorUsers.length} advisors)`);
    console.log(`   - Teams: ${createdTeams.length}`);
    console.log(`   - Contacts: ${createdContacts.length}`);
    console.log(`   - Tags: ${createdContactTags.length + createdNoteTags.length} (${createdContactTags.length} contact, ${createdNoteTags.length} note)`);
    console.log(`   - Tasks: ${createdTasks.length}`);
    console.log(`   - Notes: ${createdNotes.length}`);
    console.log(`   - Broker accounts: ${instrumentsList.length > 0 ? 'Created' : 'Skipped (no instruments)'}`);
    console.log('');
    console.log('🔑 Default password for all users: password123');
    console.log('');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    if (error instanceof Error) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Execute seeding if this script is run directly
if (require.main === module) {
  seedFull()
    .then(() => {
      console.log('👋 Seeding finalizado. Puedes cerrar este proceso.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error fatal:', err);
      process.exit(1);
    });
}

export { seedFull };

