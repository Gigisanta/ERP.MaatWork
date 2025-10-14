import { DiffEngine } from '../diff-engine';

// Mock de la base de datos
jest.mock('@cactus/db', () => ({
  db: () => ({
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis()
  }),
  maestroCuentas: 'maestroCuentas',
  stagingMensual: 'stagingMensual',
  diffDetalle: 'diffDetalle',
  auditoriaCargas: 'auditoriaCargas'
}));

describe('DiffEngine', () => {
  let diffEngine: DiffEngine;
  let mockDb: any;

  beforeEach(() => {
    diffEngine = new DiffEngine();
    mockDb = (diffEngine as any).db;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeDiff', () => {
    it('should detect new records', async () => {
      // Mock staging data
      const stagingData = [
        {
          idcuenta: '12345',
          comitente: 1001,
          cuotapartista: 1,
          descripcion: 'Nuevo Cliente',
          asesor: 'Juan Pérez'
        }
      ];

      // Mock maestro data (empty)
      const maestroData: any[] = [];

      // Setup mocks
      mockDb.select.mockImplementation((query: any) => {
        if (query === 'stagingMensual') {
          return Promise.resolve(stagingData);
        } else if (query === 'maestroCuentas') {
          return Promise.resolve(maestroData);
        }
        return Promise.resolve([]);
      });

      mockDb.where.mockImplementation((condition: any) => {
        if (condition.toString().includes('cargaId')) {
          return Promise.resolve(stagingData);
        } else if (condition.toString().includes('activo')) {
          return Promise.resolve(maestroData);
        }
        return Promise.resolve([]);
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue([])
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      const result = await diffEngine.executeDiff('test-carga-id');

      expect(result.nuevos).toHaveLength(1);
      expect(result.nuevos[0].idcuenta).toBe('12345');
      expect(result.nuevos[0].necesitaAsesor).toBe(false);
      expect(result.modificados).toHaveLength(0);
      expect(result.resumen.totalNuevos).toBe(1);
    });

    it('should detect modified records', async () => {
      // Mock staging data
      const stagingData = [
        {
          idcuenta: '12345',
          comitente: 1001,
          cuotapartista: 1,
          descripcion: 'Cliente Modificado',
          asesor: 'Juan Pérez'
        }
      ];

      // Mock maestro data (same idcuenta, different descripcion)
      const maestroData = [
        {
          idcuenta: '12345',
          comitente: 1001,
          cuotapartista: 1,
          descripcion: 'Cliente Original',
          asesor: 'María González'
        }
      ];

      // Setup mocks similar to previous test
      mockDb.select.mockImplementation((query: any) => {
        if (query === 'stagingMensual') {
          return Promise.resolve(stagingData);
        } else if (query === 'maestroCuentas') {
          return Promise.resolve(maestroData);
        }
        return Promise.resolve([]);
      });

      mockDb.where.mockImplementation((condition: any) => {
        if (condition.toString().includes('cargaId')) {
          return Promise.resolve(stagingData);
        } else if (condition.toString().includes('activo')) {
          return Promise.resolve(maestroData);
        }
        return Promise.resolve([]);
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue([])
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      const result = await diffEngine.executeDiff('test-carga-id');

      expect(result.nuevos).toHaveLength(0);
      expect(result.modificados).toHaveLength(1);
      expect(result.modificados[0].idcuenta).toBe('12345');
      expect(result.modificados[0].camposCambiados).toContain('descripcion');
      expect(result.resumen.totalModificados).toBe(1);
    });

    it('should identify records without asesor', async () => {
      // Mock staging data
      const stagingData = [
        {
          idcuenta: '12345',
          comitente: 1001,
          cuotapartista: 1,
          descripcion: 'Cliente Sin Asesor',
          asesor: null
        }
      ];

      // Mock maestro data (empty)
      const maestroData: any[] = [];

      // Setup mocks
      mockDb.select.mockImplementation((query: any) => {
        if (query === 'stagingMensual') {
          return Promise.resolve(stagingData);
        } else if (query === 'maestroCuentas') {
          return Promise.resolve(maestroData);
        }
        return Promise.resolve([]);
      });

      mockDb.where.mockImplementation((condition: any) => {
        if (condition.toString().includes('cargaId')) {
          return Promise.resolve(stagingData);
        } else if (condition.toString().includes('activo')) {
          return Promise.resolve(maestroData);
        }
        return Promise.resolve([]);
      });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue([])
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      });

      const result = await diffEngine.executeDiff('test-carga-id');

      expect(result.sinAsesor).toHaveLength(1);
      expect(result.sinAsesor[0].idcuenta).toBe('12345');
      expect(result.sinAsesor[0].esNuevo).toBe(true);
      expect(result.resumen.totalSinAsesor).toBe(1);
    });
  });

  describe('getDiffSummary', () => {
    it('should return diff summary for a carga', async () => {
      const mockCarga = {
        id: 'test-carga-id',
        nuevosDetectados: 5,
        modificadosDetectados: 3,
        sinAsesor: 2,
        totalRegistros: 10
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockCarga])
          })
        })
      });

      const result = await diffEngine.getDiffSummary('test-carga-id');

      expect(result.totalNuevos).toBe(5);
      expect(result.totalModificados).toBe(3);
      expect(result.totalSinAsesor).toBe(2);
      expect(result.totalRegistros).toBe(10);
      expect(result.porcentajeSinAsesor).toBe(20); // 2/10 * 100
    });
  });
});



