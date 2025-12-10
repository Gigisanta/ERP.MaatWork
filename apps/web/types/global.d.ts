/**
 * Global type declarations for the web app
 */

import type { DebugConsole } from '../lib/debug-console/index';

declare global {
  interface Window {
    /**
     * Debug console instance for development debugging
     * Only available in development mode
     */
    debugConsole?: DebugConsole;
    /**
     * Shorthand alias for debugConsole
     */
    $debug?: DebugConsole;
  }
}

export {};
