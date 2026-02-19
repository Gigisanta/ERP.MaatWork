
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listPortfolios, deletePortfolio, getPortfolioById, updatePortfolio, createPortfolio } from './portfolios';
import { db } from '@maatwork/db';

// Mock DB and Schema
vi.mock('@maatwork/db', () => {
  const mockTable = {
    id: 'id',
    name: 'name',
    deletedAt: 'deletedAt',
    type: 'type',
    riskLevel: 'riskLevel',
    code: 'code',
    description: 'description',
    isSystem: 'isSystem',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    status: 'status',
    portfolioId: 'portfolioId',
  };
  return {
    db: vi.fn(),
    portfolios: mockTable,
    portfolioLines: mockTable,
    clientPortfolioAssignments: mockTable,
    instruments: mockTable,
    lookupAssetClass: mockTable,
  };
});

// Mock Drizzle operators
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: vi.fn(),
    and: vi.fn(),
    or: vi.fn(),
    sql: vi.fn((strings, ...values) => ({ 
      strings, 
      values,
      as: vi.fn((a) => a),
      mapWith: vi.fn((v) => v)
    })),
    desc: vi.fn((c) => c),
    asc: vi.fn((c) => c),
    ilike: vi.fn(),
  };
});

// Mock db logger
vi.mock('../../../utils/database/db-logger', () => ({
  createDrizzleLogger: () => ({
    select: vi.fn((name, fn) => fn()),
  }),
  createOperationName: (op: string, id: string) => `${op}_${id}`,
}));

vi.mock('../../../middleware/cache', () => ({
  invalidateCache: vi.fn(),
}));

// Mock services/utils
vi.mock('../../../services/portfolio-service', () => ({
  getPortfolioLines: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../utils/portfolio-utils', () => ({
  calculateTotalWeight: vi.fn().mockReturnValue(1),
  isValidTotalWeight: vi.fn().mockReturnValue(true),
}));

const mockDb = vi.mocked(db);
const mockUser = { id: 'u-1', email: 'test@example.com', role: 'admin' };

describe('Portfolio Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.mockReset();
  });

  const createMockQueryBuilder = (data: any = []) => {
    const qb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue(data),
      values: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      as: vi.fn((a) => a),
    };
    // Support for Promise.all on query builder if needed
    (qb as any).then = (resolve: any) => Promise.resolve(data).then(resolve);
    return qb;
  };

  describe('listPortfolios', () => {
    it('should return portfolios with pagination', async () => {
      const mockResult = [{ id: 'p-1', name: 'P1' }];
      const qb = createMockQueryBuilder(mockResult);
      mockDb.mockReturnValue(qb as any);
      
      const req = { 
        query: { page: '1', limit: '10' }, 
        user: mockUser,
        log: {} 
      } as any;
      
      const result = await listPortfolios(req);
      
      expect(result.data).toBeDefined();
      expect(result.pagination).toBeDefined();
    });
  });

  describe('getPortfolioById', () => {
    it('should return portfolio complete object', async () => {
      const mockPortfolio = { id: 'p-1', name: 'P1' };
      const qb = createMockQueryBuilder([mockPortfolio]);
      mockDb.mockReturnValue(qb as any);
      
      const req = { params: { id: 'p-1' }, user: mockUser, log: {} } as any;
      const result = await getPortfolioById(req);
      
      expect(result.id).toBe('p-1');
      expect(result.lines).toBeDefined();
    });

    it('should throw 404 if not found', async () => {
      const qb = createMockQueryBuilder([]);
      mockDb.mockReturnValue(qb as any);

      const req = { params: { id: 'p-404' }, user: mockUser, log: {} } as any;
      await expect(getPortfolioById(req)).rejects.toThrow('Portfolio no encontrado');
    });
  });

  describe('createPortfolio', () => {
    it('should create and return the portfolio object', async () => {
      const req = { 
        body: { name: 'New P' },
        user: mockUser
      } as any;
      
      const mockPortfolio = { id: 'p-new', name: 'New P' };
      const qb = createMockQueryBuilder([mockPortfolio]);
      mockDb.mockReturnValue(qb as any);

      const result = await createPortfolio(req);
      expect(result.id).toBe('p-new');
    });
  });

  describe('updatePortfolio', () => {
    it('should update and return the updated object', async () => {
      const req = { 
        params: { id: 'p-1' },
        body: { name: 'Updated' },
        user: mockUser
      } as any;
      
      const mockPortfolio = { id: 'p-1', name: 'Updated' };
      const qb = createMockQueryBuilder([mockPortfolio]);
      mockDb.mockReturnValue(qb as any);

      const result = await updatePortfolio(req);
      expect(result.name).toBe('Updated');
    });
  });

  describe('deletePortfolio', () => {
    it('should soft delete and return success true', async () => {
      const req = { params: { id: 'p-1' }, user: mockUser } as any;
      
      const qb = createMockQueryBuilder([{ id: 'p-1' }]);
      mockDb.mockReturnValue(qb as any);

      const result = await deletePortfolio(req);
      expect(result.success).toBe(true);
    });
  });
});
