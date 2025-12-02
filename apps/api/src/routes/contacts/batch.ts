/**
 * Contacts Batch Route
 * 
 * GET /contacts/batch - Get multiple contacts with related data
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { db, contacts, contactTags, tags } from '@cactus/db';
import { eq, and, isNull, inArray } from 'drizzle-orm';
import { requireAuth } from '../../auth/middlewares';
import { getUserAccessScope, buildContactAccessFilter } from '../../auth/authorization';
import { createDrizzleLogger } from '../../utils/db-logger';
import { validate } from '../../utils/validation';
import { 
  type Contact, 
  type ContactTag,
  type ContactTagWithInfo, 
  type ContactWithTags 
} from '../../types/contacts';
import { batchContactsQuerySchema } from './schemas';

const router = Router();

/**
 * GET /contacts/batch - Get multiple contacts with tags
 */
router.get('/batch',
  requireAuth,
  validate({ query: batchContactsQuerySchema }),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { validateBatchIds } = require('../../utils/batch-validation');
      
      const validation = validateBatchIds(req.query.contactIds as string, {
        maxCount: 50,
        fieldName: 'contactIds'
      });

      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid contact IDs',
          details: validation.errors
        });
      }

      const userId = req.user!.id;
      const userRole = req.user!.role;
      const includeTags = req.query.includeTags === 'true';
      
      const accessScope = await getUserAccessScope(userId, userRole);
      const accessFilter = buildContactAccessFilter(accessScope);
      const dbLogger = createDrizzleLogger(req.log);

      const contactsList = await dbLogger.select(
        'batch_contacts_main',
        () => db()
          .select()
          .from(contacts)
          .where(and(
            inArray(contacts.id, validation.ids),
            isNull(contacts.deletedAt),
            accessFilter.whereClause
          ))
      ) as Contact[];

      const contactTagsMap = new Map<string, ContactTag[]>();
      if (includeTags && contactsList.length > 0) {
        const contactIds = contactsList.map(c => c.id);
        const contactTagsList = await dbLogger.select(
          'batch_contacts_tags',
          () => db()
            .select({
              contactId: contactTags.contactId,
              id: tags.id,
              name: tags.name,
              color: tags.color,
              icon: tags.icon
            })
            .from(contactTags)
            .innerJoin(tags, eq(contactTags.tagId, tags.id))
            .where(inArray(contactTags.contactId, contactIds))
        ) as ContactTagWithInfo[];

        contactTagsList.forEach((ct: ContactTagWithInfo) => {
          if (ct.contactId) {
            if (!contactTagsMap.has(ct.contactId)) {
              contactTagsMap.set(ct.contactId, []);
            }
            contactTagsMap.get(ct.contactId)!.push({
              id: ct.id,
              name: ct.name,
              color: ct.color,
              icon: ct.icon
            });
          }
        });
      }

      const contactsWithTags = contactsList.map((contact: Contact): ContactWithTags => ({
        ...contact,
        tags: contactTagsMap.get(contact.id) || []
      }));

      req.log.info({ 
        requestedCount: validation.ids.length,
        returnedCount: contactsWithTags.length,
        includeTags 
      }, 'contacts batch fetched');

      res.json({
        success: true,
        data: contactsWithTags
      });
    } catch (err) {
      req.log.error({ err }, 'failed to fetch contacts batch');
      next(err);
    }
  }
);

export default router;


