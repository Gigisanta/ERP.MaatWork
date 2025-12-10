/**
 * Clase principal de Debug Console
 *
 * Features:
 * - Captura de errores con deduplicación inteligente
 * - Panel flotante con filtros, búsqueda y virtualización
 * - Badge con contador de errores
 * - Exportación y limpieza de logs
 * - Alto rendimiento incluso con 1000+ logs
 *
 * AI_DECISION: Refactorizado desde archivo monolítico (1069 líneas) a módulos especializados
 * Justificación: Mejor mantenibilidad, testabilidad y separación de responsabilidades
 * Impacto: Código más organizado y fácil de extender
 *
 * NOTA: Solo se carga en desarrollo (ver layout.tsx: isDevelopment && <DebugConsole />)
 */

import type { ErrorLog, FilterType, SortOrder } from './types';
import { debounce, getDeduplicationKey, getFilteredAndSortedLogs } from './utils';
import { loadLogs, saveLogs } from './storage';
import { setupAllErrorHandlers } from './error-handlers';
import {
  createDebugPanel,
  renderEmptyState,
  renderLogItem,
  updateFilterButtonStyles,
  type PanelElements,
} from './ui/panel-builder';

export class DebugConsole {
  private logs: ErrorLog[] = [];
  private maxLogs = 500;
  private isPanelVisible = false;
  private isLogging = false;

  // Filtros y búsqueda
  private filterType: FilterType = 'all';
  private searchQuery = '';
  private sortOrder: SortOrder = 'newest';

  // Deduplicación
  private recentLogs: Map<string, { log: ErrorLog; timestamp: number }> = new Map();
  private deduplicationWindow = 5000;

  // Virtualización
  private visibleStart = 0;
  private visibleEnd = 50;
  private itemHeight = 80;

  // Estados de colapso
  private collapsedStates: Map<number, boolean> = new Map();

  // Elementos del DOM
  private elements: PanelElements | null = null;

  constructor() {
    if (typeof window === 'undefined') return;

    this.logs = loadLogs();
    this.initializeCollapsedStates();
    this.setupErrorHandlers();
    this.createPanel();
    this.updateBadge();
  }

  private initializeCollapsedStates(): void {
    this.logs.forEach((_, index) => {
      this.collapsedStates.set(index, true);
    });
  }

  private setupErrorHandlers(): void {
    setupAllErrorHandlers(
      (log) => this.log(log),
      () => this.isLogging
    );
  }

  private createPanel(): void {
    this.elements = createDebugPanel(this.filterType, {
      onToggle: () => this.togglePanel(),
      onClear: () => this.clearLogs(),
      onExport: () => this.exportLogsToClipboard(),
      onFilterChange: (filter) => this.setFilter(filter),
      onSearchChange: (query) => {
        this.searchQuery = query;
        this.updatePanelDebounced();
      },
      onScroll: () => this.updateVisibleRange(),
    });
  }

  private log(errorLog: Partial<ErrorLog>): void {
    if (this.isLogging) return;

    this.isLogging = true;
    try {
      const now = Date.now();
      const key = getDeduplicationKey(errorLog);

      // Verificar si es un duplicado reciente
      const recent = this.recentLogs.get(key);
      if (recent && now - recent.timestamp < this.deduplicationWindow) {
        recent.log.count = (recent.log.count || 1) + 1;
        recent.timestamp = now;

        const index = this.logs.findIndex((l) => l === recent.log);
        if (index !== -1) {
          this.logs[index] = { ...recent.log };
          saveLogs(this.logs);
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

      this.collapsedStates.set(0, true);
      saveLogs(this.logs);

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

  private updateBadge(): void {
    if (!this.elements?.badge) return;

    const errorCount = this.logs.filter((l) => l.type === 'error').length;
    if (errorCount > 0) {
      this.elements.badge.textContent = errorCount > 99 ? '99+' : String(errorCount);
      this.elements.badge.style.display = 'flex';
    } else {
      this.elements.badge.style.display = 'none';
    }
  }

  private setFilter(filter: FilterType): void {
    this.filterType = filter;

    if (this.elements?.filterButtons) {
      updateFilterButtonStyles(this.elements.filterButtons, filter);
    }

    this.updatePanel();
  }

  private updateVisibleRange(): void {
    if (!this.elements?.content) return;

    const containerHeight = this.elements.content.clientHeight;
    const scrollTop = this.elements.content.scrollTop;

    this.visibleStart = Math.max(0, Math.floor(scrollTop / this.itemHeight) - 5);
    this.visibleEnd = Math.min(
      this.logs.length,
      Math.ceil((scrollTop + containerHeight) / this.itemHeight) + 5
    );
  }

  private updatePanelDebounced = debounce(() => {
    this.updatePanel();
  }, 200);

  private toggleLogCollapse(index: number): void {
    const current = this.collapsedStates.get(index) ?? true;
    this.collapsedStates.set(index, !current);
    this.updatePanel();
  }

  private updatePanel(): void {
    if (!this.elements?.panel || !this.elements?.content || !this.elements?.header) return;

    const filteredLogs = getFilteredAndSortedLogs(
      this.logs,
      this.filterType,
      this.searchQuery,
      this.sortOrder
    );

    // Actualizar estadísticas
    const total = this.logs.length;
    const errors = this.logs.filter((l) => l.type === 'error').length;
    const warnings = this.logs.filter((l) => l.type === 'warn').length;

    const stats = this.elements.header.querySelector('#debug-stats');
    if (stats) {
      stats.innerHTML = `
        <span>Total: ${total}</span>
        <span>❌ ${errors}</span>
        <span>⚠️ ${warnings}</span>
      `;
    }

    // Guardar posición de scroll
    const scrollTop = this.elements.content.scrollTop;
    const scrollHeight = this.elements.content.scrollHeight;
    const clientHeight = this.elements.content.clientHeight;
    const wasAtBottom = scrollHeight - scrollTop - clientHeight < 10;

    // Renderizar logs con virtualización básica
    this.updateVisibleRange();
    const visibleLogs = filteredLogs.slice(this.visibleStart, this.visibleEnd);

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

      const logElement = renderLogItem(
        log,
        absoluteIndex,
        isCollapsed,
        this.searchQuery,
        (index) => this.toggleLogCollapse(index),
        (logToCopy) => {
          const logText = JSON.stringify(logToCopy, null, 2);
          navigator.clipboard.writeText(logText);
        }
      );

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
    this.elements.content.innerHTML = '';
    this.elements.content.appendChild(fragment);

    // Restaurar posición de scroll
    if (wasAtBottom && this.elements.content.scrollHeight > this.elements.content.clientHeight) {
      this.elements.content.scrollTop = this.elements.content.scrollHeight;
    } else {
      this.elements.content.scrollTop = scrollTop;
    }

    // Mostrar mensaje si no hay logs
    if (filteredLogs.length === 0) {
      const hasFilters = Boolean(this.searchQuery || this.filterType !== 'all');
      const empty = renderEmptyState(hasFilters);
      this.elements.content.innerHTML = '';
      this.elements.content.appendChild(empty);
    }
  }

  private togglePanel(): void {
    if (!this.elements?.panel) return;

    this.isPanelVisible = !this.isPanelVisible;

    if (this.isPanelVisible) {
      this.elements.panel.style.display = 'flex';
      this.elements.panel.style.opacity = '0';
      this.elements.panel.style.transform = 'translateY(10px)';
      requestAnimationFrame(() => {
        if (this.elements?.panel) {
          this.elements.panel.style.opacity = '1';
          this.elements.panel.style.transform = 'translateY(0)';
        }
      });
      this.updatePanel();
    } else {
      this.elements.panel.style.opacity = '0';
      this.elements.panel.style.transform = 'translateY(10px)';
      setTimeout(() => {
        if (this.elements?.panel) {
          this.elements.panel.style.display = 'none';
        }
      }, 200);
    }
  }

  private exportLogsToClipboard(): void {
    const json = this.exportLogs();
    navigator.clipboard
      .writeText(json)
      .then(() => {
        const exportBtn = this.elements?.header?.querySelector(
          'button[title="Exportar logs"]'
        ) as HTMLButtonElement;
        if (exportBtn) {
          const originalText = exportBtn.textContent;
          exportBtn.textContent = '✅';
          setTimeout(() => {
            if (exportBtn) exportBtn.textContent = originalText || '📥';
          }, 2000);
        }
      })
      .catch(() => {
        console.log('Logs exportados:', json);
      });
  }

  // Métodos públicos
  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs(): void {
    this.logs = [];
    this.recentLogs.clear();
    this.collapsedStates.clear();
    saveLogs(this.logs);
    this.updateBadge();
    if (this.isPanelVisible) {
      this.updatePanel();
    }
  }
}
