import { supabase } from '../config/supabase';
import { Contact, ConversionEvent } from '../types/metrics';

export interface MonthlyConversionMetric {
  id?: string;
  year: number;
  month: number;
  user_id?: string;
  total_contacts: number;
  converted_to_client: number;
  conversion_rate: number;
  average_conversion_time: number;
  total_value: number;
  created_at?: string;
}

export interface HistoricalMetric {
  id?: string;
  user_id?: string;
  date: string;
  total_contacts: number;
  new_contacts: number;
  converted_contacts: number;
  conversion_rate: number;
  pipeline_value: number;
  closed_value: number;
  average_deal_size: number;
  created_at?: string;
}

export interface ContactStatusChange {
  id?: string;
  contact_id: string;
  from_status?: string;
  to_status: string;
  changed_by?: string;
  changed_at?: string;
  notes?: string;
}

class MetricsService {
  // Obtener métricas de conversión mensual con timeout
  async getMonthlyConversionMetrics(year?: number, month?: number, userId?: string): Promise<MonthlyConversionMetric[]> {
    try {
      // Crear AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

      let query = supabase
        .from('monthly_conversion_metrics')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .abortSignal(controller.signal);

      if (year) query = query.eq('year', year);
      if (month) query = query.eq('month', month);
      if (userId) query = query.eq('user_id', userId);

      const { data, error } = await query;
      clearTimeout(timeoutId);
      
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching monthly conversion metrics:', error);
      if (error.name === 'AbortError' || error.code === 'ERR_ABORTED') {
        throw new Error('Request timeout: Monthly metrics took too long to load');
      }
      throw error;
    }
  }

  // Calcular y almacenar métricas de conversión mensual con timeout y reintentos
  async calculateAndStoreMonthlyMetrics(year: number, month: number, userId?: string): Promise<MonthlyConversionMetric> {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      // Crear AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 segundos timeout
      
      try {
        // Obtener contactos del mes
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

        let contactsQuery = supabase
          .from('contacts')
          .select('id, created_at, assigned_to, status, value')
          .gte('created_at', startDate)
          .lte('created_at', endDate)
          .order('created_at', { ascending: false })
          .abortSignal(controller.signal);

        // Manejar usuarios sin asignar correctamente
        if (userId) {
          contactsQuery = contactsQuery.eq('assigned_to', userId);
        } else {
          contactsQuery = contactsQuery.is('assigned_to', null);
        }

        const { data: contacts, error: contactsError } = await contactsQuery;
        if (contactsError) {
          clearTimeout(timeoutId);
          throw contactsError;
        }

      // Obtener conversiones a cliente del mes con consulta optimizada
      let conversionsQuery = supabase
        .from('contact_status_history')
        .select('contact_id, changed_at')
        .eq('to_status', 'Cliente')
        .gte('changed_at', startDate)
        .lte('changed_at', endDate)
        .order('changed_at', { ascending: false })
        .abortSignal(controller.signal);

      if (userId) {
        // Filtrar por contactos del usuario
        const contactIds = contacts?.map(c => c.id) || [];
        if (contactIds.length > 0) {
          conversionsQuery.in('contact_id', contactIds);
        }
      }

      const { data: conversions, error: conversionsError } = await conversionsQuery;
      if (conversionsError) {
        clearTimeout(timeoutId);
        throw conversionsError;
      }

    // Filter by userId if provided by getting contact details separately
    let filteredConversions = conversions || [];
    if (userId && conversions && conversions.length > 0) {
      const contactIds = conversions.map(conv => conv.contact_id);
      const { data: contactDetails } = await supabase
        .from('contacts')
        .select('id, assigned_to, created_at')
        .in('id', contactIds)
        .eq('assigned_to', userId);
      
      const userContactIds = new Set(contactDetails?.map(c => c.id) || []);
      filteredConversions = conversions.filter(conv => userContactIds.has(conv.contact_id));
    }

    // Obtener contactos que alguna vez fueron prospectos para calcular tasa de conversión correcta
    let prospectsQuery = supabase
      .from('contact_status_history')
      .select('contact_id')
      .eq('to_status', 'Prospecto')
      .gte('changed_at', startDate)
      .lte('changed_at', endDate);

    const { data: prospectHistory, error: prospectError } = await prospectsQuery;
    if (prospectError) throw prospectError;

    // Filter prospects by userId if provided
    let filteredProspectHistory = prospectHistory || [];
    if (userId && prospectHistory && prospectHistory.length > 0) {
      const prospectContactIds = [...new Set(prospectHistory.map(p => p.contact_id))];
      const { data: prospectContactDetails } = await supabase
        .from('contacts')
        .select('id')
        .in('id', prospectContactIds)
        .eq('assigned_to', userId);
      
      const userProspectContactIds = new Set(prospectContactDetails?.map(c => c.id) || []);
      filteredProspectHistory = prospectHistory.filter(p => userProspectContactIds.has(p.contact_id));
    }

    const totalContacts = contacts?.length || 0;
    const convertedToClient = filteredConversions?.length || 0;
    const totalProspects = filteredProspectHistory?.length || 0;
    
    // Calcular tasa de conversión basada en prospectos, no en todos los contactos
    const conversionRate = totalProspects > 0 ? (convertedToClient / totalProspects) * 100 : 0;

    // Calcular tiempo promedio de conversión con validaciones
    let averageConversionTime = 0;
    if (filteredConversions && filteredConversions.length > 0) {
      // Get contact creation dates for conversion time calculation
      const conversionContactIds = filteredConversions.map(conv => conv.contact_id);
      const { data: conversionContacts } = await supabase
        .from('contacts')
        .select('id, created_at')
        .in('id', conversionContactIds);
      
      const contactCreationMap = new Map(
        conversionContacts?.map(c => [c.id, c.created_at]) || []
      );
      
      const validConversionTimes = filteredConversions
        .map(conv => {
          const contactCreatedAt = contactCreationMap.get(conv.contact_id);
          if (!contactCreatedAt || !conv.changed_at) {
            return null; // Datos inválidos
          }
          
          const createdAt = new Date(contactCreatedAt);
          const convertedAt = new Date(conv.changed_at);
          
          // Validar fechas válidas
          if (isNaN(createdAt.getTime()) || isNaN(convertedAt.getTime())) {
            return null;
          }
          
          const timeDiff = (convertedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          
          // Validar que el tiempo sea positivo y razonable (menos de 2 años)
          return timeDiff > 0 && timeDiff < 730 ? timeDiff : null;
        })
        .filter(time => time !== null) as number[];
      
      // Calcular promedio solo si hay tiempos válidos
      if (validConversionTimes.length > 0) {
        averageConversionTime = validConversionTimes.reduce((sum, time) => sum + time, 0) / validConversionTimes.length;
      }
    }

    // Calcular valor total con validaciones adicionales
    const totalValue = contacts?.reduce((sum, contact) => {
      const value = parseFloat(contact.value);
      // Validar que el valor sea un número válido y positivo
      return sum + (isNaN(value) || value < 0 ? 0 : value);
    }, 0) || 0;

    const metric: MonthlyConversionMetric = {
      year,
      month,
      user_id: userId,
      total_contacts: Math.max(0, totalContacts), // Asegurar que no sea negativo
      converted_to_client: Math.max(0, convertedToClient), // Asegurar que no sea negativo
      conversion_rate: Math.max(0, Math.min(100, Math.round(conversionRate * 100) / 100)), // Limitar entre 0-100%
      average_conversion_time: Math.max(0, Math.round(averageConversionTime * 100) / 100), // Asegurar que no sea negativo
      total_value: Math.max(0, totalValue) // Asegurar que no sea negativo
    };

    // Insertar o actualizar métrica
    const { data, error } = await supabase
      .from('monthly_conversion_metrics')
      .upsert(metric, { 
        onConflict: 'year,month,user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (error) {
      clearTimeout(timeoutId);
      throw error;
    }
    
    clearTimeout(timeoutId);
    return data;
    
        clearTimeout(timeoutId);
        return data;
        
      } catch (error: any) {
        clearTimeout(timeoutId);
        attempt++;
        
        // Manejar errores de conexión y timeout
        if (error.name === 'AbortError' || error.code === 'ERR_ABORTED') {
          console.warn(`Intento ${attempt}/${maxRetries}: Timeout en consulta de métricas`);
        } else if (error.message?.includes('CONNECTION_CLOSED') || error.message?.includes('Failed to fetch')) {
          console.warn(`Intento ${attempt}/${maxRetries}: Error de conexión en métricas`);
        } else {
          // Error no relacionado con conexión, no reintentar
          throw error;
        }
        
        // Si es el último intento, lanzar error
        if (attempt >= maxRetries) {
          if (error.name === 'AbortError' || error.code === 'ERR_ABORTED') {
            throw new Error('La consulta de métricas ha excedido el tiempo límite después de múltiples intentos');
          }
          throw new Error(`Error de conexión persistente después de ${maxRetries} intentos: ${error.message}`);
        }
        
        // Esperar antes del siguiente intento (backoff exponencial)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    // Este punto nunca debería alcanzarse
    throw new Error('Error inesperado en calculateAndStoreMonthlyMetrics');
  }

  // Obtener métricas históricas
  async getHistoricalMetrics(userId?: string, startDate?: string, endDate?: string): Promise<HistoricalMetric[]> {
    let query = supabase
      .from('historical_metrics')
      .select('*')
      .order('date', { ascending: false });

    if (userId) query = query.eq('user_id', userId);
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Registrar cambio de estado de contacto
  async logStatusChange(contactId: string, fromStatus: string | null, toStatus: string, changedBy?: string, notes?: string): Promise<ContactStatusChange> {
    const statusChange: ContactStatusChange = {
      contact_id: contactId,
      from_status: fromStatus || undefined,
      to_status: toStatus,
      changed_by: changedBy,
      notes
    };

    const { data, error } = await supabase
      .from('contact_status_history')
      .insert(statusChange)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Obtener historial de cambios de estado
  async getStatusHistory(contactId?: string, startDate?: string, endDate?: string): Promise<ContactStatusChange[]> {
    let query = supabase
      .from('contact_status_history')
      .select('*')
      .order('changed_at', { ascending: false });

    if (contactId) query = query.eq('contact_id', contactId);
    if (startDate) query = query.gte('changed_at', startDate);
    if (endDate) query = query.lte('changed_at', endDate);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // Obtener tasa de conversión actual del mes
  async getCurrentMonthConversionRate(userId?: string): Promise<number> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
      const metric = await this.calculateAndStoreMonthlyMetrics(year, month, userId);
      return metric.conversion_rate;
    } catch (error) {
      console.error('Error calculating current month conversion rate:', error);
      return 0;
    }
  }

  // Obtener métricas del mes actual con reintentos
  async getCurrentMonthMetrics(userId?: string): Promise<MonthlyConversionMetric | null> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Intentar obtener métricas existentes con consulta optimizada
        let metricsQuery = supabase
          .from('monthly_conversion_metrics')
          .select('id, year, month, user_id, total_contacts, converted_to_client, conversion_rate, average_conversion_time, total_value, created_at')
          .eq('year', year)
          .eq('month', month)
          .order('created_at', { ascending: false })
          .limit(1);

        // Manejar usuarios sin asignar correctamente
        if (userId) {
          metricsQuery = metricsQuery.eq('user_id', userId);
        } else {
          metricsQuery = metricsQuery.is('user_id', null);
        }

        const { data: existingMetrics, error } = await metricsQuery.single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (existingMetrics) {
          return existingMetrics;
        }

        // Si no existen métricas, calcularlas
        return await this.calculateAndStoreMonthlyMetrics(year, month, userId);
        
      } catch (error: any) {
        attempt++;
        
        // Manejar errores de conexión
        if (error.message?.includes('CONNECTION_CLOSED') || error.message?.includes('Failed to fetch')) {
          console.warn(`Intento ${attempt}/${maxRetries}: Error de conexión en getCurrentMonthMetrics`);
          
          if (attempt >= maxRetries) {
            console.error('Error persistente al obtener métricas del mes actual:', error);
            throw new Error(`Error de conexión persistente después de ${maxRetries} intentos: ${error.message}`);
          }
          
          // Esperar antes del siguiente intento
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        } else {
          // Error no relacionado con conexión, no reintentar
          console.error('Error al obtener métricas del mes actual:', error);
          throw error;
        }
      }
    }
    
    throw new Error('Error inesperado en getCurrentMonthMetrics');
  }

  // Migrar contactos existentes del store local a Supabase
  async migrateContactsToSupabase(contacts: Contact[]): Promise<void> {
    if (!contacts || contacts.length === 0) return;

    // Preparar datos para inserción
    const contactsData = contacts.map(contact => ({
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,

      status: contact.status,
      assigned_to: contact.assignedTo,
      value: contact.value,
      created_at: contact.createdAt.toISOString(),
      updated_at: contact.updatedAt.toISOString(),
      last_contact_date: contact.lastContactDate?.toISOString(),
      notes: JSON.stringify(contact.notes || [])
    }));

    const { error } = await supabase
      .from('contacts')
      .upsert(contactsData, { onConflict: 'id', ignoreDuplicates: false });

    if (error) throw error;
  }

  // Obtener contactos desde Supabase
  async getContactsFromSupabase(userId?: string): Promise<Contact[]> {
    let query = supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('assigned_to', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(contact => ({
    id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,

        status: contact.status,
        stage: contact.stage || 'initial',
        assignedTo: contact.assigned_to || 'Sin asignar',value: parseFloat(contact.value) || 0,
      createdAt: new Date(contact.created_at),
      updatedAt: new Date(contact.updated_at),
      lastContactDate: contact.last_contact_date ? new Date(contact.last_contact_date) : undefined,
      notes: contact.notes ? JSON.parse(contact.notes) : []
    }));
  }
}

export { MetricsService };
export const metricsService = new MetricsService();