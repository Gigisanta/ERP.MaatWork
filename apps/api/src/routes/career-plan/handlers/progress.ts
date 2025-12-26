import { type Request } from 'express';
import { createRouteHandler } from '../../../utils/route-handler';
import { calculateUserCareerProgress } from '../../../utils/career-plan';

export const handleGetUserProgress = createRouteHandler(async (req: Request) => {
  const userId = req.user!.id;
  const userRole = req.user!.role;
  const progress = await calculateUserCareerProgress(userId, userRole);

  return progress;
});

