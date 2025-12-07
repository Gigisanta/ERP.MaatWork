/**
 * Contacts Update Routes
 *
 * PUT /contacts/:id - Full update
 * PATCH /contacts/:id - Partial update
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, contacts, contactFieldHistory, pipelineStageHistory, users } from '@cactus/db';
import { eq, and, isNull, type InferSelectModel } from 'drizzle-orm';
import { requireAuth, requireWriteAccess } from '../../auth/middlewares';
import { canAccessContact, canAssignContactTo } from '../../auth/authorization';
import { transactionWithLogging } from '../../utils/db-transactions';
import { validate } from '../../utils/validation';
import { idParamSchema } from '../../utils/common-schemas';
import { type ContactUpdateFields } from '../../types/contacts';
import { contactsListCacheUtil } from '../../utils/cache';
import { updateContactSchema, patchContactSchema } from './schemas';
import { invalidateCache } from '../../middleware/cache';

const router = Router();

/**
 * PUT /contacts/:id - Full update contact
 */
router.put(
  '/:id',
  requireAuth,
  requireWriteAccess, // Bloquear Owner (solo lectura)
  validate({
    params: idParamSchema,
    body: updateContactSchema,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const validated = req.body;

      const userId = req.user!.id;
      const userRole = req.user!.role;
      const hasAccess = await canAccessContact(userId, userRole, id);

      if (!hasAccess) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      const [existing] = await db()
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, id), isNull(contacts.deletedAt)))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      // Enforce assignment rules if assignedAdvisorId is being updated
      let validatedAdvisorId = validated.assignedAdvisorId;
      let advisorWarning = null;

      if (
        validated.assignedAdvisorId !== undefined &&
        validated.assignedAdvisorId !== existing.assignedAdvisorId
      ) {
        const canAssign = await canAssignContactTo(userId, userRole, validated.assignedAdvisorId);

        if (!canAssign) {
          req.log.warn(
            {
              contactId: id,
              requestedAdvisorId: validated.assignedAdvisorId,
              currentAdvisorId: existing.assignedAdvisorId,
              userRole,
              userId,
            },
            'user cannot reassign contact to requested advisor'
          );

          if (userRole === 'advisor') {
            validatedAdvisorId = userId;
            advisorWarning = `Como asesor, el contacto se asignó automáticamente a usted.`;
          } else {
            validatedAdvisorId = existing.assignedAdvisorId;
            advisorWarning = `No tiene permisos para reasignar a ese asesor. Se mantiene la asignación actual.`;
          }
        } else if (validated.assignedAdvisorId) {
          const [advisor] = await db()
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.id, validated.assignedAdvisorId), eq(users.isActive, true)))
            .limit(1);

          if (!advisor) {
            req.log.warn(
              {
                contactId: id,
                requestedAdvisorId: validated.assignedAdvisorId,
              },
              'requested advisor ID does not exist or is inactive, keeping current assignment'
            );

            validatedAdvisorId = existing.assignedAdvisorId;
            advisorWarning = `El asesor solicitado no existe o está inactivo. Se mantiene la asignación actual.`;
          }
        }
      }

      let fullName = existing.fullName;
      if (validated.firstName || validated.lastName) {
        fullName = `${validated.firstName || existing.firstName} ${validated.lastName || existing.lastName}`;
      }

      const pipelineStageChanged =
        validated.pipelineStageId !== undefined &&
        validated.pipelineStageId !== existing.pipelineStageId;
      const oldPipelineStageId = existing.pipelineStageId;
      const newPipelineStageId = validated.pipelineStageId;

      const updateData: {
        [key: string]: unknown;
      } = {
        ...validated,
        assignedAdvisorId: validatedAdvisorId,
        fullName,
        version: existing.version + 1,
        updatedAt: new Date(),
      };

      if (pipelineStageChanged && newPipelineStageId) {
        updateData.pipelineStageUpdatedAt = new Date();
      }

      const changedFields = Object.keys(validated).filter((key) => {
        return validated[key as keyof typeof validated] !== existing[key as keyof typeof existing];
      });

      const updated = await transactionWithLogging(
        req.log,
        'update-contact-with-history',
        async (tx) => {
          const updateResult = await tx
            .update(contacts)
            .set(updateData)
            .where(and(eq(contacts.id, id), eq(contacts.version, existing.version)))
            .returning();

          // Type assertion needed because Drizzle's transaction type inference is complex
          const updatedContacts = updateResult as InferSelectModel<typeof contacts>[];
          const updatedContact = updatedContacts[0];

          if (!updatedContact) {
            const [current] = await tx
              .select({ version: contacts.version })
              .from(contacts)
              .where(eq(contacts.id, id))
              .limit(1);

            if (current && current.version !== existing.version) {
              const versionError = new Error('Version conflict');
              versionError.name = 'VersionConflictError';
              throw versionError;
            }
            throw new Error('Contact not found');
          }

          if (changedFields.length > 0 && req.user?.id) {
            await tx.insert(contactFieldHistory).values(
              changedFields.map((field) => ({
                contactId: id,
                fieldName: field,
                oldValue: String(existing[field as keyof typeof existing] || ''),
                newValue: String(validated[field as keyof typeof validated] || ''),
                changedByUserId: req.user!.id,
              }))
            );
          }

          if (
            pipelineStageChanged &&
            newPipelineStageId &&
            req.user?.id &&
            req.user.id !== '00000000-0000-0000-0000-000000000001'
          ) {
            await tx.insert(pipelineStageHistory).values({
              contactId: id,
              fromStage: oldPipelineStageId || null,
              toStage: newPipelineStageId,
              reason: null,
              changedByUserId: req.user.id,
            });
            req.log.info(
              { contactId: id, fromStage: oldPipelineStageId, toStage: newPipelineStageId },
              'pipeline stage changed via contact update'
            );
          }

          return updatedContact;
        }
      );

      // Invalidate caches
      contactsListCacheUtil.clear();
      // Invalidate Redis cache for contacts and pipeline (if stage changed)
      await invalidateCache('crm:contacts:*');
      if (pipelineStageChanged) {
        await invalidateCache('crm:pipeline:*');
      }

      req.log.info({ contactId: id, changedFields }, 'contact updated');
      res.json({
        success: true,
        data: updated,
        warning: advisorWarning,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'VersionConflictError') {
        return res.status(409).json({
          error: 'Version conflict',
          message: 'El recurso fue modificado por otro usuario. Por favor recarga la página.',
        });
      }

      req.log.error({ err, contactId: req.params.id }, 'failed to update contact');
      next(err);
    }
  }
);

/**
 * PATCH /contacts/:id - Partial update contact
 */
router.patch(
  '/:id',
  requireAuth,
  requireWriteAccess, // Bloquear Owner (solo lectura)
  validate({
    params: idParamSchema,
    body: patchContactSchema,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { fields } = req.body;

      const userId = req.user!.id;
      const userRole = req.user!.role;
      const hasAccess = await canAccessContact(userId, userRole, id);

      if (!hasAccess) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      const [existing] = await db()
        .select()
        .from(contacts)
        .where(and(eq(contacts.id, id), isNull(contacts.deletedAt)))
        .limit(1);

      if (!existing) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      const updates: ContactUpdateFields = {
        version: existing.version + 1,
        updatedAt: new Date(),
      };

      for (const { field, value } of fields) {
        updates[field] = value;
      }

      // Enforce assignment rules if assignedAdvisorId is being updated
      let advisorWarning = null;

      if (
        updates.assignedAdvisorId !== undefined &&
        updates.assignedAdvisorId !== existing.assignedAdvisorId
      ) {
        const targetAdvisorId =
          typeof updates.assignedAdvisorId === 'string' || updates.assignedAdvisorId === null
            ? (updates.assignedAdvisorId as string | null)
            : null;
        const canAssign = await canAssignContactTo(userId, userRole, targetAdvisorId);

        if (!canAssign) {
          req.log.warn(
            {
              contactId: id,
              requestedAdvisorId: updates.assignedAdvisorId,
              currentAdvisorId: existing.assignedAdvisorId,
              userRole,
              userId,
            },
            'user cannot reassign contact to requested advisor'
          );

          if (userRole === 'advisor') {
            updates.assignedAdvisorId = userId;
            advisorWarning = `Como asesor, el contacto se asignó automáticamente a usted.`;
          } else {
            updates.assignedAdvisorId = existing.assignedAdvisorId;
            advisorWarning = `No tiene permisos para reasignar a ese asesor. Se mantiene la asignación actual.`;
          }
        } else if (updates.assignedAdvisorId) {
          const [advisor] = await db()
            .select({ id: users.id })
            .from(users)
            .where(and(eq(users.id, updates.assignedAdvisorId), eq(users.isActive, true)))
            .limit(1);

          if (!advisor) {
            req.log.warn(
              {
                contactId: id,
                requestedAdvisorId: updates.assignedAdvisorId,
              },
              'requested advisor ID does not exist or is inactive, keeping current assignment'
            );

            updates.assignedAdvisorId = existing.assignedAdvisorId;
            advisorWarning = `El asesor solicitado no existe o está inactivo. Se mantiene la asignación actual.`;
          }
        }
      }

      const pipelineStageField = fields.find(
        (f: { field: string; value: unknown }) => f.field === 'pipelineStageId'
      );
      const pipelineStageChanged =
        pipelineStageField && pipelineStageField.value !== existing.pipelineStageId;
      const oldPipelineStageId = existing.pipelineStageId;
      const newPipelineStageId = pipelineStageField?.value as string | null | undefined;

      if (pipelineStageChanged && newPipelineStageId) {
        updates.pipelineStageUpdatedAt = new Date();
      }

      const [updated] = await db()
        .update(contacts)
        .set(updates)
        .where(and(eq(contacts.id, id), eq(contacts.version, existing.version)))
        .returning();

      if (!updated) {
        req.log.warn(
          {
            contactId: id,
            expectedVersion: existing.version,
            message: 'Version conflict detected in PATCH',
          },
          'Contact PATCH failed due to version conflict'
        );

        return res.status(409).json({
          error: 'Version conflict',
          message: 'El recurso fue modificado por otro usuario. Por favor recarga la página.',
        });
      }

      if (req.user?.id) {
        await db()
          .insert(contactFieldHistory)
          .values(
            fields.map(({ field, value }: { field: string; value: unknown }) => ({
              contactId: id,
              fieldName: field,
              oldValue: String(existing[field as keyof typeof existing] || ''),
              newValue: String(value || ''),
              changedByUserId: req.user!.id,
            }))
          );
      }

      if (
        pipelineStageChanged &&
        newPipelineStageId &&
        req.user?.id &&
        req.user.id !== '00000000-0000-0000-0000-000000000001'
      ) {
        await db()
          .insert(pipelineStageHistory)
          .values({
            contactId: id,
            fromStage: oldPipelineStageId || null,
            toStage: newPipelineStageId,
            reason: null,
            changedByUserId: req.user.id,
          });
        req.log.info(
          { contactId: id, fromStage: oldPipelineStageId, toStage: newPipelineStageId },
          'pipeline stage changed via contact patch'
        );
      }

      // Invalidate caches
      contactsListCacheUtil.clear();
      // Invalidate Redis cache for contacts and pipeline (if stage changed)
      await invalidateCache('crm:contacts:*');
      if (pipelineStageChanged) {
        await invalidateCache('crm:pipeline:*');
      }

      req.log.info(
        { contactId: id, fields: fields.map((f: { field: string; value: unknown }) => f.field) },
        'contact patched'
      );
      res.json({
        success: true,
        data: updated,
        warning: advisorWarning,
      });
    } catch (err) {
      req.log.error({ err, contactId: req.params.id }, 'failed to patch contact');
      next(err);
    }
  }
);

export default router;
