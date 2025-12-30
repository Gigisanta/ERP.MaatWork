/**
 * Constructor del panel de Debug Console
 */

import type { ErrorLog, FilterType } from '../types';
import { FILTER_TYPES, LOG_COLORS } from '../types';
import { highlightText } from '../utils';
import {
  BADGE_STYLES,
  BUTTON_STYLES,
  CLOSE_BUTTON_STYLES,
  CONTENT_STYLES,
  COPY_BUTTON_STYLES,
  EMPTY_STATE_STYLES,
  FILTER_BUTTON_ACTIVE_STYLES,
  FILTER_BUTTON_INACTIVE_STYLES,
  FILTER_BUTTON_STYLES,
  HEADER_BUTTON_STYLES,
  HEADER_STYLES,
  LOG_ITEM_STYLES,
  PANEL_STYLES,
  SEARCH_INPUT_STYLES,
  STACK_TRACE_STYLES,
  TOOLBAR_STYLES,
} from './styles';

export interface PanelElements {
  button: HTMLButtonElement;
  badge: HTMLSpanElement;
  panel: HTMLDivElement;
  header: HTMLDivElement;
  content: HTMLDivElement;
  searchInput: HTMLInputElement;
  filterButtons: Map<string, HTMLButtonElement>;
}

interface PanelCallbacks {
  onToggle: () => void;
  onClear: () => void;
  onExport: () => void;
  onFilterChange: (filter: FilterType) => void;
  onSearchChange: (query: string) => void;
  onScroll: () => void;
}

/**
 * Crea el botón flotante con badge
 */
function createButton(onToggle: () => void): {
  button: HTMLButtonElement;
  badge: HTMLSpanElement;
} {
  const button = document.createElement('button');
  button.textContent = '🐛';
  button.className = 'debug-console-button';
  button.style.cssText = BUTTON_STYLES;
  button.onmouseenter = () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
  };
  button.onmouseleave = () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  };
  button.onclick = onToggle;

  const badge = document.createElement('span');
  badge.className = 'debug-console-badge';
  badge.style.cssText = BADGE_STYLES;
  button.appendChild(badge);

  return { button, badge };
}

/**
 * Crea el header del panel
 */
function createHeader(callbacks: {
  onExport: () => void;
  onClear: () => void;
  onClose: () => void;
}): HTMLDivElement {
  const header = document.createElement('div');
  header.className = 'debug-console-header';
  header.style.cssText = HEADER_STYLES;

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
  exportBtn.style.cssText = HEADER_BUTTON_STYLES;
  exportBtn.onmouseenter = () => {
    exportBtn.style.background = 'rgba(255,255,255,0.3)';
  };
  exportBtn.onmouseleave = () => {
    exportBtn.style.background = 'rgba(255,255,255,0.2)';
  };
  exportBtn.onclick = callbacks.onExport;

  const clearBtn = document.createElement('button');
  clearBtn.textContent = '🗑️';
  clearBtn.title = 'Limpiar logs';
  clearBtn.style.cssText = HEADER_BUTTON_STYLES;
  clearBtn.onmouseenter = () => {
    clearBtn.style.background = 'rgba(255,255,255,0.3)';
  };
  clearBtn.onmouseleave = () => {
    clearBtn.style.background = 'rgba(255,255,255,0.2)';
  };
  clearBtn.onclick = callbacks.onClear;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.title = 'Cerrar';
  closeBtn.style.cssText = CLOSE_BUTTON_STYLES;
  closeBtn.onmouseenter = () => {
    closeBtn.style.background = 'rgba(255,255,255,0.2)';
  };
  closeBtn.onmouseleave = () => {
    closeBtn.style.background = 'none';
  };
  closeBtn.onclick = callbacks.onClose;

  headerRight.appendChild(exportBtn);
  headerRight.appendChild(clearBtn);
  headerRight.appendChild(closeBtn);

  header.appendChild(headerLeft);
  header.appendChild(headerRight);

  return header;
}

/**
 * Crea la barra de herramientas con filtros y búsqueda
 */
function createToolbar(
  currentFilter: FilterType,
  callbacks: {
    onFilterChange: (filter: FilterType) => void;
    onSearchChange: (query: string) => void;
  }
): {
  toolbar: HTMLDivElement;
  searchInput: HTMLInputElement;
  filterButtons: Map<string, HTMLButtonElement>;
} {
  const toolbar = document.createElement('div');
  toolbar.style.cssText = TOOLBAR_STYLES;

  const filterContainer = document.createElement('div');
  filterContainer.style.cssText = 'display: flex; gap: 4px;';

  const filterButtons = new Map<string, HTMLButtonElement>();

  FILTER_TYPES.forEach(({ value, label, emoji }) => {
    const btn = document.createElement('button');
    btn.textContent = `${emoji} ${label}`;
    btn.dataset.filter = value;
    btn.style.cssText = FILTER_BUTTON_STYLES;
    if (value === currentFilter) {
      Object.assign(btn.style, FILTER_BUTTON_ACTIVE_STYLES);
    }
    btn.onclick = () => callbacks.onFilterChange(value);
    filterButtons.set(value, btn);
    filterContainer.appendChild(btn);
  });

  const searchContainer = document.createElement('div');
  searchContainer.style.cssText = 'flex: 1; min-width: 200px;';

  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = '🔍 Buscar en logs...';
  searchInput.style.cssText = SEARCH_INPUT_STYLES;
  searchInput.oninput = () => {
    callbacks.onSearchChange(searchInput.value);
  };

  searchContainer.appendChild(searchInput);

  toolbar.appendChild(filterContainer);
  toolbar.appendChild(searchContainer);

  return { toolbar, searchInput, filterButtons };
}

/**
 * Crea el panel completo
 */
export function createDebugPanel(
  currentFilter: FilterType,
  callbacks: PanelCallbacks
): PanelElements | null {
  if (typeof document === 'undefined') return null;

  const { button, badge } = createButton(callbacks.onToggle);

  const panel = document.createElement('div');
  panel.className = 'debug-console-panel';
  panel.style.cssText = PANEL_STYLES;

  const header = createHeader({
    onExport: callbacks.onExport,
    onClear: callbacks.onClear,
    onClose: callbacks.onToggle,
  });

  const { toolbar, searchInput, filterButtons } = createToolbar(currentFilter, {
    onFilterChange: callbacks.onFilterChange,
    onSearchChange: callbacks.onSearchChange,
  });

  const content = document.createElement('div');
  content.id = 'debug-content';
  content.style.cssText = CONTENT_STYLES;
  content.onscroll = callbacks.onScroll;

  panel.appendChild(header);
  panel.appendChild(toolbar);
  panel.appendChild(content);

  document.body.appendChild(button);
  document.body.appendChild(panel);

  return {
    button,
    badge,
    panel,
    header,
    content,
    searchInput,
    filterButtons,
  };
}

/**
 * Actualiza los estilos de los botones de filtro
 */
export function updateFilterButtonStyles(
  filterButtons: Map<string, HTMLButtonElement>,
  activeFilter: FilterType
): void {
  filterButtons.forEach((btn, value) => {
    if (value === activeFilter) {
      Object.assign(btn.style, FILTER_BUTTON_ACTIVE_STYLES);
    } else {
      Object.assign(btn.style, FILTER_BUTTON_INACTIVE_STYLES);
    }
  });
}

/**
 * Renderiza un log individual
 */
export function renderLogItem(
  log: ErrorLog,
  index: number,
  isCollapsed: boolean,
  searchQuery: string,
  onToggleCollapse: (index: number) => void,
  onCopy: (log: ErrorLog) => void
): HTMLDivElement {
  const color = LOG_COLORS[log.type];

  const logElement = document.createElement('div');
  logElement.className = 'debug-log-item';
  logElement.style.cssText = LOG_ITEM_STYLES(color);
  logElement.onmouseenter = () => {
    logElement.style.background = '#f3f4f6';
  };
  logElement.onmouseleave = () => {
    logElement.style.background = '#f9fafb';
  };

  const header = document.createElement('div');
  header.style.cssText =
    'display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; cursor: pointer;';
  header.onclick = () => onToggleCollapse(index);

  const left = document.createElement('div');
  left.style.cssText = 'display: flex; align-items: center; gap: 8px;';

  const typeBadge = document.createElement('span');
  typeBadge.textContent = `[${log.type.toUpperCase()}]`;
  typeBadge.style.cssText = `font-weight: bold; color: ${color}; font-size: 11px;`;

  left.appendChild(typeBadge);

  if (log.count && log.count > 1) {
    const countBadge = document.createElement('span');
    countBadge.textContent = `×${log.count}`;
    countBadge.style.cssText = `
      background: ${color};
      color: white;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: bold;
    `;
    left.appendChild(countBadge);
  }

  const right = document.createElement('div');
  right.style.cssText =
    'display: flex; align-items: center; gap: 8px; font-size: 10px; color: #6b7280;';

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
  if (searchQuery) {
    message.innerHTML = highlightText(log.message, searchQuery);
  } else {
    message.textContent = log.message;
  }

  logElement.appendChild(header);
  logElement.appendChild(message);

  if (!isCollapsed) {
    if (log.stack) {
      const stack = document.createElement('pre');
      stack.style.cssText = STACK_TRACE_STYLES;
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
      pre.style.cssText = STACK_TRACE_STYLES;
      pre.textContent = JSON.stringify(log.details, null, 2);

      details.appendChild(summary);
      details.appendChild(pre);
      logElement.appendChild(details);
    }

    const copyBtn = document.createElement('button');
    copyBtn.textContent = '📋 Copiar';
    copyBtn.style.cssText = COPY_BUTTON_STYLES;
    copyBtn.onmouseenter = () => {
      copyBtn.style.background = '#2563eb';
    };
    copyBtn.onmouseleave = () => {
      copyBtn.style.background = '#3b82f6';
    };
    copyBtn.onclick = (e) => {
      e.stopPropagation();
      onCopy(log);
      copyBtn.textContent = '✅ Copiado';
      setTimeout(() => {
        copyBtn.textContent = '📋 Copiar';
      }, 2000);
    };
    logElement.appendChild(copyBtn);
  }

  return logElement;
}

/**
 * Renderiza el estado vacío
 */
export function renderEmptyState(hasFilters: boolean): HTMLDivElement {
  const empty = document.createElement('div');
  empty.style.cssText = EMPTY_STATE_STYLES;
  empty.textContent = hasFilters
    ? 'No se encontraron logs con los filtros aplicados'
    : 'No hay logs registrados';
  return empty;
}
