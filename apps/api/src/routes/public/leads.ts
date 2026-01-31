import { Router, type Request, type Response } from 'express';
import { db, contacts } from '@maatwork/db';
import { createDrizzleLogger } from '../../utils/database/db-logger';
import { createAsyncHandler } from '../../utils/route-handler';
import { z } from 'zod';

const router = Router();

const createLeadSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(5, 'Teléfono requerido'),
  interest: z.string().optional(),
});

/**
 * POST /v1/public/leads
 * Public endpoint for landing page contact form
 */
router.post(
  '/',
  createAsyncHandler(async (req: Request, res: Response) => {
    // 1. Validate Input
    const validation = createLeadSchema.safeParse(req.body);
    if (!validation.success) {
      req.log.warn({ errors: validation.error }, 'Invalid lead submission');
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        details: validation.error.format(),
      });
    }

    const { name, email, phone, interest } = validation.data;
    const parts = name.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '-';

    req.log.info({ email, interest }, 'Processing new public lead');

    // 2. Insert Contact
    const dbLogger = createDrizzleLogger(req.log);
    const result = await dbLogger.insert('create_public_lead', () =>
      db()
        .insert(contacts)
        .values({
          firstName,
          lastName,
          fullName: name,
          email,
          phone,
          source: 'Website Landing Page',
          customFields: {
            interest: interest || 'General',
            origin: 'landing_page_form',
            capturedAt: new Date().toISOString(),
          },
        })
        .returning()
    );

    const [newContact] = result as { id: string }[];

    if (!newContact) {
      throw new Error('Failed to create lead');
    }

    // 3. Return Success
    req.log.info({ contactId: newContact.id }, 'Public lead created successfully');

    return res.status(201).json({
      success: true,
      message: 'Consulta recibida correctamente',
      data: { id: newContact.id },
    });
  })
);

export default router;
