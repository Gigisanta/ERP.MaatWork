/**
 * Contact Tags Handlers
 *
 * Handles tag-contact relationships: assign, remove, batch, update
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, tags, contactTags, contacts } from '@cactus/db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { requireAuth } from '../../../auth/middlewares';
import {
  canAccessContact,
  getUserAccessScope,
  buildContactAccessFilter,
} from '../../../auth/authorization';
import { validate } from '../../../utils/validation';
import { idParamSchema } from '../../../utils/validation/common-schemas';
import {
  assignTagsSchema,
  updateContactTagsSchema,
  updateContactTagSchema,
  batchContactTagsQuerySchema,
  contactTagParamsSchema,
} from '../schemas';

const router = Router();

// POST /tags/:id/contacts - Assign tag to contacts
router.post(
  '/:id/contacts',
  requireAuth,
  validate({
    params: idParamSchema,
    body: assignTagsSchema,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { contactIds } = req.body;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      // Verify user has access to all contacts
      const accessibleContactIds = [];
      for (const contactId of contactIds) {
        const hasAccess = await canAccessContact(userId, userRole, contactId);
        if (hasAccess) {
          accessibleContactIds.push(contactId);
        } else {
          req.log.warn(
            { tagId: id, contactId, userId, userRole },
            'user attempted to add tag to inaccessible contact'
          );
        }
      }

      if (accessibleContactIds.length === 0) {
        return res.status(403).json({ error: 'No access to any of the specified contacts' });
      }

      // Verify tag exists
      const [tag] = await db().select().from(tags).where(eq(tags.id, id)).limit(1);

      if (!tag) {
        return res.status(404).json({ error: 'Tag not found' });
      }

      // Insert relationships (ignore duplicates)
      const values = accessibleContactIds.map((contactId) => ({ tagId: id, contactId }));
      await db().insert(contactTags).values(values).onConflictDoNothing();

      req.log.info(
        { tagId: id, count: accessibleContactIds.length },
        'tag assigned to accessible contacts'
      );
      res.json({
        data: {
          assigned: accessibleContactIds.length,
          denied: contactIds.length - accessibleContactIds.length,
        },
      });
    } catch (err) {
      req.log.error({ err, tagId: req.params.id }, 'failed to assign tag');
      next(err);
    }
  }
);

// DELETE /tags/:id/contacts/:contactId - Remove tag from contact
router.delete(
  '/:id/contacts/:contactId',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, contactId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const hasAccess = await canAccessContact(userId, userRole, contactId);

      if (!hasAccess) {
        req.log.warn(
          { tagId: id, contactId, userId, userRole },
          'user attempted to remove tag from inaccessible contact'
        );
        return res.status(404).json({ error: 'Contact not found' });
      }

      await db()
        .delete(contactTags)
        .where(and(eq(contactTags.tagId, id), eq(contactTags.contactId, contactId)));

      req.log.info({ tagId: id, contactId }, 'tag removed from contact');
      res.json({ success: true, data: { removed: true } });
    } catch (err) {
      req.log.error({ err, tagId: req.params.id }, 'failed to remove tag');
      next(err);
    }
  }
);

// GET /contacts/batch - Get tags for multiple contacts (batch)
router.get(
  '/contacts/batch',
  requireAuth,
  validate({ query: batchContactTagsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { validateBatchIds } = await import('../../../utils/database/batch-validation');

      const validation = validateBatchIds(req.query.contactIds as string, {
        maxCount: 50,
        fieldName: 'contactIds',
      });

      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid contact IDs',
          details: validation.errors,
        });
      }

      const userId = req.user!.id;
      const userRole = req.user!.role;

      const accessScope = await getUserAccessScope(userId, userRole);
      const accessFilter = buildContactAccessFilter(accessScope);

      // Get tags for all accessible contacts with access filter
      const contactTagsList = await db()
        .select({
          contactId: contactTags.contactId,
          id: tags.id,
          name: tags.name,
          color: tags.color,
          icon: tags.icon,
          businessLine: tags.businessLine,
          monthlyPremium: contactTags.monthlyPremium,
          policyNumber: contactTags.policyNumber,
        })
        .from(contactTags)
        .innerJoin(tags, eq(contactTags.tagId, tags.id))
        .innerJoin(contacts, eq(contactTags.contactId, contacts.id))
        .where(and(inArray(contactTags.contactId, validation.ids), accessFilter.whereClause));

      // Group by contactId
      const tagsByContactId: Record<string, typeof contactTagsList> = {};

      for (const tag of contactTagsList) {
        if (!tagsByContactId[tag.contactId]) {
          tagsByContactId[tag.contactId] = [];
        }
        tagsByContactId[tag.contactId].push(tag);
      }

      // Ensure all accessible contacts are in result
      const accessibleContacts = await db()
        .select({ id: contacts.id })
        .from(contacts)
        .where(and(inArray(contacts.id, validation.ids), accessFilter.whereClause));

      for (const contact of accessibleContacts) {
        if (!tagsByContactId[contact.id]) {
          tagsByContactId[contact.id] = [];
        }
      }

      req.log.info(
        {
          requested: validation.ids.length,
          accessible: accessibleContacts.length,
          withTags: Object.keys(tagsByContactId).filter((k) => tagsByContactId[k].length > 0)
            .length,
        },
        'contact tags batch fetched'
      );

      res.json({ success: true, data: tagsByContactId });
    } catch (err) {
      req.log.error({ err }, 'failed to fetch contact tags batch');
      next(err);
    }
  }
);

// GET /contacts/:id - List tags for a contact
router.get(
  '/contacts/:id',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const hasAccess = await canAccessContact(userId, userRole, id);

      if (!hasAccess) {
        req.log.warn(
          { contactId: id, userId, userRole },
          'user attempted to list tags for inaccessible contact'
        );
        return res.status(404).json({ error: 'Contact not found' });
      }

      const contactTagsList = await db()
        .select({
          id: tags.id,
          name: tags.name,
          color: tags.color,
          icon: tags.icon,
          businessLine: tags.businessLine,
          monthlyPremium: contactTags.monthlyPremium,
          policyNumber: contactTags.policyNumber,
        })
        .from(contactTags)
        .innerJoin(tags, eq(contactTags.tagId, tags.id))
        .where(eq(contactTags.contactId, id));

      res.json({ success: true, data: contactTagsList });
    } catch (err) {
      req.log.error({ err, contactId: req.params.id }, 'failed to list contact tags');
      next(err);
    }
  }
);

// PUT /contacts/:id - Update contact tags (add/remove)
router.put(
  '/contacts/:id',
  requireAuth,
  validate({
    params: idParamSchema,
    body: updateContactTagsSchema,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { add = [], remove = [] } = req.body;
      const userId = req.user!.id;
      const userRole = req.user!.role;

      const hasAccess = await canAccessContact(userId, userRole, id);
      if (!hasAccess) {
        req.log.warn(
          { contactId: id, userId, userRole },
          'user attempted to update tags for inaccessible contact'
        );
        return res.status(404).json({ error: 'Contact not found' });
      }

      // Process tags to add (can be IDs or names)
      const tagsToAdd: string[] = [];
      for (const item of add) {
        if (
          typeof item === 'string' &&
          item.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
        ) {
          tagsToAdd.push(item);
        } else {
          // It's a name, find or create tag
          const [existingTag] = await db()
            .select()
            .from(tags)
            .where(and(eq(tags.scope, 'contact'), sql`LOWER(${tags.name}) = LOWER(${item})`))
            .limit(1);

          if (existingTag) {
            tagsToAdd.push(existingTag.id);
          } else {
            const [newTag] = await db()
              .insert(tags)
              .values({
                scope: 'contact',
                name: item,
                color: '#6B7280',
                createdByUserId: userId,
              })
              .returning();
            tagsToAdd.push(newTag.id);
          }
        }
      }

      // Remove tags
      if (remove.length > 0) {
        await db()
          .delete(contactTags)
          .where(and(eq(contactTags.contactId, id), inArray(contactTags.tagId, remove)));
      }

      // Add tags (ignore duplicates)
      if (tagsToAdd.length > 0) {
        const values = tagsToAdd.map((tagId) => ({ contactId: id, tagId }));
        await db().insert(contactTags).values(values).onConflictDoNothing();
      }

      // Get updated tags
      const updatedTags = await db()
        .select({
          id: tags.id,
          name: tags.name,
          color: tags.color,
          icon: tags.icon,
          businessLine: tags.businessLine,
          monthlyPremium: contactTags.monthlyPremium,
          policyNumber: contactTags.policyNumber,
        })
        .from(contactTags)
        .innerJoin(tags, eq(contactTags.tagId, tags.id))
        .where(eq(contactTags.contactId, id));

      req.log.info(
        { contactId: id, added: tagsToAdd.length, removed: remove.length },
        'contact tags updated'
      );
      res.json({ success: true, data: updatedTags });
    } catch (err) {
      req.log.error({ err, contactId: req.params.id }, 'failed to update contact tags');
      next(err);
    }
  }
);

// GET /contacts/:contactId/tags/:tagId - Get specific contact-tag relationship
router.get(
  '/contacts/:contactId/tags/:tagId',
  requireAuth,
  validate({ params: contactTagParamsSchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contactId, tagId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const hasAccess = await canAccessContact(userId, userRole, contactId);

      if (!hasAccess) {
        req.log.warn(
          { contactId, tagId, userId, userRole },
          'user attempted to get contact tag for inaccessible contact'
        );
        return res.status(404).json({ error: 'Contact not found' });
      }

      const [contactTagData] = await db()
        .select({
          id: contactTags.id,
          contactId: contactTags.contactId,
          tagId: contactTags.tagId,
          monthlyPremium: contactTags.monthlyPremium,
          policyNumber: contactTags.policyNumber,
          createdAt: contactTags.createdAt,
          tag: {
            id: tags.id,
            name: tags.name,
            color: tags.color,
            icon: tags.icon,
            businessLine: tags.businessLine,
            scope: tags.scope,
            description: tags.description,
            createdAt: tags.createdAt,
            updatedAt: tags.updatedAt,
          },
        })
        .from(contactTags)
        .innerJoin(tags, eq(contactTags.tagId, tags.id))
        .where(and(eq(contactTags.contactId, contactId), eq(contactTags.tagId, tagId)))
        .limit(1);

      if (!contactTagData) {
        return res.status(404).json({ error: 'Contact tag relationship not found' });
      }

      res.json({
        success: true,
        data: {
          id: contactTagData.id,
          contactId: contactTagData.contactId,
          tagId: contactTagData.tagId,
          monthlyPremium: contactTagData.monthlyPremium,
          policyNumber: contactTagData.policyNumber,
          createdAt: contactTagData.createdAt.toISOString(),
          tag: {
            ...contactTagData.tag,
            createdAt: contactTagData.tag.createdAt.toISOString(),
            updatedAt: contactTagData.tag.updatedAt.toISOString(),
          },
        },
      });
    } catch (err) {
      req.log.error(
        { err, contactId: req.params.contactId, tagId: req.params.tagId },
        'failed to get contact tag'
      );
      next(err);
    }
  }
);

// PUT /contacts/:contactId/tags/:tagId - Update contact-tag relationship data
router.put(
  '/contacts/:contactId/tags/:tagId',
  requireAuth,
  validate({
    params: contactTagParamsSchema,
    body: updateContactTagSchema,
  }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contactId, tagId } = req.params;
      const { monthlyPremium, policyNumber } = req.body;

      req.log.info(
        { contactId, tagId, monthlyPremium, policyNumber },
        'PUT /contacts/:contactId/tags/:tagId - start'
      );

      const userId = req.user!.id;
      const userRole = req.user!.role;
      const hasAccess = await canAccessContact(userId, userRole, contactId);

      if (!hasAccess) {
        req.log.warn(
          { contactId, tagId, userId, userRole },
          'user attempted to update contact tag for inaccessible contact'
        );
        return res.status(404).json({ error: 'Contact not found' });
      }

      // Verify relationship exists
      const [existingRelation] = await db()
        .select({
          id: contactTags.id,
          tagBusinessLine: tags.businessLine,
        })
        .from(contactTags)
        .innerJoin(tags, eq(contactTags.tagId, tags.id))
        .where(and(eq(contactTags.contactId, contactId), eq(contactTags.tagId, tagId)))
        .limit(1);

      if (!existingRelation) {
        return res.status(404).json({ error: 'Contact tag relationship not found' });
      }

      // Validate tag has businessLine 'zurich'
      if (existingRelation.tagBusinessLine !== 'zurich') {
        return res.status(400).json({
          error: 'This endpoint is only available for tags with businessLine "zurich"',
        });
      }

      // Update fields
      const updateData: { monthlyPremium?: number | null; policyNumber?: string | null } = {};

      if (monthlyPremium !== undefined) {
        updateData.monthlyPremium = monthlyPremium;
      }

      if (policyNumber !== undefined) {
        updateData.policyNumber = policyNumber;
      }

      // If nothing to update, return current data
      if (Object.keys(updateData).length === 0) {
        req.log.info({ contactId, tagId }, 'no changes to update, returning current data');
        const [currentData] = await db()
          .select({
            id: contactTags.id,
            contactId: contactTags.contactId,
            tagId: contactTags.tagId,
            monthlyPremium: contactTags.monthlyPremium,
            policyNumber: contactTags.policyNumber,
            createdAt: contactTags.createdAt,
            tag: {
              id: tags.id,
              name: tags.name,
              color: tags.color,
              icon: tags.icon,
              businessLine: tags.businessLine,
              scope: tags.scope,
              description: tags.description,
              createdAt: tags.createdAt,
              updatedAt: tags.updatedAt,
            },
          })
          .from(contactTags)
          .innerJoin(tags, eq(contactTags.tagId, tags.id))
          .where(eq(contactTags.id, existingRelation.id))
          .limit(1);

        if (!currentData) {
          return res.status(404).json({ error: 'Contact tag relationship not found' });
        }

        return res.json({
          success: true,
          data: {
            id: currentData.id,
            contactId: currentData.contactId,
            tagId: currentData.tagId,
            monthlyPremium: currentData.monthlyPremium,
            policyNumber: currentData.policyNumber,
            createdAt: currentData.createdAt.toISOString(),
            tag: {
              ...currentData.tag,
              createdAt: currentData.tag.createdAt.toISOString(),
              updatedAt: currentData.tag.updatedAt.toISOString(),
            },
          },
        });
      }

      // Execute update
      await db().update(contactTags).set(updateData).where(eq(contactTags.id, existingRelation.id));

      req.log.info({ contactId, tagId, updateData }, 'contact tag updated in DB');

      // Get updated data
      const [updatedData] = await db()
        .select({
          id: contactTags.id,
          contactId: contactTags.contactId,
          tagId: contactTags.tagId,
          monthlyPremium: contactTags.monthlyPremium,
          policyNumber: contactTags.policyNumber,
          createdAt: contactTags.createdAt,
          tag: {
            id: tags.id,
            name: tags.name,
            color: tags.color,
            icon: tags.icon,
            businessLine: tags.businessLine,
            scope: tags.scope,
            description: tags.description,
            createdAt: tags.createdAt,
            updatedAt: tags.updatedAt,
          },
        })
        .from(contactTags)
        .innerJoin(tags, eq(contactTags.tagId, tags.id))
        .where(eq(contactTags.id, existingRelation.id))
        .limit(1);

      req.log.info({ contactId, tagId, updateData }, 'contact tag updated');
      res.json({
        success: true,
        data: {
          id: updatedData!.id,
          contactId: updatedData!.contactId,
          tagId: updatedData!.tagId,
          monthlyPremium: updatedData!.monthlyPremium,
          policyNumber: updatedData!.policyNumber,
          createdAt: updatedData!.createdAt.toISOString(),
          tag: {
            ...updatedData!.tag,
            createdAt: updatedData!.tag.createdAt.toISOString(),
            updatedAt: updatedData!.tag.updatedAt.toISOString(),
          },
        },
      });
    } catch (err) {
      req.log.error(
        { err, contactId: req.params.contactId, tagId: req.params.tagId },
        'failed to update contact tag'
      );
      next(err);
    }
  }
);

export default router;
