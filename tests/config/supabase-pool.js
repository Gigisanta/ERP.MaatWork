/**
 * Configuración optimizada del pool de conexiones de Supabase
 * Mejora el rendimiento y manejo de conexiones concurrentes
 */

const { createClient } = require('@supabase/supabase-js');

/**
 * Configuración optimizada para el cliente de Supabase
 */
const SUPABASE_CONFIG = {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // Desactivar para pruebas
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-my-custom-header': 'cactus-dashboard-tests'
    }
  },
  // Configuración de retry para operaciones fallidas
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
};

/**
 * Pool de conexiones para manejar múltiples clientes concurrentes
 */
class SupabaseConnectionPool {
  constructor(url, key, options = {}) {
    this.url = url;
    this.key = key;
    this.maxConnections = options.maxConnections || 20;
    this.connectionTimeout = options.connectionTimeout || 10000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    this.pool = [];
    this.activeConnections = 0;
    this.waitingQueue = [];
    
    // Inicializar pool con conexiones base
    this.initializePool();
  }
  
  /**
   * Inicializa el pool con conexiones base
   */
  initializePool() {
    const baseConnections = Math.min(5, this.maxConnections);
    
    for (let i = 0; i < baseConnections; i++) {
      const client = this.createClient();
      this.pool.push({
        client,
        inUse: false,
        created: Date.now(),
        lastUsed: Date.now()
      });
    }
    
    console.log(`🔗 Pool de conexiones inicializado con ${baseConnections} conexiones`);
  }
  
  /**
   * Crea un nuevo cliente de Supabase con configuración optimizada
   */
  createClient() {
    return createClient(this.url, this.key, SUPABASE_CONFIG);
  }
  
  /**
   * Obtiene una conexión del pool
   */
  async getConnection() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout obteniendo conexión después de ${this.connectionTimeout}ms`));
      }, this.connectionTimeout);
      
      // Buscar conexión disponible en el pool
      const availableConnection = this.pool.find(conn => !conn.inUse);
      
      if (availableConnection) {
        availableConnection.inUse = true;
        availableConnection.lastUsed = Date.now();
        this.activeConnections++;
        
        clearTimeout(timeout);
        resolve(availableConnection);
        return;
      }
      
      // Si no hay conexiones disponibles y podemos crear más
      if (this.pool.length < this.maxConnections) {
        const newConnection = {
          client: this.createClient(),
          inUse: true,
          created: Date.now(),
          lastUsed: Date.now()
        };
        
        this.pool.push(newConnection);
        this.activeConnections++;
        
        clearTimeout(timeout);
        resolve(newConnection);
        return;
      }
      
      // Agregar a la cola de espera
      this.waitingQueue.push({ resolve, reject, timeout });
    });
  }
  
  /**
   * Libera una conexión de vuelta al pool
   */
  releaseConnection(connection) {
    if (!connection || !connection.inUse) {
      return;
    }
    
    connection.inUse = false;
    connection.lastUsed = Date.now();
    this.activeConnections--;
    
    // Procesar cola de espera
    if (this.waitingQueue.length > 0) {
      const { resolve, reject, timeout } = this.waitingQueue.shift();
      clearTimeout(timeout);
      
      connection.inUse = true;
      connection.lastUsed = Date.now();
      this.activeConnections++;
      
      resolve(connection);
    }
  }
  
  /**
   * Ejecuta una operación con retry automático
   */
  async executeWithRetry(operation, context = 'operación') {
    let lastError;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const connection = await this.getConnection();
        
        try {
          const result = await operation(connection.client);
          this.releaseConnection(connection);
          return result;
        } catch (error) {
          this.releaseConnection(connection);
          throw error;
        }
      } catch (error) {
        lastError = error;
        
        if (attempt < this.retryAttempts) {
          console.warn(`⚠️ Intento ${attempt}/${this.retryAttempts} falló para ${context}: ${error.message}`);
          await this.delay(this.retryDelay * attempt); // Backoff exponencial
        }
      }
    }
    
    throw new Error(`Operación falló después de ${this.retryAttempts} intentos: ${lastError.message}`);
  }
  
  /**
   * Utilidad para delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Obtiene estadísticas del pool
   */
  getStats() {
    const now = Date.now();
    const idleConnections = this.pool.filter(conn => !conn.inUse).length;
    const oldConnections = this.pool.filter(conn => now - conn.lastUsed > 300000).length; // 5 minutos
    
    return {
      totalConnections: this.pool.length,
      activeConnections: this.activeConnections,
      idleConnections,
      waitingRequests: this.waitingQueue.length,
      oldConnections,
      maxConnections: this.maxConnections
    };
  }
  
  /**
   * Limpia conexiones antiguas del pool
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 600000; // 10 minutos
    
    this.pool = this.pool.filter(conn => {
      if (!conn.inUse && now - conn.lastUsed > maxAge) {
        console.log('🧹 Limpiando conexión antigua del pool');
        return false;
      }
      return true;
    });
  }
  
  /**
   * Cierra todas las conexiones del pool
   */
  async close() {
    console.log('🔒 Cerrando pool de conexiones...');
    
    // Limpiar cola de espera
    this.waitingQueue.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('Pool cerrado'));
    });
    this.waitingQueue = [];
    
    // Cerrar todas las conexiones
    this.pool = [];
    this.activeConnections = 0;
    
    console.log('✅ Pool de conexiones cerrado');
  }
}

/**
 * Instancia global del pool para reutilización
 */
let globalPool = null;

/**
 * Obtiene o crea el pool global de conexiones
 */
function getSupabasePool(url, key, options = {}) {
  if (!globalPool) {
    globalPool = new SupabaseConnectionPool(url, key, {
      maxConnections: 25, // Aumentado para pruebas de estrés
      connectionTimeout: 15000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...options
    });
    
    // Configurar limpieza automática cada 5 minutos
    setInterval(() => {
      globalPool.cleanup();
    }, 300000);
  }
  
  return globalPool;
}

/**
 * Cierra el pool global
 */
async function closeGlobalPool() {
  if (globalPool) {
    await globalPool.close();
    globalPool = null;
  }
}

module.exports = {
  SupabaseConnectionPool,
  getSupabasePool,
  closeGlobalPool,
  SUPABASE_CONFIG
};