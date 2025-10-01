import { Router, type Router as ExpressRouter } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import notionService from '../services/notionService.js';
import { supabase } from '../config/supabase.js';

const router: ExpressRouter = Router();

// Obtener estadísticas del CRM
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Verificar si hay conexión activa con Notion
    const { data: workspace } = await supabase
      .from('notion_workspaces')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!workspace) {
      // Sin conexión, devolver estadísticas vacías
      return res.json({
        contacts: 0,
        deals: 0,
        tasks: 0,
        completedTasks: 0,
        totalValue: 0,
        wonDeals: 0
      });
    }

    try {
      // Obtener estadísticas reales de Notion
      const [contactsData, dealsData, tasksData] = await Promise.allSettled([
        notionService.getContacts(userId),
        notionService.getDeals(userId),
        notionService.getTasks(userId)
      ]);

      // Procesar contactos
      const contacts = contactsData.status === 'fulfilled' ? contactsData.value : [];
      const contactsCount = Array.isArray(contacts) ? contacts.length : 0;

      // Procesar deals
      const deals = dealsData.status === 'fulfilled' ? dealsData.value : [];
      const dealsCount = Array.isArray(deals) ? deals.length : 0;
      
      let totalValue = 0;
      let wonDeals = 0;
      
      if (Array.isArray(deals)) {
        deals.forEach((deal: any) => {
          const value = parseFloat(deal.value) || 0;
          totalValue += value;
          
          if (deal.status === 'Won' || deal.status === 'Ganado' || deal.status === 'Cerrado') {
            wonDeals++;
          }
        });
      }

      // Procesar tareas
      const tasks = tasksData.status === 'fulfilled' ? tasksData.value : [];
      const tasksCount = Array.isArray(tasks) ? tasks.length : 0;
      
      let completedTasks = 0;
      if (Array.isArray(tasks)) {
        completedTasks = tasks.filter((task: any) => 
          task.status === 'Done' || 
          task.status === 'Completed' || 
          task.status === 'Completado'
        ).length;
      }

      const stats = {
        contacts: contactsCount,
        deals: dealsCount,
        tasks: tasksCount,
        completedTasks,
        totalValue: Math.round(totalValue * 100) / 100, // Redondear a 2 decimales
        wonDeals
      };

      // Registrar en logs de sincronización
      await supabase
        .from('sync_logs')
        .insert({
          user_id: userId,
          workspace_id: workspace.workspace_id,
          sync_type: 'stats_fetch',
          status: 'success',
          records_processed: contactsCount + dealsCount + tasksCount,
          details: { stats }
        });

      res.json(stats);

    } catch (notionError) {
      console.error('Error obteniendo datos de Notion:', notionError);
      
      // Registrar error en logs
      await supabase
        .from('sync_errors')
        .insert({
          user_id: userId,
          workspace_id: workspace.workspace_id,
          error_type: 'stats_fetch_error',
          error_message: notionError instanceof Error ? notionError.message : 'Error desconocido',
          context: { endpoint: '/api/crm/stats' }
        });

      // Devolver estadísticas vacías en caso de error
      res.json({
        contacts: 0,
        deals: 0,
        tasks: 0,
        completedTasks: 0,
        totalValue: 0,
        wonDeals: 0
      });
    }

  } catch (error) {
    console.error('Error en endpoint de estadísticas:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Obtener contactos del CRM
router.get('/contacts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const contacts = await notionService.getContacts(userId);
    res.json({ contacts });

  } catch (error) {
    console.error('Error obteniendo contactos:', error);
    res.status(500).json({ 
      error: 'Error obteniendo contactos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Obtener deals del CRM
router.get('/deals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const deals = await notionService.getDeals(userId);
    res.json({ deals });

  } catch (error) {
    console.error('Error obteniendo deals:', error);
    res.status(500).json({ 
      error: 'Error obteniendo deals',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

// Obtener tareas del CRM
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const tasks = await notionService.getTasks(userId);
    res.json({ tasks });

  } catch (error) {
    console.error('Error obteniendo tareas:', error);
    res.status(500).json({ 
      error: 'Error obteniendo tareas',
      details: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;