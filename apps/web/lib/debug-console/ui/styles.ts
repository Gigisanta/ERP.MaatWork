/**
 * Estilos para los componentes de UI del Debug Console
 */

export const BUTTON_STYLES = `
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

export const BADGE_STYLES = `
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

export const PANEL_STYLES = `
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

export const HEADER_STYLES = `
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

export const TOOLBAR_STYLES = `
  padding: 10px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

export const CONTENT_STYLES = `
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  padding: 8px;
  background: #ffffff;
`;

export const FILTER_BUTTON_STYLES = `
  padding: 4px 10px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
`;

export const FILTER_BUTTON_ACTIVE_STYLES = {
  background: '#3b82f6',
  color: 'white',
  borderColor: '#3b82f6',
};

export const FILTER_BUTTON_INACTIVE_STYLES = {
  background: 'white',
  color: '#374151',
  borderColor: '#d1d5db',
};

export const SEARCH_INPUT_STYLES = `
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
`;

export const HEADER_BUTTON_STYLES = `
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 14px;
  transition: background 0.2s;
`;

export const CLOSE_BUTTON_STYLES = `
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

export const LOG_ITEM_STYLES = (color: string) => `
  margin-bottom: 8px;
  padding: 10px;
  border-left: 4px solid ${color};
  background: #f9fafb;
  border-radius: 6px;
  transition: background 0.2s;
`;

export const STACK_TRACE_STYLES = `
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

export const COPY_BUTTON_STYLES = `
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

export const EMPTY_STATE_STYLES = `
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  font-size: 14px;
`;








