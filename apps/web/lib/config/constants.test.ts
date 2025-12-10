import { describe, it, expect } from 'vitest';
import {
  PAGINATION,
  UI_DELAYS,
  UI_LIMITS,
  FILE_SIZE_LIMITS,
  FORM_LIMITS,
  CACHE_CONFIG,
  RETRY_CONFIG,
  FORMAT_HELPERS,
} from './constants';

describe('constants', () => {
  describe('PAGINATION', () => {
    it('debería tener valores correctos', () => {
      expect(PAGINATION.DEFAULT_PAGE_SIZE).toBe(50);
      expect(PAGINATION.MIN_PAGE_SIZE).toBe(10);
      expect(PAGINATION.MAX_PAGE_SIZE).toBe(200);
      expect(PAGINATION.PAGE_SIZE_OPTIONS).toEqual([10, 25, 50, 100, 200]);
      expect(PAGINATION.MAX_ITEMS_WITHOUT_PAGINATION).toBe(100);
    });

    it('debería tener opciones de tamaño de página ordenadas', () => {
      const options = PAGINATION.PAGE_SIZE_OPTIONS;
      for (let i = 1; i < options.length; i++) {
        expect(options[i]).toBeGreaterThan(options[i - 1]);
      }
    });
  });

  describe('UI_DELAYS', () => {
    it('debería tener todos los delays definidos', () => {
      expect(UI_DELAYS.SEARCH_DEBOUNCE).toBe(300);
      expect(UI_DELAYS.INPUT_DEBOUNCE).toBe(500);
      expect(UI_DELAYS.AUTO_SAVE_DELAY).toBe(2000);
      expect(UI_DELAYS.SUCCESS_MESSAGE_TIMEOUT).toBe(3000);
      expect(UI_DELAYS.ERROR_MESSAGE_TIMEOUT).toBe(5000);
      expect(UI_DELAYS.TRANSITION_DELAY).toBe(200);
      expect(UI_DELAYS.TOOLTIP_DELAY).toBe(500);
      expect(UI_DELAYS.LOADING_STATE_DELAY).toBe(100);
    });

    it('debería tener timeouts positivos', () => {
      expect(UI_DELAYS.SUCCESS_MESSAGE_TIMEOUT).toBeGreaterThan(0);
      expect(UI_DELAYS.ERROR_MESSAGE_TIMEOUT).toBeGreaterThan(0);
    });
  });

  describe('UI_LIMITS', () => {
    it('debería tener todos los límites definidos', () => {
      expect(UI_LIMITS.MAX_DROPDOWN_ITEMS).toBe(100);
      expect(UI_LIMITS.MAX_TEXT_PREVIEW_LENGTH).toBe(150);
      expect(UI_LIMITS.MAX_VISIBLE_TAGS).toBe(5);
      expect(UI_LIMITS.MAX_COMPACT_LIST_ITEMS).toBe(10);
      expect(UI_LIMITS.MAX_FILENAME_DISPLAY_LENGTH).toBe(30);
      expect(UI_LIMITS.MAX_CHIP_ITEMS).toBe(10);
    });

    it('debería tener límites positivos', () => {
      Object.values(UI_LIMITS).forEach((limit) => {
        expect(limit).toBeGreaterThan(0);
      });
    });
  });

  describe('FILE_SIZE_LIMITS', () => {
    it('debería tener tamaños correctos en bytes', () => {
      expect(FILE_SIZE_LIMITS.MAX_UPLOAD_SIZE).toBe(25 * 1024 * 1024);
      expect(FILE_SIZE_LIMITS.MAX_IMAGE_PREVIEW_SIZE).toBe(5 * 1024 * 1024);
      expect(FILE_SIZE_LIMITS.MAX_EXPORT_SIZE_WITHOUT_CONFIRM).toBe(10 * 1024 * 1024);
    });

    it('debería tener MAX_UPLOAD_SIZE mayor que otros límites', () => {
      expect(FILE_SIZE_LIMITS.MAX_UPLOAD_SIZE).toBeGreaterThan(
        FILE_SIZE_LIMITS.MAX_IMAGE_PREVIEW_SIZE
      );
      expect(FILE_SIZE_LIMITS.MAX_UPLOAD_SIZE).toBeGreaterThan(
        FILE_SIZE_LIMITS.MAX_EXPORT_SIZE_WITHOUT_CONFIRM
      );
    });
  });

  describe('FORM_LIMITS', () => {
    it('debería tener límites de longitud correctos', () => {
      expect(FORM_LIMITS.MIN_PASSWORD_LENGTH).toBe(8);
      expect(FORM_LIMITS.MAX_PASSWORD_LENGTH).toBe(128);
      expect(FORM_LIMITS.MAX_NAME_LENGTH).toBe(200);
      expect(FORM_LIMITS.MAX_DESCRIPTION_LENGTH).toBe(2000);
      expect(FORM_LIMITS.MAX_EMAIL_LENGTH).toBe(255);
      expect(FORM_LIMITS.MAX_URL_LENGTH).toBe(500);
      expect(FORM_LIMITS.MAX_PHONE_LENGTH).toBe(50);
      expect(FORM_LIMITS.MAX_ARRAY_ITEMS).toBe(100);
    });

    it('debería tener MIN_PASSWORD_LENGTH menor que MAX_PASSWORD_LENGTH', () => {
      expect(FORM_LIMITS.MIN_PASSWORD_LENGTH).toBeLessThan(FORM_LIMITS.MAX_PASSWORD_LENGTH);
    });
  });

  describe('CACHE_CONFIG', () => {
    it('debería tener configuraciones de cache correctas', () => {
      expect(CACHE_CONFIG.DEDUPING_INTERVAL).toBe(10000);
      expect(CACHE_CONFIG.FOCUS_THROTTLE_INTERVAL).toBe(60000);
      expect(CACHE_CONFIG.STALE_TIME_LONG).toBe(300000);
      expect(CACHE_CONFIG.STALE_TIME_SHORT).toBe(30000);
    });

    it('debería tener STALE_TIME_LONG mayor que STALE_TIME_SHORT', () => {
      expect(CACHE_CONFIG.STALE_TIME_LONG).toBeGreaterThan(CACHE_CONFIG.STALE_TIME_SHORT);
    });
  });

  describe('RETRY_CONFIG', () => {
    it('debería tener configuración de retry correcta', () => {
      expect(RETRY_CONFIG.MAX_RETRIES).toBe(3);
      expect(RETRY_CONFIG.INITIAL_RETRY_DELAY).toBe(1000);
      expect(RETRY_CONFIG.BACKOFF_FACTOR).toBe(2);
      expect(RETRY_CONFIG.MAX_RETRY_DELAY).toBe(10000);
    });

    it('debería tener MAX_RETRY_DELAY mayor que INITIAL_RETRY_DELAY', () => {
      expect(RETRY_CONFIG.MAX_RETRY_DELAY).toBeGreaterThan(RETRY_CONFIG.INITIAL_RETRY_DELAY);
    });
  });

  describe('FORMAT_HELPERS', () => {
    it('debería tener formatos correctos', () => {
      expect(FORMAT_HELPERS.DATE_FORMAT_SHORT).toBe('DD/MM/YYYY');
      expect(FORMAT_HELPERS.DATE_FORMAT_LONG).toBe('DD/MM/YYYY HH:mm');
      expect(FORMAT_HELPERS.CURRENCY_FORMAT).toBe('es-AR');
      expect(FORMAT_HELPERS.PERCENTAGE_DECIMALS).toBe(2);
      expect(FORMAT_HELPERS.AMOUNT_DECIMALS).toBe(2);
    });

    it('debería tener decimales no negativos', () => {
      expect(FORMAT_HELPERS.PERCENTAGE_DECIMALS).toBeGreaterThanOrEqual(0);
      expect(FORMAT_HELPERS.AMOUNT_DECIMALS).toBeGreaterThanOrEqual(0);
    });
  });
});
