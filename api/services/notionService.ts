/**
 * Servicio de Notion API para CRM - Versión Optimizada
 * Maneja todas las operaciones CRUD con la API de Notion
 * Incluye manejo robusto de errores, cache y health checks
 */

import { Client } from '@notionhq/client';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Configuración del cliente de Notion
const getNotionClient = (accessToken: string) => {
  return new Client({
    auth: accessToken,
    timeoutMs: 30000, // 30 segundos timeout
  });
};

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Variables de entorno de Supabase requeridas');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Cache en memoria para tokens y configuraciones
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new MemoryCache();

// Tipos de error personalizados
class NotionServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public originalError?: any
  ) {
    super(message);
    this.name = 'NotionServiceError';
  }
}

// Constantes de error
const ERROR_CODES = {
  WORKSPACE_NOT_FOUND: 'WORKSPACE_NOT_FOUND',
  TOKEN_DECRYPT_FAILED: 'TOKEN_DECRYPT_FAILED',
  NOTION_API_ERROR: 'NOTION_API_ERROR',
  DATABASE_NOT_FOUND: 'DATABASE_NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  CONNECTION_FAILED: 'CONNECTION_FAILED'
} as const;

// Interfaces para el CRM
interface Contact {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: 'lead' | 'prospect' | 'customer' | 'inactive';
  tags?: string[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface Deal {
  id?: string;
  title: string;
  contact_id?: string;
  contact_name?: string;
  amount?: number;
  currency?: string;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
  probability?: number;
  expected_close_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface Task {
  id?: string;
  title: string;
  description?: string;
  contact_id?: string;
  deal_id?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  assigned_to?: string;
  created_at?: string;
  updated_at?: string;
}

interface NotionWorkspace {
  id: string;
  user_id: string;
  workspace_id: string;
  workspace_name: string;
  access_token: string;
  contacts_database_id?: string;
  deals_database_id?: string;
  tasks_database_id?: string;
  is_active: boolean;
  [key: string]: any; // Para permitir acceso dinámico a propiedades
}

class NotionService {
  private async getDecryptedToken(encryptedToken: string): Promise<string> {
    const cacheKey = `token:${crypto.createHash('sha256').update(encryptedToken).digest('hex')}`;
    const cached = cache.get<string>(cacheKey);
    if (cached) return cached;

    try {
      const [ivHex, encryptedData] = encryptedToken.split(':');
      if (!ivHex || !encryptedData) {
        throw new NotionServiceError(
          'Formato de token inválido',
          ERROR_CODES.TOKEN_DECRYPT_FAILED,
          400
        );
      }

      const iv = Buffer.from(ivHex, 'hex');
      const key = crypto.scryptSync(JWT_SECRET, 'salt', 32);
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // Cache el token descifrado por 10 minutos
      cache.set(cacheKey, decrypted, 10 * 60 * 1000);
      return decrypted;
    } catch (error) {
      throw new NotionServiceError(
        'Error descifrando token de acceso',
        ERROR_CODES.TOKEN_DECRYPT_FAILED,
        400,
        error
      );
    }
  }

  private async getNotionClient(userId: string): Promise<{ client: Client; workspace: NotionWorkspace }> {
    const cacheKey = `workspace:${userId}`;
    const cached = cache.get<{ client: Client; workspace: NotionWorkspace }>(cacheKey);
    if (cached) return cached;

    try {
      // Obtener workspace activo del usuario
      const { data: workspace, error } = await supabase
        .from('notion_workspaces')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error || !workspace) {
        throw new NotionServiceError(
          'No se encontró workspace de Notion activo',
          ERROR_CODES.WORKSPACE_NOT_FOUND,
          404
        );
      }

      // Descifrar token de acceso
      const accessToken = await this.getDecryptedToken(workspace.encrypted_access_token || workspace.access_token);
      
      // Crear cliente de Notion
      const client = getNotionClient(accessToken);
      
      // Verificar conectividad con health check
      await this.performHealthCheck(client, workspace.id);
      
      const result = { client, workspace };
      // Cache por 3 minutos
      cache.set(cacheKey, result, 3 * 60 * 1000);
      
      return result;
    } catch (error) {
      if (error instanceof NotionServiceError) {
        throw error;
      }
      
      throw new NotionServiceError(
        'Error conectando con Notion',
        ERROR_CODES.CONNECTION_FAILED,
        500,
        error
      );
    }
  }

  // Health check para verificar conectividad
  private async performHealthCheck(client: Client, workspaceId: string): Promise<void> {
    try {
      // Intentar obtener información del usuario para verificar conectividad
      await client.users.me({});
      
      // Registrar health check exitoso
      await supabase
        .from('connection_health')
        .upsert({
          workspace_id: workspaceId,
          status: 'healthy',
          last_check: new Date().toISOString(),
          response_time: Date.now()
        }, { onConflict: 'workspace_id' });
        
    } catch (error: any) {
      // Registrar health check fallido
      await supabase
        .from('connection_health')
        .upsert({
          workspace_id: workspaceId,
          status: 'unhealthy',
          last_check: new Date().toISOString(),
          error_message: error.message
        }, { onConflict: 'workspace_id' });

      if (error.code === 'unauthorized') {
        throw new NotionServiceError(
          'Token de acceso inválido o expirado',
          ERROR_CODES.INVALID_TOKEN,
          401,
          error
        );
      }

      if (error.code === 'rate_limited') {
        throw new NotionServiceError(
          'Límite de rate excedido',
          ERROR_CODES.RATE_LIMIT_EXCEEDED,
          429,
          error
        );
      }

      throw new NotionServiceError(
        'Error en health check de Notion',
        ERROR_CODES.NOTION_API_ERROR,
        500,
        error
      );
    }
  }

  private async ensureDatabaseExists(
    client: Client, 
    workspace: NotionWorkspace, 
    databaseType: 'contacts' | 'deals' | 'tasks'
  ): Promise<string> {
    const cacheKey = `database:${workspace.id}:${databaseType}`;
    const cached = cache.get<string>(cacheKey);
    if (cached) return cached;

    const databaseIdField = `${databaseType}_database_id`;
    let databaseId = workspace[databaseIdField as keyof NotionWorkspace] as string;

    if (databaseId) {
      try {
        // Verificar que la base de datos existe
        await client.databases.retrieve({ database_id: databaseId });
        // Cache por 15 minutos si existe
        cache.set(cacheKey, databaseId, 15 * 60 * 1000);
        return databaseId;
      } catch (error: any) {
        console.warn(`Base de datos ${databaseType} no encontrada (${databaseId}), creando nueva...`);
        
        // Registrar error de base de datos
        await supabase
          .from('sync_errors')
          .insert({
            workspace_id: workspace.id,
            error_type: 'database_not_found',
            error_message: `Database ${databaseType} not found: ${error.message}`,
            context: JSON.stringify({ databaseType, databaseId })
          });
      }
    }

    try {
      // Crear nueva base de datos
      databaseId = await this.createDatabase(client, workspace.workspace_id, databaseType);
      
      // Actualizar workspace con el nuevo database_id
      const { error: updateError } = await supabase
        .from('notion_workspaces')
        .update({ [databaseIdField]: databaseId })
        .eq('id', workspace.id);

      if (updateError) {
        throw new NotionServiceError(
          `Error actualizando workspace con nueva base de datos ${databaseType}`,
          ERROR_CODES.DATABASE_NOT_FOUND,
          500,
          updateError
        );
      }

      // Registrar creación exitosa
      await supabase
        .from('sync_logs')
        .insert({
          workspace_id: workspace.id,
          operation: 'create_database',
          status: 'success',
          details: JSON.stringify({ databaseType, databaseId })
        });

      // Cache por 15 minutos
      cache.set(cacheKey, databaseId, 15 * 60 * 1000);
      return databaseId;
    } catch (error) {
      if (error instanceof NotionServiceError) {
        throw error;
      }
      
      throw new NotionServiceError(
        `Error creando base de datos ${databaseType}`,
        ERROR_CODES.DATABASE_NOT_FOUND,
        500,
        error
      );
    }
  }

  private async createDatabase(client: Client, workspaceId: string, type: 'contacts' | 'deals' | 'tasks'): Promise<string> {
    const databaseConfigs = {
      contacts: {
        title: 'CRM - Contactos',
        properties: {
          'Nombre': { title: {} },
          'Email': { email: {} },
          'Teléfono': { phone_number: {} },
          'Empresa': { rich_text: {} },
          'Estado': {
            select: {
              options: [
                { name: 'Lead', color: 'blue' },
                { name: 'Prospect', color: 'yellow' },
                { name: 'Customer', color: 'green' },
                { name: 'Inactive', color: 'gray' }
              ]
            }
          },
          'Tags': { multi_select: { options: [] } },
          'Notas': { rich_text: {} },
          'Creado': { created_time: {} },
          'Actualizado': { last_edited_time: {} }
        }
      },
      deals: {
        title: 'CRM - Oportunidades',
        properties: {
          'Título': { title: {} },
          'Contacto': { rich_text: {} },
          'Monto': { number: { format: 'dollar' } },
          'Etapa': {
            select: {
              options: [
                { name: 'Prospecting', color: 'gray' },
                { name: 'Qualification', color: 'blue' },
                { name: 'Proposal', color: 'yellow' },
                { name: 'Negotiation', color: 'orange' },
                { name: 'Closed Won', color: 'green' },
                { name: 'Closed Lost', color: 'red' }
              ]
            }
          },
          'Probabilidad': { number: { format: 'percent' } },
          'Fecha Cierre': { date: {} },
          'Notas': { rich_text: {} },
          'Creado': { created_time: {} },
          'Actualizado': { last_edited_time: {} }
        }
      },
      tasks: {
        title: 'CRM - Tareas',
        properties: {
          'Título': { title: {} },
          'Descripción': { rich_text: {} },
          'Prioridad': {
            select: {
              options: [
                { name: 'Low', color: 'gray' },
                { name: 'Medium', color: 'blue' },
                { name: 'High', color: 'yellow' },
                { name: 'Urgent', color: 'red' }
              ]
            }
          },
          'Estado': {
            select: {
              options: [
                { name: 'Pending', color: 'gray' },
                { name: 'In Progress', color: 'blue' },
                { name: 'Completed', color: 'green' },
                { name: 'Cancelled', color: 'red' }
              ]
            }
          },
          'Fecha Vencimiento': { date: {} },
          'Asignado a': { rich_text: {} },
          'Contacto': { rich_text: {} },
          'Oportunidad': { rich_text: {} },
          'Creado': { created_time: {} },
          'Actualizado': { last_edited_time: {} }
        }
      }
    };

    const config = databaseConfigs[type];
    
    const response = await client.databases.create({
      parent: { type: 'page_id', page_id: workspaceId },
      title: [{ type: 'text', text: { content: config.title } }],
      properties: config.properties as any
    });

    return response.id;
  }

  // Métodos de utilidad para logging y manejo de errores
  private async logOperation(
    workspaceId: string,
    operation: string,
    status: 'success' | 'error',
    details?: any,
    error?: any
  ): Promise<void> {
    try {
      await supabase
        .from('sync_logs')
        .insert({
          workspace_id: workspaceId,
          operation,
          status,
          details: details ? JSON.stringify(details) : null,
          error_message: error?.message || null
        });
    } catch (logError) {
      console.error('Error logging operation:', logError);
    }
  }

  private async logError(
    workspaceId: string,
    errorType: string,
    errorMessage: string,
    context?: any
  ): Promise<void> {
    try {
      await supabase
        .from('sync_errors')
        .insert({
          workspace_id: workspaceId,
          error_type: errorType,
          error_message: errorMessage,
          context: context ? JSON.stringify(context) : null
        });
    } catch (logError) {
      console.error('Error logging error:', logError);
    }
  }

  // CRUD para Contactos con manejo robusto de errores
  async getContacts(userId: string, filters?: any): Promise<Contact[]> {
    try {
      const { client, workspace } = await this.getNotionClient(userId);
      const databaseId = await this.ensureDatabaseExists(client, workspace, 'contacts');

      const response = await client.databases.query({
        database_id: databaseId,
        filter: filters,
        sorts: [{ property: 'Creado', direction: 'descending' }],
        page_size: 100
      });

      const contacts = response.results.map(this.mapNotionPageToContact);
      
      await this.logOperation(
        workspace.id,
        'get_contacts',
        'success',
        { count: contacts.length, hasFilters: !!filters }
      );

      return contacts;
    } catch (error) {
      if (error instanceof NotionServiceError) {
        throw error;
      }
      
      throw new NotionServiceError(
        'Error obteniendo contactos',
        ERROR_CODES.NOTION_API_ERROR,
        500,
        error
      );
    }
  }

  async createContact(userId: string, contact: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact> {
    const { client, workspace } = await this.getNotionClient(userId);
    const databaseId = await this.ensureDatabaseExists(client, workspace, 'contacts');

    const response = await client.pages.create({
      parent: { database_id: databaseId },
      properties: {
        'Nombre': { title: [{ text: { content: contact.name } }] },
        'Email': contact.email ? { email: contact.email } : { email: null },
        'Teléfono': contact.phone ? { phone_number: contact.phone } : { phone_number: null },
        'Empresa': contact.company ? { rich_text: [{ text: { content: contact.company } }] } : { rich_text: [] },
        'Estado': { select: { name: contact.status.charAt(0).toUpperCase() + contact.status.slice(1) } },
        'Tags': contact.tags ? { multi_select: contact.tags.map(tag => ({ name: tag })) } : { multi_select: [] },
        'Notas': contact.notes ? { rich_text: [{ text: { content: contact.notes } }] } : { rich_text: [] }
      }
    });

    return this.mapNotionPageToContact(response);
  }

  async updateContact(userId: string, contactId: string, updates: Partial<Contact>): Promise<Contact> {
    const { client } = await this.getNotionClient(userId);

    const properties: any = {};
    
    if (updates.name) properties['Nombre'] = { title: [{ text: { content: updates.name } }] };
    if (updates.email !== undefined) properties['Email'] = updates.email ? { email: updates.email } : { email: null };
    if (updates.phone !== undefined) properties['Teléfono'] = updates.phone ? { phone_number: updates.phone } : { phone_number: null };
    if (updates.company !== undefined) properties['Empresa'] = updates.company ? { rich_text: [{ text: { content: updates.company } }] } : { rich_text: [] };
    if (updates.status) properties['Estado'] = { select: { name: updates.status.charAt(0).toUpperCase() + updates.status.slice(1) } };
    if (updates.tags !== undefined) properties['Tags'] = { multi_select: updates.tags?.map(tag => ({ name: tag })) || [] };
    if (updates.notes !== undefined) properties['Notas'] = updates.notes ? { rich_text: [{ text: { content: updates.notes } }] } : { rich_text: [] };

    const response = await client.pages.update({
      page_id: contactId,
      properties
    });

    return this.mapNotionPageToContact(response);
  }

  async deleteContact(userId: string, contactId: string): Promise<void> {
    const { client } = await this.getNotionClient(userId);
    
    await client.pages.update({
      page_id: contactId,
      archived: true
    });
  }

  // CRUD para Deals
  async getDeals(userId: string, filters?: any): Promise<Deal[]> {
    const { client, workspace } = await this.getNotionClient(userId);
    const databaseId = await this.ensureDatabaseExists(client, workspace, 'deals');

    const response = await client.databases.query({
      database_id: databaseId,
      filter: filters,
      sorts: [{ property: 'Creado', direction: 'descending' }]
    });

    return response.results.map(this.mapNotionPageToDeal);
  }

  async createDeal(userId: string, deal: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal> {
    const { client, workspace } = await this.getNotionClient(userId);
    const databaseId = await this.ensureDatabaseExists(client, workspace, 'deals');

    const response = await client.pages.create({
      parent: { database_id: databaseId },
      properties: {
        'Título': { title: [{ text: { content: deal.title } }] },
        'Contacto': deal.contact_name ? { rich_text: [{ text: { content: deal.contact_name } }] } : { rich_text: [] },
        'Monto': deal.amount ? { number: deal.amount } : { number: null },
        'Etapa': { select: { name: deal.stage.charAt(0).toUpperCase() + deal.stage.slice(1).replace('_', ' ') } },
        'Probabilidad': deal.probability ? { number: deal.probability / 100 } : { number: null },
        'Fecha Cierre': deal.expected_close_date ? { date: { start: deal.expected_close_date } } : { date: null },
        'Notas': deal.notes ? { rich_text: [{ text: { content: deal.notes } }] } : { rich_text: [] }
      }
    });

    return this.mapNotionPageToDeal(response);
  }

  async updateDeal(userId: string, dealId: string, updates: Partial<Deal>): Promise<Deal> {
    const { client } = await this.getNotionClient(userId);

    const properties: any = {};
    
    if (updates.title) properties['Título'] = { title: [{ text: { content: updates.title } }] };
    if (updates.contact_name !== undefined) properties['Contacto'] = updates.contact_name ? { rich_text: [{ text: { content: updates.contact_name } }] } : { rich_text: [] };
    if (updates.amount !== undefined) properties['Monto'] = updates.amount ? { number: updates.amount } : { number: null };
    if (updates.stage) properties['Etapa'] = { select: { name: updates.stage.charAt(0).toUpperCase() + updates.stage.slice(1).replace('_', ' ') } };
    if (updates.probability !== undefined) properties['Probabilidad'] = updates.probability ? { number: updates.probability / 100 } : { number: null };
    if (updates.expected_close_date !== undefined) properties['Fecha Cierre'] = updates.expected_close_date ? { date: { start: updates.expected_close_date } } : { date: null };
    if (updates.notes !== undefined) properties['Notas'] = updates.notes ? { rich_text: [{ text: { content: updates.notes } }] } : { rich_text: [] };

    const response = await client.pages.update({
      page_id: dealId,
      properties
    });

    return this.mapNotionPageToDeal(response);
  }

  async deleteDeal(userId: string, dealId: string): Promise<void> {
    const { client } = await this.getNotionClient(userId);
    
    await client.pages.update({
      page_id: dealId,
      archived: true
    });
  }

  // CRUD para Tasks
  async getTasks(userId: string, filters?: any): Promise<Task[]> {
    const { client, workspace } = await this.getNotionClient(userId);
    const databaseId = await this.ensureDatabaseExists(client, workspace, 'tasks');

    const response = await client.databases.query({
      database_id: databaseId,
      filter: filters,
      sorts: [{ property: 'Creado', direction: 'descending' }]
    });

    return response.results.map(this.mapNotionPageToTask);
  }

  async createTask(userId: string, task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const { client, workspace } = await this.getNotionClient(userId);
    const databaseId = await this.ensureDatabaseExists(client, workspace, 'tasks');

    const response = await client.pages.create({
      parent: { database_id: databaseId },
      properties: {
        'Título': { title: [{ text: { content: task.title } }] },
        'Descripción': task.description ? { rich_text: [{ text: { content: task.description } }] } : { rich_text: [] },
        'Prioridad': { select: { name: task.priority.charAt(0).toUpperCase() + task.priority.slice(1) } },
        'Estado': { select: { name: task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('_', ' ') } },
        'Fecha Vencimiento': task.due_date ? { date: { start: task.due_date } } : { date: null },
        'Asignado a': task.assigned_to ? { rich_text: [{ text: { content: task.assigned_to } }] } : { rich_text: [] }
      }
    });

    return this.mapNotionPageToTask(response);
  }

  async updateTask(userId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
    const { client } = await this.getNotionClient(userId);

    const properties: any = {};
    
    if (updates.title) properties['Título'] = { title: [{ text: { content: updates.title } }] };
    if (updates.description !== undefined) properties['Descripción'] = updates.description ? { rich_text: [{ text: { content: updates.description } }] } : { rich_text: [] };
    if (updates.priority) properties['Prioridad'] = { select: { name: updates.priority.charAt(0).toUpperCase() + updates.priority.slice(1) } };
    if (updates.status) properties['Estado'] = { select: { name: updates.status.charAt(0).toUpperCase() + updates.status.slice(1).replace('_', ' ') } };
    if (updates.due_date !== undefined) properties['Fecha Vencimiento'] = updates.due_date ? { date: { start: updates.due_date } } : { date: null };
    if (updates.assigned_to !== undefined) properties['Asignado a'] = updates.assigned_to ? { rich_text: [{ text: { content: updates.assigned_to } }] } : { rich_text: [] };

    const response = await client.pages.update({
      page_id: taskId,
      properties
    });

    return this.mapNotionPageToTask(response);
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    const { client } = await this.getNotionClient(userId);
    
    await client.pages.update({
      page_id: taskId,
      archived: true
    });
  }

  // Métodos de mapeo
  private mapNotionPageToContact(page: any): Contact {
    const props = page.properties;
    return {
      id: page.id,
      name: props.Nombre?.title?.[0]?.text?.content || '',
      email: props.Email?.email || undefined,
      phone: props.Teléfono?.phone_number || undefined,
      company: props.Empresa?.rich_text?.[0]?.text?.content || undefined,
      status: (props.Estado?.select?.name?.toLowerCase() || 'lead') as Contact['status'],
      tags: props.Tags?.multi_select?.map((tag: any) => tag.name) || [],
      notes: props.Notas?.rich_text?.[0]?.text?.content || undefined,
      created_at: props.Creado?.created_time || page.created_time,
      updated_at: props.Actualizado?.last_edited_time || page.last_edited_time
    };
  }

  private mapNotionPageToDeal(page: any): Deal {
    const props = page.properties;
    return {
      id: page.id,
      title: props.Título?.title?.[0]?.text?.content || '',
      contact_name: props.Contacto?.rich_text?.[0]?.text?.content || undefined,
      amount: props.Monto?.number || undefined,
      stage: (props.Etapa?.select?.name?.toLowerCase()?.replace(' ', '_') || 'prospecting') as Deal['stage'],
      probability: props.Probabilidad?.number ? Math.round(props.Probabilidad.number * 100) : undefined,
      expected_close_date: props['Fecha Cierre']?.date?.start || undefined,
      notes: props.Notas?.rich_text?.[0]?.text?.content || undefined,
      created_at: props.Creado?.created_time || page.created_time,
      updated_at: props.Actualizado?.last_edited_time || page.last_edited_time
    };
  }

  private mapNotionPageToTask(page: any): Task {
    const props = page.properties;
    return {
      id: page.id,
      title: props.Título?.title?.[0]?.text?.content || '',
      description: props.Descripción?.rich_text?.[0]?.text?.content || undefined,
      priority: (props.Prioridad?.select?.name?.toLowerCase() || 'medium') as Task['priority'],
      status: (props.Estado?.select?.name?.toLowerCase()?.replace(' ', '_') || 'pending') as Task['status'],
      due_date: props['Fecha Vencimiento']?.date?.start || undefined,
      assigned_to: props['Asignado a']?.rich_text?.[0]?.text?.content || undefined,
      created_at: props.Creado?.created_time || page.created_time,
      updated_at: props.Actualizado?.last_edited_time || page.last_edited_time
    };
  }

  // Método público para health check
  async checkHealth(userId: string): Promise<{
    status: 'healthy' | 'unhealthy';
    workspace: NotionWorkspace | null;
    lastCheck: string;
    responseTime?: number;
    error?: string;
  }> {
    try {
      const { client, workspace } = await this.getNotionClient(userId);
      const startTime = Date.now();
      
      await client.users.me({});
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        workspace,
        lastCheck: new Date().toISOString(),
        responseTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        workspace: null,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Método para limpiar cache
  clearCache(): void {
    cache.clear();
  }

  // Método para obtener estadísticas de cache
  getCacheStats(): { size: number } {
    return { size: cache['cache'].size };
  }

  // Método para migrar datos desde Supabase con manejo robusto
  async migrateFromSupabase(userId: string): Promise<{ contacts: number; deals: number; tasks: number }> {
    const { client, workspace } = await this.getNotionClient(userId);
    
    let migratedCounts = { contacts: 0, deals: 0, tasks: 0 };

    try {
      await this.logOperation(workspace.id, 'migration_start', 'success', { userId });

      // Migrar contactos
      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', userId);

      if (contacts && contacts.length > 0) {
        for (const contact of contacts) {
          try {
            await this.createContact(userId, {
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              company: contact.company,
              status: contact.status || 'lead',
              tags: contact.tags || [],
              notes: contact.notes
            });
            migratedCounts.contacts++;
          } catch (contactError) {
            await this.logError(
              workspace.id,
              'migration_contact_error',
              `Error migrando contacto ${contact.name}: ${contactError}`,
              { contactId: contact.id }
            );
          }
        }
      }

      // Migrar deals
      const { data: deals } = await supabase
        .from('deals')
        .select('*')
        .eq('user_id', userId);

      if (deals && deals.length > 0) {
        for (const deal of deals) {
          try {
            await this.createDeal(userId, {
              title: deal.title,
              contact_name: deal.contact_name,
              amount: deal.amount,
              stage: deal.stage || 'prospecting',
              probability: deal.probability,
              expected_close_date: deal.expected_close_date,
              notes: deal.notes
            });
            migratedCounts.deals++;
          } catch (dealError) {
            await this.logError(
              workspace.id,
              'migration_deal_error',
              `Error migrando deal ${deal.title}: ${dealError}`,
              { dealId: deal.id }
            );
          }
        }
      }

      // Migrar tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId);

      if (tasks && tasks.length > 0) {
        for (const task of tasks) {
          try {
            await this.createTask(userId, {
              title: task.title,
              description: task.description,
              priority: task.priority || 'medium',
              status: task.status || 'pending',
              due_date: task.due_date,
              assigned_to: task.assigned_to
            });
            migratedCounts.tasks++;
          } catch (taskError) {
            await this.logError(
              workspace.id,
              'migration_task_error',
              `Error migrando task ${task.title}: ${taskError}`,
              { taskId: task.id }
            );
          }
        }
      }

      // Registrar migración exitosa
      await supabase
        .from('migration_logs')
        .insert({
          user_id: userId,
          migration_type: 'supabase_to_notion',
          status: 'completed',
          migrated_records: migratedCounts.contacts + migratedCounts.deals + migratedCounts.tasks,
          details: JSON.stringify(migratedCounts)
        });

      await this.logOperation(
        workspace.id,
        'migration_complete',
        'success',
        migratedCounts
      );

      return migratedCounts;
    } catch (error) {
      // Registrar error de migración
      await supabase
        .from('migration_logs')
        .insert({
          user_id: userId,
          migration_type: 'supabase_to_notion',
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Error desconocido',
          details: JSON.stringify({ attempted_counts: migratedCounts })
        });
      
      await this.logOperation(
        workspace.id,
        'migration_failed',
        'error',
        migratedCounts,
        error
      );
      
      throw new NotionServiceError(
        'Error durante la migración',
        ERROR_CODES.NOTION_API_ERROR,
        500,
        error
      );
    }
  }
}

// Exportar instancia del servicio y clases de error
const notionService = new NotionService();
export default notionService;
export { NotionServiceError, ERROR_CODES, type NotionWorkspace, type Contact, type Deal, type Task };