/**
 * Herramienta de debugging optimizada para capturar y reportar errores de consola
 * 
 * Features:
 * - Captura de errores con deduplicación inteligente
 * - Panel flotante con filtros, búsqueda y virtualización
 * - Badge con contador de errores
 * - Exportación y limpieza de logs
 * - Alto rendimiento incluso con 1000+ logs
 * 
 * AI_DECISION: Consolidado sistema de debug (antes 4 archivos, ahora 2)
 * Justificación: Eliminados DebugConsoleInline.tsx y console-helpers.ts (no usados)
 * Impacto: Sistema más simple y mantenible
 * 
 * NOTA: Solo se carga en desarrollo (ver layout.tsx: isDevelopment && <DebugConsole />)
 */

interface ErrorLog {
  timestamp: string;
  type: 'error' | 'warn' | 'info' | 'log';
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  col?: number;
  url?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  count?: number; // Para deduplicación
  collapsed?: boolean; // Estado de colapso
}

interface DeduplicationKey {
  message: string;
  stack?: string;
  type: string;
}

// Utility: Debounce function
function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

class DebugConsole {
  private logs: ErrorLog[] = [];
  private maxLogs = 500; // Aumentado para mejor debugging
  private panel: HTMLDivElement | null = null;
  private button: HTMLButtonElement | null = null;
  private badge: HTMLSpanElement | null = null;
  private isPanelVisible = false;
  private isLogging = false;
  
  // Filtros y búsqueda
  private filterType: 'all' | 'error' | 'warn' | 'info' | 'log' = 'all';
  private searchQuery = '';
  private sortOrder: 'newest' | 'oldest' | 'type' = 'newest';
  
  // Deduplicación
  private recentLogs: Map<string, { log: ErrorLog; timestamp: number }> = new Map();
  private deduplicationWindow = 5000; // 5 segundos
  
  // Virtualización
  private visibleStart = 0;
  private visibleEnd = 50;
  private itemHeight = 80; // Altura estimada por item
  private scrollTop = 0;
  
  // Referencias a elementos del DOM
  private headerElement: HTMLDivElement | null = null;
  private contentElement: HTMLDivElement | null = null;
  private searchInput: HTMLInputElement | null = null;
  private filterButtons: Map<string, HTMLButtonElement> = new Map();
  private collapsedStates: Map<number, boolean> = new Map();

  constructor() {
    if (typeof window === 'undefined') return;
    
    this.loadLogs();
    this.setupErrorHandlers();
    this.createDebugPanel();
    this.updateBadge();
  }

  private loadLogs() {
    try {
      const saved = localStorage.getItem('debug-console-logs');
      if (saved) {
        this.logs = JSON.parse(saved);
        // Inicializar estados de colapso
        this.logs.forEach((_, index) => {
          this.collapsedStates.set(index, true); // Colapsados por defecto
        });
      }
    } catch (e) {
      console.warn('No se pudieron cargar logs guardados', e);
    }
  }

  private saveLogs() {
    try {
      // Guardar solo los datos esenciales, sin estados de UI
      const logsToSave = this.logs.map(({ collapsed, ...log }) => log);
      localStorage.setItem('debug-console-logs', JSON.stringify(logsToSave));
    } catch (e) {
      console.warn('No se pudieron guardar logs', e);
    }
  }

  private setupErrorHandlers() {
    // Capturar errores de JavaScript
    window.addEventListener('error', (event) => {
      // AI_DECISION: Filtrar errores NEXT_REDIRECT que son normales en Next.js Server Components
      // Justificación: NEXT_REDIRECT es un mecanismo interno de Next.js para redirecciones, no un error real
      // Impacto: Reduce ruido en Debug Console eliminando errores falsos
      if (event.message === 'NEXT_REDIRECT' || event.error?.message === 'NEXT_REDIRECT') {
        return;
      }
      
      this.log({
        type: 'error',
        message: event.message,
        stack: event.error?.stack,
        source: event.filename,
        line: event.lineno,
        col: event.colno,
        url: window.location.href,
        userAgent: navigator.userAgent,
        details: {
          error: event.error?.toString(),
          type: event.error?.constructor?.name,
        },
      });
    });

    // Capturar promesas rechazadas sin catch
    window.addEventListener('unhandledrejection', (event) => {
      // AI_DECISION: Filtrar errores NEXT_REDIRECT que son normales en Next.js Server Components
      // Justificación: NEXT_REDIRECT es un mecanismo interno de Next.js para redirecciones, no un error real
      // Impacto: Reduce ruido en Debug Console eliminando errores falsos
      const reasonMessage = event.reason?.message || String(event.reason);
      if (reasonMessage === 'NEXT_REDIRECT' || reasonMessage.includes('NEXT_REDIRECT')) {
        return;
      }
      
      this.log({
        type: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        details: {
          reason: String(event.reason),
          type: event.reason?.constructor?.name,
        },
      });
    });

    // Interceptar console.error
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      originalError.apply(console, args);
      
      if (this.isLogging) return;
      
      const message = args.map(arg => String(arg)).join(' ');
      if (message.includes('[Logger]') || message.includes('Failed to send log to backend')) {
        return;
      }
      
      // AI_DECISION: Filtrar errores NEXT_REDIRECT que son normales en Next.js Server Components
      // Justificación: NEXT_REDIRECT es un mecanismo interno de Next.js para redirecciones, no un error real
      // Impacto: Reduce ruido en Debug Console eliminando errores falsos
      if (message.includes('NEXT_REDIRECT')) {
        return;
      }
      
      const errorArg = args.find(arg => arg instanceof Error) as Error | undefined;
      if (errorArg?.message === 'NEXT_REDIRECT') {
        return;
      }
      
      this.log({
        type: 'error',
        message: args.map(arg => {
          if (arg instanceof Error) {
            return arg.message;
          }
          return String(arg);
        }).join(' '),
        ...(errorArg?.stack && { stack: errorArg.stack }),
        url: window.location.href,
        details: {
          args: args.map(arg => {
            if (arg instanceof Error) {
              return {
                message: arg.message,
                ...(arg.stack && { stack: arg.stack }),
                name: arg.name,
              };
            }
            return String(arg);
          }),
        },
      });
    };

    // Interceptar console.warn
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      originalWarn.apply(console, args);
      
      if (this.isLogging) return;
      
      const message = args.map(arg => String(arg)).join(' ');
      if (message.includes('[Logger]')) {
        return;
      }
      
      this.log({
        type: 'warn',
        message: args.map(arg => String(arg)).join(' '),
        url: window.location.href,
      });
    };
  }

  private getDeduplicationKey(log: Partial<ErrorLog>): string {
    const key: DeduplicationKey = {
      message: log.message || '',
      ...(log.stack ? { stack: log.stack } : {}),
      type: log.type || 'log',
    };
    return JSON.stringify(key);
  }

  private log(errorLog: Partial<ErrorLog>) {
    if (this.isLogging) return;

    this.isLogging = true;
    try {
      const now = Date.now();
      const key = this.getDeduplicationKey(errorLog);
      
      // Verificar si es un duplicado reciente
      const recent = this.recentLogs.get(key);
      if (recent && (now - recent.timestamp) < this.deduplicationWindow) {
        // Incrementar contador del log existente
        recent.log.count = (recent.log.count || 1) + 1;
        recent.timestamp = now;
        
        // Actualizar el log en el array
        const index = this.logs.findIndex(l => l === recent.log);
        if (index !== -1) {
          this.logs[index] = { ...recent.log };
          this.saveLogs();
          if (this.isPanelVisible) {
            this.updatePanelDebounced();
          }
          this.updateBadge();
        }
        return;
      }
      
      // Crear nuevo log
      const completeLog: ErrorLog = {
        timestamp: new Date().toISOString(),
        type: errorLog.type || 'log',
        message: errorLog.message || '',
        count: 1,
        collapsed: true,
        ...(errorLog.stack && { stack: errorLog.stack }),
        ...(errorLog.source && { source: errorLog.source }),
        ...(errorLog.line && { line: errorLog.line }),
        ...(errorLog.col && { col: errorLog.col }),
        ...(errorLog.url && { url: errorLog.url }),
        ...(errorLog.userAgent && { userAgent: errorLog.userAgent }),
        ...(errorLog.details && { details: errorLog.details }),
      };
      
      this.logs.unshift(completeLog);
      
      // Guardar referencia para deduplicación
      this.recentLogs.set(key, { log: completeLog, timestamp: now });
      
      // Limpiar logs antiguos de deduplicación
      for (const [k, v] of this.recentLogs.entries()) {
        if (now - v.timestamp > this.deduplicationWindow) {
          this.recentLogs.delete(k);
        }
      }
      
      // Limitar número de logs
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(0, this.maxLogs);
      }
      
      // Inicializar estado de colapso
      this.collapsedStates.set(0, true);
      
      this.saveLogs();
      
      if (this.isPanelVisible) {
        this.updatePanelDebounced();
      }
      
      this.updateBadge();
      
      // Mostrar errores críticos en desarrollo
      if (errorLog.type === 'error' && process.env.NODE_ENV === 'development') {
        console.group('🔴 Error capturado por Debug Console');
        console.log('Mensaje:', errorLog.message);
        if (errorLog.stack) {
          console.log('Stack:', errorLog.stack);
        }
        console.log('URL:', errorLog.url);
        console.groupEnd();
      }
    } finally {
      this.isLogging = false;
    }
  }

  private updateBadge() {
    if (!this.badge) return;
    
    const errorCount = this.logs.filter(l => l.type === 'error').length;
    if (errorCount > 0) {
      this.badge.textContent = errorCount > 99 ? '99+' : String(errorCount);
      this.badge.style.display = 'flex';
    } else {
      this.badge.style.display = 'none';
    }
  }

  private createDebugPanel() {
    if (typeof document === 'undefined') return;

    // Crear botón flotante con badge
    this.button = document.createElement('button');
    this.button.textContent = '🐛';
    this.button.className = 'debug-console-button';
    this.button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #ef4444;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 24px;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: transform 0.2s, box-shadow 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    this.button.onmouseenter = () => {
      if (this.button) {
        this.button.style.transform = 'scale(1.1)';
        this.button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
      }
    };
    this.button.onmouseleave = () => {
      if (this.button) {
        this.button.style.transform = 'scale(1)';
        this.button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
      }
    };
    this.button.onclick = () => this.togglePanel();

    // Crear badge
    this.badge = document.createElement('span');
    this.badge.className = 'debug-console-badge';
    this.badge.style.cssText = `
      position: absolute;
      top: -4px;
      right: -4px;
      background: #dc2626;
      color: white;
      border-radius: 10px;
      min-width: 20px;
      height: 20px;
      font-size: 11px;
      font-weight: bold;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    this.button.appendChild(this.badge);

    // Crear panel
    this.panel = document.createElement('div');
    this.panel.className = 'debug-console-panel';
    this.panel.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 700px;
      max-height: 600px;
      background: white;
      border: 2px solid #ef4444;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      z-index: 10001;
      display: none;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      overflow: hidden;
      transition: opacity 0.2s, transform 0.2s;
    `;

    // Header con estadísticas y controles
    this.headerElement = document.createElement('div');
    this.headerElement.className = 'debug-console-header';
    this.headerElement.style.cssText = `
      padding: 12px 16px;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    `;

    const headerLeft = document.createElement('div');
    headerLeft.style.cssText = 'display: flex; align-items: center; gap: 12px; flex: 1;';
    
    const title = document.createElement('span');
    title.textContent = '🐛 Debug Console';
    title.style.cssText = 'font-size: 14px;';
    
    const stats = document.createElement('div');
    stats.id = 'debug-stats';
    stats.style.cssText = 'display: flex; gap: 12px; font-size: 11px; opacity: 0.9;';
    
    headerLeft.appendChild(title);
    headerLeft.appendChild(stats);

    const headerRight = document.createElement('div');
    headerRight.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    
    const exportBtn = document.createElement('button');
    exportBtn.textContent = '📥';
    exportBtn.title = 'Exportar logs';
    exportBtn.style.cssText = `
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      cursor: pointer;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 14px;
      transition: background 0.2s;
    `;
    exportBtn.onmouseenter = () => { exportBtn.style.background = 'rgba(255,255,255,0.3)'; };
    exportBtn.onmouseleave = () => { exportBtn.style.background = 'rgba(255,255,255,0.2)'; };
    exportBtn.onclick = () => this.exportLogsToClipboard();
    
    const clearBtn = document.createElement('button');
    clearBtn.textContent = '🗑️';
    clearBtn.title = 'Limpiar logs';
    clearBtn.style.cssText = exportBtn.style.cssText;
    clearBtn.onmouseenter = () => { clearBtn.style.background = 'rgba(255,255,255,0.3)'; };
    clearBtn.onmouseleave = () => { clearBtn.style.background = 'rgba(255,255,255,0.2)'; };
    clearBtn.onclick = () => this.clearLogs();
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.title = 'Cerrar';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 18px;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s;
    `;
    closeBtn.onmouseenter = () => { closeBtn.style.background = 'rgba(255,255,255,0.2)'; };
    closeBtn.onmouseleave = () => { closeBtn.style.background = 'none'; };
    closeBtn.onclick = () => this.togglePanel();
    
    headerRight.appendChild(exportBtn);
    headerRight.appendChild(clearBtn);
    headerRight.appendChild(closeBtn);
    
    this.headerElement.appendChild(headerLeft);
    this.headerElement.appendChild(headerRight);

    // Barra de filtros y búsqueda
    const toolbar = document.createElement('div');
    toolbar.style.cssText = `
      padding: 10px 16px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    `;

    // Filtros
    const filterContainer = document.createElement('div');
    filterContainer.style.cssText = 'display: flex; gap: 4px;';
    
    const filterTypes: Array<{ value: 'all' | 'error' | 'warn' | 'info' | 'log'; label: string; emoji: string }> = [
      { value: 'all', label: 'Todos', emoji: '📋' },
      { value: 'error', label: 'Errores', emoji: '❌' },
      { value: 'warn', label: 'Warnings', emoji: '⚠️' },
      { value: 'info', label: 'Info', emoji: 'ℹ️' },
      { value: 'log', label: 'Logs', emoji: '📝' },
    ];
    
    filterTypes.forEach(({ value, label, emoji }) => {
      const btn = document.createElement('button');
      btn.textContent = `${emoji} ${label}`;
      btn.dataset.filter = value;
      btn.style.cssText = `
        padding: 4px 10px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 11px;
        transition: all 0.2s;
      `;
      if (value === this.filterType) {
        btn.style.background = '#3b82f6';
        btn.style.color = 'white';
        btn.style.borderColor = '#3b82f6';
      }
      btn.onclick = () => this.setFilter(value);
      this.filterButtons.set(value, btn);
      filterContainer.appendChild(btn);
    });

    // Búsqueda
    const searchContainer = document.createElement('div');
    searchContainer.style.cssText = 'flex: 1; min-width: 200px;';
    
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = '🔍 Buscar en logs...';
    this.searchInput.style.cssText = `
      width: 100%;
      padding: 6px 10px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 12px;
      outline: none;
    `;
    this.searchInput.oninput = () => {
      this.searchQuery = this.searchInput?.value || '';
      this.updatePanelDebounced();
    };
    
    searchContainer.appendChild(this.searchInput);
    
    toolbar.appendChild(filterContainer);
    toolbar.appendChild(searchContainer);

    // Contenido con scroll
    this.contentElement = document.createElement('div');
    this.contentElement.id = 'debug-content';
    this.contentElement.style.cssText = `
      overflow-y: auto;
      overflow-x: hidden;
      flex: 1;
      padding: 8px;
      background: #ffffff;
    `;
    this.contentElement.onscroll = () => {
      this.scrollTop = this.contentElement?.scrollTop || 0;
      this.updateVisibleRange();
    };

    this.panel.appendChild(this.headerElement);
    this.panel.appendChild(toolbar);
    this.panel.appendChild(this.contentElement);

    document.body.appendChild(this.button);
    document.body.appendChild(this.panel);
  }

  private setFilter(filter: typeof this.filterType) {
    this.filterType = filter;
    
    // Actualizar estilos de botones
    this.filterButtons.forEach((btn, value) => {
      if (value === filter) {
        btn.style.background = '#3b82f6';
        btn.style.color = 'white';
        btn.style.borderColor = '#3b82f6';
      } else {
        btn.style.background = 'white';
        btn.style.color = '#374151';
        btn.style.borderColor = '#d1d5db';
      }
    });
    
    this.updatePanel();
  }

  private getFilteredAndSortedLogs(): ErrorLog[] {
    let filtered = this.logs;
    
    // Aplicar filtro
    if (this.filterType !== 'all') {
      filtered = filtered.filter(l => l.type === this.filterType);
    }
    
    // Aplicar búsqueda
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(l => 
        l.message.toLowerCase().includes(query) ||
        l.stack?.toLowerCase().includes(query) ||
        l.url?.toLowerCase().includes(query) ||
        l.source?.toLowerCase().includes(query)
      );
    }
    
    // Aplicar ordenamiento
    if (this.sortOrder === 'oldest') {
      filtered = [...filtered].reverse();
    } else if (this.sortOrder === 'type') {
      filtered = [...filtered].sort((a, b) => {
        const typeOrder = { error: 0, warn: 1, info: 2, log: 3 };
        return typeOrder[a.type] - typeOrder[b.type];
      });
    }
    
    return filtered;
  }

  private updateVisibleRange() {
    if (!this.contentElement) return;
    
    const containerHeight = this.contentElement.clientHeight;
    const scrollTop = this.contentElement.scrollTop;
    
    this.visibleStart = Math.max(0, Math.floor(scrollTop / this.itemHeight) - 5);
    this.visibleEnd = Math.min(
      this.logs.length,
      Math.ceil((scrollTop + containerHeight) / this.itemHeight) + 5
    );
  }

  private updatePanelDebounced = debounce(() => {
    this.updatePanel();
  }, 200);

  private toggleLogCollapse(index: number) {
    const current = this.collapsedStates.get(index) ?? true;
    this.collapsedStates.set(index, !current);
    this.updatePanel();
  }

  private updatePanel() {
    if (!this.panel || !this.contentElement || !this.headerElement) return;

    const filteredLogs = this.getFilteredAndSortedLogs();
    
    // Actualizar estadísticas
    const total = this.logs.length;
    const errors = this.logs.filter(l => l.type === 'error').length;
    const warnings = this.logs.filter(l => l.type === 'warn').length;
    
    const stats = this.headerElement.querySelector('#debug-stats');
    if (stats) {
      stats.innerHTML = `
        <span>Total: ${total}</span>
        <span>❌ ${errors}</span>
        <span>⚠️ ${warnings}</span>
      `;
    }

    // Guardar posición de scroll
    const scrollTop = this.contentElement.scrollTop;
    const scrollHeight = this.contentElement.scrollHeight;
    const clientHeight = this.contentElement.clientHeight;
    const wasAtBottom = scrollHeight - scrollTop - clientHeight < 10;

    // Renderizar logs con virtualización básica
    this.updateVisibleRange();
    const visibleLogs = filteredLogs.slice(this.visibleStart, this.visibleEnd);
    
    // Usar DocumentFragment para mejor rendimiento
    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');
    
    // Agregar spacer superior para virtualización
    if (this.visibleStart > 0) {
      const spacer = document.createElement('div');
      spacer.style.height = `${this.visibleStart * this.itemHeight}px`;
      container.appendChild(spacer);
    }
    
    visibleLogs.forEach((log, relativeIndex) => {
      const absoluteIndex = this.visibleStart + relativeIndex;
      const isCollapsed = this.collapsedStates.get(absoluteIndex) ?? true;
      const color = log.type === 'error' ? '#ef4444' : log.type === 'warn' ? '#f59e0b' : '#3b82f6';
      
      const logElement = document.createElement('div');
      logElement.className = 'debug-log-item';
      logElement.style.cssText = `
        margin-bottom: 8px;
        padding: 10px;
        border-left: 4px solid ${color};
        background: #f9fafb;
        border-radius: 6px;
        transition: background 0.2s;
      `;
      logElement.onmouseenter = () => {
        logElement.style.background = '#f3f4f6';
      };
      logElement.onmouseleave = () => {
        logElement.style.background = '#f9fafb';
      };
      
      const header = document.createElement('div');
      header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; cursor: pointer;';
      header.onclick = () => this.toggleLogCollapse(absoluteIndex);
      
      const left = document.createElement('div');
      left.style.cssText = 'display: flex; align-items: center; gap: 8px;';
      
      const typeBadge = document.createElement('span');
      typeBadge.textContent = `[${log.type.toUpperCase()}]`;
      typeBadge.style.cssText = `font-weight: bold; color: ${color}; font-size: 11px;`;
      
      const countBadge = log.count && log.count > 1 ? document.createElement('span') : null;
      if (countBadge) {
        countBadge.textContent = `×${log.count}`;
        countBadge.style.cssText = `
          background: ${color};
          color: white;
          padding: 2px 6px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: bold;
        `;
      }
      
      left.appendChild(typeBadge);
      if (countBadge) left.appendChild(countBadge);
      
      const right = document.createElement('div');
      right.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 10px; color: #6b7280;';
      
      const time = document.createElement('span');
      time.textContent = new Date(log.timestamp).toLocaleTimeString();
      
      const toggleIcon = document.createElement('span');
      toggleIcon.textContent = isCollapsed ? '▶' : '▼';
      toggleIcon.style.cssText = 'font-size: 10px;';
      
      right.appendChild(time);
      right.appendChild(toggleIcon);
      
      header.appendChild(left);
      header.appendChild(right);
      
      const message = document.createElement('div');
      message.style.cssText = `
        color: #1f2937;
        margin-bottom: ${isCollapsed ? '0' : '8px'};
        word-break: break-word;
      `;
      if (this.searchQuery) {
        message.innerHTML = this.highlightText(log.message, this.searchQuery);
      } else {
        message.textContent = log.message;
      }
      
      logElement.appendChild(header);
      logElement.appendChild(message);
      
      if (!isCollapsed) {
        if (log.stack) {
          const stack = document.createElement('pre');
          stack.style.cssText = `
            font-size: 10px;
            color: #6b7280;
            overflow-x: auto;
            margin-top: 6px;
            padding: 8px;
            background: #f3f4f6;
            border-radius: 4px;
            white-space: pre-wrap;
            word-break: break-word;
          `;
          stack.textContent = log.stack;
          logElement.appendChild(stack);
        }
        
        if (log.url) {
          const urlDiv = document.createElement('div');
          urlDiv.style.cssText = 'font-size: 10px; color: #6b7280; margin-top: 6px;';
          urlDiv.textContent = `URL: ${log.url}`;
          logElement.appendChild(urlDiv);
        }
        
        if (log.source && log.line) {
          const sourceDiv = document.createElement('div');
          sourceDiv.style.cssText = 'font-size: 10px; color: #6b7280; margin-top: 4px;';
          sourceDiv.textContent = `Source: ${log.source}:${log.line}:${log.col || 0}`;
          logElement.appendChild(sourceDiv);
        }
        
        if (log.details) {
          const details = document.createElement('details');
          details.style.cssText = 'margin-top: 6px;';
          
          const summary = document.createElement('summary');
          summary.style.cssText = 'cursor: pointer; color: #6b7280; font-size: 11px;';
          summary.textContent = 'Detalles';
          
          const pre = document.createElement('pre');
          pre.style.cssText = `
            font-size: 10px;
            color: #6b7280;
            margin-top: 6px;
            padding: 8px;
            background: #f3f4f6;
            border-radius: 4px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-word;
          `;
          pre.textContent = JSON.stringify(log.details, null, 2);
          
          details.appendChild(summary);
          details.appendChild(pre);
          logElement.appendChild(details);
        }
        
        // Botón copiar
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '📋 Copiar';
        copyBtn.style.cssText = `
          margin-top: 6px;
          padding: 4px 8px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 10px;
          transition: background 0.2s;
        `;
        copyBtn.onmouseenter = () => { copyBtn.style.background = '#2563eb'; };
        copyBtn.onmouseleave = () => { copyBtn.style.background = '#3b82f6'; };
        copyBtn.onclick = (e) => {
          e.stopPropagation();
          const logText = JSON.stringify(log, null, 2);
          navigator.clipboard.writeText(logText).then(() => {
            copyBtn.textContent = '✅ Copiado';
            setTimeout(() => { copyBtn.textContent = '📋 Copiar'; }, 2000);
          });
        };
        logElement.appendChild(copyBtn);
      }
      
      container.appendChild(logElement);
    });
    
    // Agregar spacer inferior para virtualización
    const remaining = filteredLogs.length - this.visibleEnd;
    if (remaining > 0) {
      const spacer = document.createElement('div');
      spacer.style.height = `${remaining * this.itemHeight}px`;
      container.appendChild(spacer);
    }
    
    fragment.appendChild(container);
    
    // Limpiar y actualizar contenido
    this.contentElement.innerHTML = '';
    this.contentElement.appendChild(fragment);
    
    // Restaurar posición de scroll
    if (wasAtBottom && this.contentElement.scrollHeight > this.contentElement.clientHeight) {
      this.contentElement.scrollTop = this.contentElement.scrollHeight;
    } else {
      this.contentElement.scrollTop = scrollTop;
    }
    
    // Mostrar mensaje si no hay logs
    if (filteredLogs.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = `
        text-align: center;
        padding: 40px 20px;
        color: #6b7280;
        font-size: 14px;
      `;
      empty.textContent = this.searchQuery || this.filterType !== 'all' 
        ? 'No se encontraron logs con los filtros aplicados' 
        : 'No hay logs registrados';
      this.contentElement.innerHTML = '';
      this.contentElement.appendChild(empty);
    }
  }

  private highlightText(text: string, query: string): string {
    if (!query) return '';
    const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
    return text.replace(regex, '<mark style="background: #fef08a; padding: 2px 0;">$1</mark>');
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private togglePanel() {
    if (!this.panel) return;
    
    this.isPanelVisible = !this.isPanelVisible;
    
    if (this.isPanelVisible) {
      this.panel.style.display = 'flex';
      this.panel.style.opacity = '0';
      this.panel.style.transform = 'translateY(10px)';
      requestAnimationFrame(() => {
        if (this.panel) {
          this.panel.style.opacity = '1';
          this.panel.style.transform = 'translateY(0)';
        }
      });
      this.updatePanel();
    } else {
      this.panel.style.opacity = '0';
      this.panel.style.transform = 'translateY(10px)';
      setTimeout(() => {
        if (this.panel) {
          this.panel.style.display = 'none';
        }
      }, 200);
    }
  }

  private exportLogsToClipboard() {
    const json = this.exportLogs();
    navigator.clipboard.writeText(json).then(() => {
      // Mostrar feedback visual
      const originalText = this.headerElement?.querySelector('button[title="Exportar logs"]')?.textContent;
      const exportBtn = this.headerElement?.querySelector('button[title="Exportar logs"]') as HTMLButtonElement;
      if (exportBtn) {
        exportBtn.textContent = '✅';
        setTimeout(() => {
          if (exportBtn) exportBtn.textContent = originalText || '📥';
        }, 2000);
      }
    }).catch(() => {
      // Fallback: mostrar en consola
      console.log('Logs exportados:', json);
    });
  }

  // Métodos públicos (mantener compatibilidad)
  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs() {
    this.logs = [];
    this.recentLogs.clear();
    this.collapsedStates.clear();
    this.saveLogs();
    this.updateBadge();
    if (this.isPanelVisible) {
      this.updatePanel();
    }
  }
}

// Exportar la clase para inicialización manual
export { DebugConsole, type ErrorLog };

// Guard global para prevenir múltiples inicializaciones
let isInitialized = false;

// Función de inicialización que se puede llamar desde el componente
export function initDebugConsole() {
  if (typeof window === 'undefined') return null;
  
  // Guard: retornar instancia existente si ya está inicializada
  if (isInitialized && window.debugConsole && typeof (window.debugConsole as DebugConsole).getLogs === 'function') {
    return window.debugConsole as DebugConsole;
  }
  
  try {
    const debugConsole = new DebugConsole();
    
    // Exponer globalmente para acceso desde consola del navegador
    Object.defineProperty(window, 'debugConsole', {
      value: debugConsole,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    
    // También crear alias directo para facilitar acceso
    (window as unknown as { $debug: DebugConsole }).$debug = debugConsole;
    
    // Marcar como inicializado
    isInitialized = true;
    
    // Mensaje consolidado y compacto
    console.log('%c🐛 Debug Console activado', 'color: #ef4444; font-weight: bold; font-size: 14px;');
    console.log('%cUsa window.debugConsole o window.$debug para acceder a los métodos:', 'color: #6b7280;');
    console.log('  - window.debugConsole.getLogs() - Obtener todos los logs');
    console.log('  - window.debugConsole.exportLogs() - Exportar logs como JSON');
    console.log('  - window.debugConsole.clearLogs() - Limpiar logs');
    console.log('  - window.$debug.getLogs() - Atajo (alternativa)');
    console.log('  - Haz click en el botón 🐛 en la esquina inferior derecha para ver el panel');
    
    return debugConsole;
  } catch (error) {
    console.error('Error al inicializar Debug Console:', error);
    
    // Crear un objeto mínimo incluso si hay error
    const fallback = {
      getLogs: () => [],
      exportLogs: () => '[]',
      clearLogs: () => {},
    };
    
    Object.defineProperty(window, 'debugConsole', {
      value: fallback,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    
    return null;
  }
}
