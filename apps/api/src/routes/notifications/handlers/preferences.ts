import { type Request } from 'express';
import { db, userChannelPreferences } from '@maatwork/db';
import { eq } from 'drizzle-orm';
import { createRouteHandler } from '../../../utils/route-handler';
import { z } from 'zod';
import { updatePreferencesSchema } from '../schemas';

export const handleGetPreferences = createRouteHandler(async (req: Request) => {
  const userId = req.user!.id;

  const prefs = await db()
    .select()
    .from(userChannelPreferences)
    .where(eq(userChannelPreferences.userId, userId));

  return prefs;
});

export const handleUpdatePreferences = createRouteHandler(async (req: Request) => {
  const userId = req.user!.id;
  const validated = req.body as z.infer<typeof updatePreferencesSchema>;

  const [pref] = await db()
    .insert(userChannelPreferences)
    .values({
      userId,
      channel: validated.channel,
      enabled: validated.enabled,
      address: validated.address || null,
    })
    .onConflictDoUpdate({
      target: [userChannelPreferences.userId, userChannelPreferences.channel],
      set: {
        enabled: validated.enabled,
        address: validated.address || null,
      },
    })
    .returning();

  req.log.info(
    { channel: validated.channel, enabled: validated.enabled },
    'notification preferences updated'
  );
  return pref;
});

