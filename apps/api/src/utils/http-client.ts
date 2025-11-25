/**
 * Cliente HTTP optimizado con keepalive y pooling de conexiones
 * 
 * AI_DECISION: Usar módulos nativos http/https con keepAlive para reutilizar conexiones
 * Justificación: Reduce overhead de establecer nuevas conexiones TCP en cada request
 * Impacto: Mejor rendimiento y menor consumo de recursos para webhooks frecuentes
 */

import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import type { Logger } from 'pino';

interface HttpClientOptions {
  timeout?: number;
  keepAlive?: boolean;
  keepAliveMsecs?: number;
  maxSockets?: number;
  maxFreeSockets?: number;
  logger?: Logger;
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

/**
 * Cliente HTTP optimizado con pooling de conexiones
 */
export class HttpClient {
  private httpAgent: http.Agent;
  private httpsAgent: https.Agent;
  private logger?: Logger;

  constructor(options: HttpClientOptions = {}) {
    const {
      timeout = 30000,
      keepAlive = true,
      keepAliveMsecs = 1000,
      maxSockets = 50,
      maxFreeSockets = 10,
      logger
    } = options;

    if (logger !== undefined) {
      this.logger = logger;
    }

    // Configurar agent HTTP con keepalive
    this.httpAgent = new http.Agent({
      keepAlive,
      keepAliveMsecs,
      maxSockets,
      maxFreeSockets,
      timeout
    });

    // Configurar agent HTTPS con keepalive
    this.httpsAgent = new https.Agent({
      keepAlive,
      keepAliveMsecs,
      maxSockets,
      maxFreeSockets,
      timeout,
      rejectUnauthorized: true
    });
  }

  /**
   * Realizar request HTTP/HTTPS optimizado
   */
  async request(url: string, options: RequestOptions = {}): Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
  }> {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const agent = isHttps ? this.httpsAgent : this.httpAgent;

    const requestOptions: http.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Connection': 'keep-alive',
        ...options.headers
      },
      agent,
      timeout: options.signal ? undefined : 30000
    };

    return new Promise((resolve, reject) => {
      const clientRequest = (isHttps ? https : http).request(requestOptions, (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');
          const headers: Record<string, string> = {};
          
          Object.keys(response.headers).forEach(key => {
            const value = response.headers[key];
            headers[key] = Array.isArray(value) ? value.join(', ') : (value || '');
          });

          resolve({
            status: response.statusCode || 500,
            statusText: response.statusMessage || 'Unknown',
            headers,
            body
          });
        });

        response.on('error', (error) => {
          reject(error);
        });
      });

      clientRequest.on('error', (error) => {
        reject(error);
      });

      clientRequest.on('timeout', () => {
        clientRequest.destroy();
        reject(new Error('Request timeout'));
      });

      // Manejar AbortSignal
      if (options.signal) {
        if (options.signal.aborted) {
          clientRequest.destroy();
          const abortError = new Error('Request aborted');
          abortError.name = 'AbortError';
          reject(abortError);
          return;
        }
        
        options.signal.addEventListener('abort', () => {
          clientRequest.destroy();
          const abortError = new Error('Request aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        });
      }

      // Enviar body si existe
      if (options.body) {
        clientRequest.write(options.body);
      }

      clientRequest.end();
    });
  }

  /**
   * Realizar POST request
   */
  async post(
    url: string,
    body: unknown,
    options: Omit<RequestOptions, 'method' | 'body'> = {}
  ): Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
  }> {
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    
    return this.request(url, {
      ...options,
      method: 'POST',
      body: bodyString,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyString).toString(),
        ...options.headers
      }
    });
  }

  /**
   * Cerrar todas las conexiones activas
   */
  destroy(): void {
    this.httpAgent.destroy();
    this.httpsAgent.destroy();
  }
}

// Singleton para reutilizar en toda la aplicación
let httpClientInstance: HttpClient | null = null;

/**
 * Obtener instancia singleton del cliente HTTP
 */
export function getHttpClient(logger?: Logger): HttpClient {
  if (!httpClientInstance) {
    const options: HttpClientOptions = {
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 30000
    };
    if (logger !== undefined) {
      options.logger = logger;
    }
    httpClientInstance = new HttpClient(options);
  }
  return httpClientInstance;
}

