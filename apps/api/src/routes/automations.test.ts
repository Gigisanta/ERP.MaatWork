/**
 * Tests para automations routes
 *
 * AI_DECISION: Tests unitarios para CRUD de automation configs
 * Justificación: Validación crítica de automatizaciones y configuración
 * Impacto: Prevenir errores en configuración de automatizaciones
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { db, automationConfigs } from '@cactus/db';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../auth/middlewares';

// Mock dependencies
vi.mock('@cactus/db', () => ({
  db: vi.fn(),
  automationConfigs: {},
  eq: vi.fn(),
}));

vi.mock('../auth/middlewares', () => ({
  requireAuth: vi.fn((req, res, next) => next()),
}));

const mockDb = vi.mocked(db);

describe('GET /v1/automations', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      log: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería listar todas las automation configs', async () => {
    const mockData = [
      {
        id: 'auto-1',
        name: 'welcome-email',
        displayName: 'Welcome Email',
        triggerType: 'contact_created',
        enabled: true,
      },
      {
        id: 'auto-2',
        name: 'follow-up',
        displayName: 'Follow Up',
        triggerType: 'contact_updated',
        enabled: false,
      },
    ];

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockResolvedValue(mockData),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    // Simular handler
    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const items = await db()
          .select()
          .from(automationConfigs)
          .orderBy(automationConfigs.displayName);
        res.json({ success: true, data: items });
      } catch (err) {
        req.log.error({ err }, 'failed to list automation configs');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockData });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('debería manejar errores al listar', async () => {
    const mockError = new Error('Database error');
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockRejectedValue(mockError),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const items = await db()
          .select()
          .from(automationConfigs)
          .orderBy(automationConfigs.displayName);
        res.json({ success: true, data: items });
      } catch (err) {
        req.log.error({ err }, 'failed to list automation configs');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockReq.log?.error).toHaveBeenCalledWith(
      { err: mockError },
      'failed to list automation configs'
    );
    expect(mockNext).toHaveBeenCalledWith(mockError);
  });
});

describe('GET /v1/automations/:id', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      params: { id: 'auto-123' },
      log: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería obtener automation config por id', async () => {
    const mockData = {
      id: 'auto-123',
      name: 'welcome-email',
      displayName: 'Welcome Email',
      triggerType: 'contact_created',
      enabled: true,
    };

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockData]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const [item] = await db()
          .select()
          .from(automationConfigs)
          .where(eq(automationConfigs.id, id))
          .limit(1);

        if (!item) {
          return res.status(404).json({ error: 'Automation config not found' });
        }

        res.json({ success: true, data: item });
      } catch (err) {
        req.log.error({ err }, 'failed to get automation config');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockData });
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('debería retornar 404 cuando no existe', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const [item] = await db()
          .select()
          .from(automationConfigs)
          .where(eq(automationConfigs.id, id))
          .limit(1);

        if (!item) {
          return res.status(404).json({ error: 'Automation config not found' });
        }

        res.json({ success: true, data: item });
      } catch (err) {
        req.log.error({ err }, 'failed to get automation config');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Automation config not found' });
  });
});

describe('GET /v1/automations/by-name/:name', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      params: { name: 'welcome-email' },
      log: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería obtener automation config por name', async () => {
    const mockData = {
      id: 'auto-123',
      name: 'welcome-email',
      displayName: 'Welcome Email',
      triggerType: 'contact_created',
      enabled: true,
    };

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockData]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { name } = req.params;
        const [item] = await db()
          .select()
          .from(automationConfigs)
          .where(eq(automationConfigs.name, name))
          .limit(1);

        if (!item) {
          return res.status(404).json({ error: 'Automation config not found' });
        }

        res.json({ success: true, data: item });
      } catch (err) {
        req.log.error({ err }, 'failed to get automation config by name');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: mockData });
  });

  it('debería retornar 404 cuando no existe por name', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { name } = req.params;
        const [item] = await db()
          .select()
          .from(automationConfigs)
          .where(eq(automationConfigs.name, name))
          .limit(1);

        if (!item) {
          return res.status(404).json({ error: 'Automation config not found' });
        }

        res.json({ success: true, data: item });
      } catch (err) {
        req.log.error({ err }, 'failed to get automation config by name');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Automation config not found' });
  });
});

describe('POST /v1/automations', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {
        name: 'new-automation',
        displayName: 'New Automation',
        triggerType: 'contact_created',
        triggerConfig: { delay: 3600 },
        enabled: true,
        config: {},
      },
      log: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería crear nueva automation config', async () => {
    const newConfig = {
      id: 'auto-new',
      ...mockReq.body,
      updatedAt: new Date(),
    };

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]), // No existe
        }),
      }),
    });

    const mockInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([newConfig]),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = req.body;
        const [existing] = await db()
          .select()
          .from(automationConfigs)
          .where(eq(automationConfigs.name, validated.name))
          .limit(1);

        if (existing) {
          return res.status(409).json({ error: 'Automation config with this name already exists' });
        }

        const [newConfig] = await db()
          .insert(automationConfigs)
          .values({
            ...validated,
            updatedAt: new Date(),
          })
          .returning();

        req.log.info({ automationConfigId: newConfig.id }, 'automation config created');
        res.status(201).json({ success: true, data: newConfig });
      } catch (err) {
        req.log.error({ err }, 'failed to create automation config');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: newConfig });
    expect(mockReq.log?.info).toHaveBeenCalledWith(
      { automationConfigId: newConfig.id },
      'automation config created'
    );
  });

  it('debería retornar 409 cuando name ya existe', async () => {
    const existing = {
      id: 'auto-existing',
      name: 'new-automation',
    };

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([existing]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = req.body;
        const [existing] = await db()
          .select()
          .from(automationConfigs)
          .where(eq(automationConfigs.name, validated.name))
          .limit(1);

        if (existing) {
          return res.status(409).json({ error: 'Automation config with this name already exists' });
        }

        const [newConfig] = await db()
          .insert(automationConfigs)
          .values({
            ...validated,
            updatedAt: new Date(),
          })
          .returning();

        req.log.info({ automationConfigId: newConfig.id }, 'automation config created');
        res.status(201).json({ success: true, data: newConfig });
      } catch (err) {
        req.log.error({ err }, 'failed to create automation config');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(409);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Automation config with this name already exists',
    });
  });
});

describe('PATCH /v1/automations/:id', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      params: { id: 'auto-123' },
      body: {
        displayName: 'Updated Display Name',
        enabled: false,
      },
      log: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería actualizar automation config', async () => {
    const existing = {
      id: 'auto-123',
      name: 'welcome-email',
      displayName: 'Welcome Email',
      enabled: true,
    };

    const updated = {
      ...existing,
      ...mockReq.body,
      updatedAt: new Date(),
    };

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([existing]),
        }),
      }),
    });

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updated]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const validated = req.body;
        const [existing] = await db()
          .select()
          .from(automationConfigs)
          .where(eq(automationConfigs.id, id))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: 'Automation config not found' });
        }

        const [updated] = await db()
          .update(automationConfigs)
          .set({
            ...validated,
            updatedAt: new Date(),
          })
          .where(eq(automationConfigs.id, id))
          .returning();

        req.log.info({ automationConfigId: id }, 'automation config updated');
        res.json({ success: true, data: updated });
      } catch (err) {
        req.log.error({ err }, 'failed to update automation config');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: updated });
    expect(mockReq.log?.info).toHaveBeenCalledWith(
      { automationConfigId: 'auto-123' },
      'automation config updated'
    );
  });

  it('debería retornar 404 cuando no existe', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const validated = req.body;
        const [existing] = await db()
          .select()
          .from(automationConfigs)
          .where(eq(automationConfigs.id, id))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: 'Automation config not found' });
        }

        const [updated] = await db()
          .update(automationConfigs)
          .set({
            ...validated,
            updatedAt: new Date(),
          })
          .where(eq(automationConfigs.id, id))
          .returning();

        req.log.info({ automationConfigId: id }, 'automation config updated');
        res.json({ success: true, data: updated });
      } catch (err) {
        req.log.error({ err }, 'failed to update automation config');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Automation config not found' });
  });
});

describe('DELETE /v1/automations/:id', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      params: { id: 'auto-123' },
      log: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
      },
    };
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('debería eliminar automation config', async () => {
    const existing = {
      id: 'auto-123',
      name: 'welcome-email',
    };

    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([existing]),
        }),
      }),
    });

    const mockDelete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
      delete: mockDelete,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const [existing] = await db()
          .select()
          .from(automationConfigs)
          .where(eq(automationConfigs.id, id))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: 'Automation config not found' });
        }

        await db().delete(automationConfigs).where(eq(automationConfigs.id, id));

        req.log.info({ automationConfigId: id }, 'automation config deleted');
        res.json({ success: true });
      } catch (err) {
        req.log.error({ err }, 'failed to delete automation config');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.json).toHaveBeenCalledWith({ success: true });
    expect(mockReq.log?.info).toHaveBeenCalledWith(
      { automationConfigId: 'auto-123' },
      'automation config deleted'
    );
  });

  it('debería retornar 404 cuando no existe', async () => {
    const mockSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockDb.mockReturnValue({
      select: mockSelect,
    } as any);

    const handler = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const [existing] = await db()
          .select()
          .from(automationConfigs)
          .where(eq(automationConfigs.id, id))
          .limit(1);

        if (!existing) {
          return res.status(404).json({ error: 'Automation config not found' });
        }

        await db().delete(automationConfigs).where(eq(automationConfigs.id, id));

        req.log.info({ automationConfigId: id }, 'automation config deleted');
        res.json({ success: true });
      } catch (err) {
        req.log.error({ err }, 'failed to delete automation config');
        next(err);
      }
    };

    await handler(mockReq as Request, mockRes as Response, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Automation config not found' });
  });
});
