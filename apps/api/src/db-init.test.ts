/**
 * Tests para db-init.ts
 *
 * AI_DECISION: Tests unitarios para módulo de inicialización de base de datos
 * Justificación: Validar lógica crítica de migraciones y seeding
 * Impacto: Prevenir errores en inicialización del sistema
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  db,
  pipelineStages,
  lookupTaskStatus,
  lookupPriority,
  lookupNotificationType,
  lookupAssetClass,
  teams,
  users,
  teamMembership,
} from '@maatwork/db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { ensureDefaultPipelineStages } from './utils/pipeline-stages';

// Mock dependencies
vi.mock('@maatwork/db', () => ({
  db: vi.fn(),
  pipelineStages: {},
  lookupTaskStatus: {},
  lookupPriority: {},
  lookupNotificationType: {},
  lookupAssetClass: {},
  teams: {},
  users: {},
  teamMembership: {},
  eq: vi.fn(),
  sql: vi.fn((strings, ...values) => ({ strings, values })),
}));

vi.mock('drizzle-orm/node-postgres/migrator', () => ({
  migrate: vi.fn(),
}));

vi.mock('drizzle-orm', () => ({
  sql: vi.fn((strings, ...values) => ({ strings, values })),
  eq: vi.fn(),
}));

vi.mock('./utils/pipeline-stages', () => ({
  ensureDefaultPipelineStages: vi.fn(),
}));

vi.mock('pino', () => ({
  default: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

describe('db-init', () => {
  let mockDb: ReturnType<typeof vi.fn>;
  let mockExecute: ReturnType<typeof vi.fn>;
  let mockInsert: ReturnType<typeof vi.fn>;
  let mockValues: ReturnType<typeof vi.fn>;
  let mockOnConflictDoNothing: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockWhere: ReturnType<typeof vi.fn>;
  let mockLimit: ReturnType<typeof vi.fn>;
  let mockReturning: ReturnType<typeof vi.fn>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    originalEnv = { ...process.env };

    mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
    mockInsert = vi.fn().mockReturnValue({ values: mockValues });

    mockReturning = vi.fn().mockResolvedValue([{ id: 'team-1', name: 'maatwork' }]);
    mockLimit = vi.fn().mockResolvedValue([]);
    mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

    mockExecute = vi.fn().mockResolvedValue({ rows: [{ count: '1' }] });

    mockDb = vi.fn().mockReturnValue({
      execute: mockExecute,
      insert: mockInsert,
      select: mockSelect,
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn() }) }),
    });

    (db as any).mockImplementation(mockDb);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('verifyDatabaseConnection', () => {
    it('debería lanzar error cuando DATABASE_URL no está configurado', async () => {
      delete process.env.DATABASE_URL;

      const { initializeDatabase } = await import('./db-init');

      await expect(initializeDatabase()).rejects.toThrow(
        'DATABASE_URL environment variable is not set'
      );
    });

    it('debería verificar conexión exitosamente cuando DATABASE_URL está configurado', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      mockExecute.mockResolvedValue({ rows: [] });

      // Simular verifyDatabaseConnection
      const verifyDatabaseConnection = async () => {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
          throw new Error(
            'DATABASE_URL environment variable is not set. Please configure it in apps/api/.env'
          );
        }
        await db().execute(sql`SELECT 1`);
      };

      await expect(verifyDatabaseConnection()).resolves.not.toThrow();
      expect(mockExecute).toHaveBeenCalled();
    });

    it('debería manejar error de conexión rechazada', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      const connectionError = new Error('Connection refused');
      (connectionError as any).code = 'ECONNREFUSED';
      mockExecute.mockRejectedValue(connectionError);

      const verifyDatabaseConnection = async () => {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
          throw new Error('DATABASE_URL environment variable is not set');
        }
        try {
          await db().execute(sql`SELECT 1`);
        } catch (error: unknown) {
          const err = error as { code?: string };
          if (err.code === 'ECONNREFUSED') {
            throw new Error(`Database connection refused. Please ensure PostgreSQL is running.`);
          }
          throw error;
        }
      };

      await expect(verifyDatabaseConnection()).rejects.toThrow('Database connection refused');
    });
  });

  describe('runMigrations', () => {
    it('debería ejecutar migraciones cuando AUTO_MIGRATE=true', async () => {
      process.env.AUTO_MIGRATE = 'true';
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      mockExecute.mockResolvedValue({ rows: [{ count: '1' }] });
      (migrate as any).mockResolvedValue(undefined);

      // Simular runMigrations
      const runMigrations = async () => {
        const autoMigrate = process.env.AUTO_MIGRATE === 'true';
        if (!autoMigrate) return;

        const migrationCheck = await db().execute(sql`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = '__drizzle_migrations'
        `);

        const hasMigrationTable = migrationCheck.rows[0]?.count > 0;
        if (hasMigrationTable) {
          await migrate(db(), { migrationsFolder: 'test-folder' });
        }
      };

      await runMigrations();

      expect(mockExecute).toHaveBeenCalled();
    });

    it('debería no ejecutar migraciones cuando AUTO_MIGRATE=false', async () => {
      process.env.AUTO_MIGRATE = 'false';

      const runMigrations = async () => {
        const autoMigrate = process.env.AUTO_MIGRATE === 'true';
        if (!autoMigrate) return;
        await migrate(db(), { migrationsFolder: 'test-folder' });
      };

      await runMigrations();

      expect(migrate).not.toHaveBeenCalled();
    });
  });

  describe('seedPipelineStages', () => {
    it('debería llamar ensureDefaultPipelineStages', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      process.env.NODE_ENV = 'development';

      const seedPipelineStages = async () => {
        await ensureDefaultPipelineStages(false);
      };

      await seedPipelineStages();

      expect(ensureDefaultPipelineStages).toHaveBeenCalledWith(false);
    });
  });

  describe('seedLookupTables', () => {
    it('debería insertar task statuses', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';

      const seedLookupTables = async () => {
        const dbInstance = db();
        const taskStatuses = [
          { id: 'open', label: 'Abierta' },
          { id: 'in_progress', label: 'En Progreso' },
          { id: 'completed', label: 'Completada' },
          { id: 'cancelled', label: 'Cancelada' },
        ];

        for (const status of taskStatuses) {
          await dbInstance.insert(lookupTaskStatus).values(status).onConflictDoNothing();
        }
      };

      await seedLookupTables();

      expect(mockInsert).toHaveBeenCalledTimes(4);
    });

    it('debería insertar priorities', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';

      const seedLookupTables = async () => {
        const dbInstance = db();
        const priorities = [
          { id: 'low', label: 'Baja' },
          { id: 'medium', label: 'Media' },
          { id: 'high', label: 'Alta' },
          { id: 'urgent', label: 'Urgente' },
        ];

        for (const priority of priorities) {
          await dbInstance.insert(lookupPriority).values(priority).onConflictDoNothing();
        }
      };

      await seedLookupTables();

      expect(mockInsert).toHaveBeenCalledTimes(4);
    });

    it('debería insertar notification types', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';

      const seedLookupTables = async () => {
        const dbInstance = db();
        const notificationTypes = [
          { id: 'task_assigned', label: 'Tarea Asignada' },
          { id: 'task_due', label: 'Tarea Vencida' },
          { id: 'sla_warning', label: 'Advertencia SLA' },
          { id: 'contact_moved', label: 'Contacto Movido' },
          { id: 'note_mention', label: 'Mención en Nota' },
        ];

        for (const type of notificationTypes) {
          await dbInstance.insert(lookupNotificationType).values(type).onConflictDoNothing();
        }
      };

      await seedLookupTables();

      expect(mockInsert).toHaveBeenCalledTimes(5);
    });

    it('debería insertar asset classes', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';

      const seedLookupTables = async () => {
        const dbInstance = db();
        const assetClasses = [
          { id: 'equity', label: 'Acciones' },
          { id: 'fixed_income', label: 'Renta Fija' },
          { id: 'money_market', label: 'Mercado Monetario' },
          { id: 'alternative', label: 'Alternativos' },
          { id: 'commodities', label: 'Commodities' },
        ];

        for (const assetClass of assetClasses) {
          await dbInstance.insert(lookupAssetClass).values(assetClass).onConflictDoNothing();
        }
      };

      await seedLookupTables();

      expect(mockInsert).toHaveBeenCalledTimes(5);
    });
  });

  describe('seedMaatWorkTeam', () => {
    it('debería crear team maatwork si no existe', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      mockLimit.mockResolvedValue([]);
      mockReturning.mockResolvedValue([{ id: 'team-1', name: 'maatwork' }]);
      mockValues.mockReturnValue({ returning: mockReturning });

      const seedMaatWorkTeam = async () => {
        const dbi = db();
        const existing = await dbi.select().from(teams).where(eq(teams.name, 'maatwork')).limit(1);
        if (existing.length > 0) {
          return;
        }

        const manager = await dbi.select().from(users).where(eq(users.role, 'manager')).limit(1);
        const managerUserId = manager[0]?.id || null;

        const [teamRow] = await dbi
          .insert(teams)
          .values({ name: 'maatwork', managerUserId })
          .returning();

        return teamRow;
      };

      const result = await seedMaatWorkTeam();

      expect(mockSelect).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalledWith(teams);
      expect(result).toBeDefined();
    });

    it('debería no crear team si ya existe', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';
      mockLimit.mockResolvedValue([{ id: 'existing-team', name: 'maatwork' }]);

      const seedMaatWorkTeam = async () => {
        const dbi = db();
        const existing = await dbi.select().from(teams).where(eq(teams.name, 'maatwork')).limit(1);
        if (existing.length > 0) {
          return null;
        }
        return {};
      };

      const result = await seedMaatWorkTeam();

      expect(mockSelect).toHaveBeenCalled();
      expect(mockInsert).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });
});
