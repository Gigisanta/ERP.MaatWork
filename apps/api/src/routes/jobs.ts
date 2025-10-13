/**
 * API para gestión de jobs programados
 * Implementa STORY 8 - KAN-129
 */

import { Router, type Request, type Response } from 'express';
import { getScheduler } from '../etl/automation/scheduler';

const router = Router();

/**
 * GET /api/jobs
 * Lista todos los jobs programados
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const scheduler = getScheduler();
    const jobs = scheduler.listJobs();
    
    return res.json({ jobs });
  } catch (error) {
    req.log.error({ err: error }, 'Error listando jobs');
    return res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/jobs/:jobId/run
 * Ejecuta un job manualmente
 */
router.post('/:jobId/run', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const scheduler = getScheduler();
    
    const jobs = scheduler.listJobs();
    const job = jobs.find(j => j.id === jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    req.log.info({ jobId }, 'Running job manually');
    
    const result = await scheduler.runJob(job);
    
    return res.json(result);
  } catch (error) {
    req.log.error({ err: error }, 'Error running job');
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * PATCH /api/jobs/:jobId/toggle
 * Habilita/deshabilita un job
 * 
 * Body:
 * - enabled: boolean
 */
router.patch('/:jobId/toggle', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled debe ser boolean' });
    }
    
    const scheduler = getScheduler();
    scheduler.toggleJob(jobId, enabled);
    
    req.log.info({ jobId, enabled }, 'Job toggled');
    
    return res.json({ success: true, enabled });
  } catch (error) {
    req.log.error({ err: error }, 'Error toggling job');
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;




