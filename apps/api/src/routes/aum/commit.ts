/**
 * AUM Commit Routes
 * 
 * AI_DECISION: Modularizar endpoints de commit en archivo separado
 * Justificación: Separar responsabilidades, facilitar mantenimiento y testing
 * Impacto: Código más organizado y mantenible
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { db, aumImportFiles, aumImportRows, brokerAccounts, contacts } from '@cactus/db';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { canAccessAumFile } from '../../auth/authorization';
import { validate } from '../../utils/validation';
import { createErrorResponse } from '../../utils/error-response';
import { transactionWithLogging } from '../../utils/db-transactions';
import { uuidSchema } from '../../utils/common-schemas';
import {
  aumFileIdParamsSchema,
  aumCommitQuerySchema,
  aumConfirmChangesBodySchema
} from '../../utils/aum-validation';

const router = Router();

/**
 * POST /admin/aum/uploads/:fileId/commit
 * Commit matched rows to broker_accounts and contacts
 */
router.post('/uploads/:fileId/commit',
  requireAuth,
  requireRole(['admin', 'manager']),
  validate({ params: aumFileIdParamsSchema, query: aumCommitQuerySchema }),
  async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      const { broker = 'balanz' } = req.query as { broker?: string };
      const userId = (req as any).user?.id as string;
      const userRole = (req as any).user?.role as 'admin' | 'manager' | 'advisor';

      if (!userId || !userRole) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify user has access to this file
      const hasAccess = await canAccessAumFile(userId, userRole, fileId);
      if (!hasAccess) {
        return res.status(404).json({ error: 'File not found' });
      }

      const dbi = db();

      const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
      if (!file) return res.status(404).json({ error: 'File not found' });

      // Check for ambiguous rows that need resolution
      const ambiguousRows = await dbi.select().from(aumImportRows)
        .where(and(eq(aumImportRows.fileId, fileId), eq(aumImportRows.matchStatus, 'ambiguous')));

      if (ambiguousRows.length > 0) {
        return res.status(400).json({
          error: 'Cannot commit file with unresolved conflicts',
          details: `Found ${ambiguousRows.length} rows with ambiguous status. Please resolve conflicts before committing.`
        });
      }

      // Only commit matched rows that are preferred (source of truth)
      const rows = await dbi.select().from(aumImportRows)
        .where(and(
          eq(aumImportRows.fileId, fileId),
          eq(aumImportRows.matchStatus, 'matched'),
          eq(aumImportRows.isPreferred, true)
        ));

      // Use transaction for atomic consistency
      const result = await transactionWithLogging(
        req.log,
        'commit-aum-file',
        async (tx) => {
          let upserts = 0;
          let skipped = 0;

          for (const r of rows) {
            if (!r.accountNumber || !r.matchedContactId) {
              skipped += 1;
              continue;
            }

            // Find existing broker account
            const existing = await tx.select().from(brokerAccounts)
              .where(and(eq(brokerAccounts.broker, broker as string), eq(brokerAccounts.accountNumber, r.accountNumber)))
              .limit(1);

            if (existing.length === 0) {
              await tx.insert(brokerAccounts).values({
                broker: broker as string,
                accountNumber: r.accountNumber,
                holderName: r.holderName ?? null,
                contactId: r.matchedContactId as string,
                status: 'active'
              });
              upserts += 1;
            } else {
              // Update holder name/contact if changed (prefer matched contactId)
              const ex = existing[0];
              const needsUpdate = (ex.holderName !== (r.holderName ?? null)) || (ex.contactId !== r.matchedContactId);
              if (needsUpdate) {
                await tx.update(brokerAccounts)
                  .set({ holderName: r.holderName ?? null, contactId: r.matchedContactId as string, status: 'active' })
                  .where(eq(brokerAccounts.id, ex.id as string));
                upserts += 1;
              }
            }

            // Optionally set advisor on contact if empty and we have a matched user
            if (r.matchedUserId) {
              const [c] = await tx.select({ assignedAdvisorId: contacts.assignedAdvisorId })
                .from(contacts)
                .where(eq(contacts.id, r.matchedContactId as string))
                .limit(1);
              if (c && !c.assignedAdvisorId) {
                await tx.update(contacts)
                  .set({ assignedAdvisorId: r.matchedUserId as string })
                  .where(eq(contacts.id, r.matchedContactId as string));
              }
            }
          }

          // Update file status only if all operations succeeded
          await tx.update(aumImportFiles)
            .set({ status: 'committed' })
            .where(eq(aumImportFiles.id, fileId));

          return { upserts, skipped };
        },
        {
          timeout: 60000, // 60 seconds for long batch operations
          maxRetries: 3
        }
      );

      const { upserts, skipped } = result;

      req.log?.info?.({
        fileId,
        upserts,
        skipped,
        total: rows.length
      }, 'AUM file committed successfully');

      return res.json({
        ok: true,
        upserts,
        skipped,
        total: rows.length,
        message: `${upserts} cuentas sincronizadas` + (skipped > 0 ? `, ${skipped} omitidas` : '')
      });
    } catch (error) {
      req.log?.error?.({ err: error, fileId: req.params.fileId }, 'AUM commit failed');
      return res.status(500).json(
        createErrorResponse({
          error,
          requestId: (req as any).requestId,
          userMessage: 'Error procesando commit de archivo'
        })
      );
    }
  }
);

/**
 * POST /admin/aum/uploads/:fileId/confirm-changes
 * Confirm or reject changes that require confirmation
 */
router.post('/uploads/:fileId/confirm-changes',
  requireAuth,
  validate({
    params: aumFileIdParamsSchema,
    body: aumConfirmChangesBodySchema
  }),
  async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params;
      const { changes } = req.body;
      const userId = req.user?.id as string;
      const userRole = req.user?.role as 'admin' | 'manager' | 'advisor';

      if (!userId || !userRole) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify user has access to this file
      const hasAccess = await canAccessAumFile(userId, userRole, fileId);
      if (!hasAccess) {
        return res.status(404).json({ error: 'File not found' });
      }

      const dbi = db();

      // Ensure file exists
      const [file] = await dbi.select().from(aumImportFiles).where(eq(aumImportFiles.id, fileId)).limit(1);
      if (!file) return res.status(404).json({ error: 'File not found' });

      // Process each confirmation
      for (const change of changes) {
        const { rowId, confirm } = change;

        // Verify that row belongs to file and needs confirmation
        const [row] = await dbi.select({
          id: aumImportRows.id,
          fileId: aumImportRows.fileId,
          needsConfirmation: aumImportRows.needsConfirmation,
          accountNumber: aumImportRows.accountNumber
        })
          .from(aumImportRows)
          .where(and(
            eq(aumImportRows.id, rowId),
            eq(aumImportRows.fileId, fileId),
            eq(aumImportRows.needsConfirmation, true)
          ))
          .limit(1);

        if (!row) {
          req.log?.warn?.({ rowId, fileId }, 'Row not found or does not need confirmation');
          continue;
        }

        if (confirm) {
          // Confirm change: keep new accountNumber and remove needsConfirmation
          await dbi.update(aumImportRows)
            .set({
              needsConfirmation: false,
              conflictDetected: false
            })
            .where(eq(aumImportRows.id, rowId));
        } else {
          // Reject change: remove needsConfirmation but keep current accountNumber
          // Note: Future implementation could restore previous accountNumber from a separate field
          await dbi.update(aumImportRows)
            .set({
              needsConfirmation: false,
              conflictDetected: false
            })
            .where(eq(aumImportRows.id, rowId));
        }
      }

      req.log?.info?.({
        fileId,
        changesCount: changes.length
      }, 'AUM changes confirmed/rejected');

      return res.json({
        ok: true,
        message: `Procesadas ${changes.length} confirmaciones`
      });
    } catch (error) {
      req.log?.error?.({ err: error }, 'AUM confirm changes failed');
      return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  }
);

export default router;

