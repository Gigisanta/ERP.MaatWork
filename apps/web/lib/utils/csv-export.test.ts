/**
 * Tests para csv-export utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { exportContactsToCSV, downloadCSV } from './csv-export';
import type { Contact } from '@/types/contact';
import type { PipelineStage } from '@/types/pipeline';

describe('csv-export', () => {
  const mockStages: PipelineStage[] = [
    { id: 'stage-1', name: 'Prospecto', order: 1, userId: 'user-1' },
    { id: 'stage-2', name: 'Reunión', order: 2, userId: 'user-1' },
  ];

  const mockContact: Contact = {
    id: 'contact-1',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    email: 'john@example.com',
    phone: '123456789',
    dni: '12345678',
    pipelineStageId: 'stage-1',
    nextStep: 'Follow up',
    notes: 'Test notes',
    createdAt: '2024-01-01T00:00:00Z',
    contactLastTouchAt: '2024-01-15T00:00:00Z',
    customFields: {
      whatsapp: '987654321',
      phoneSecondary: '555555555',
    },
    tags: [
      { id: 'tag-1', name: 'VIP' },
      { id: 'tag-2', name: 'Hot Lead' },
    ],
  };

  beforeEach(() => {
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exportContactsToCSV', () => {
    it('debería exportar contactos a CSV', () => {
      const csv = exportContactsToCSV([mockContact], mockStages);

      expect(csv).toContain('Nombre Completo');
      expect(csv).toContain('John Doe');
      expect(csv).toContain('john@example.com');
      expect(csv).toContain('123456789');
      expect(csv).toContain('Prospecto');
      expect(csv).toContain('VIP; Hot Lead');
    });

    it('debería incluir BOM UTF-8 al inicio', () => {
      const csv = exportContactsToCSV([mockContact], mockStages);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    it('debería exportar CSV vacío con headers si no hay contactos', () => {
      const csv = exportContactsToCSV([], mockStages);

      expect(csv).toContain('Nombre Completo');
      expect(csv).toContain('Email');
      expect(csv).not.toContain('John Doe');
    });

    it('debería manejar contactos sin email ni teléfono', () => {
      const contactWithoutContact: Contact = {
        ...mockContact,
        email: null,
        phone: null,
        customFields: {},
      };

      const csv = exportContactsToCSV([contactWithoutContact], mockStages);
      expect(csv).toContain('John Doe');
    });

    it('debería escapar valores con comillas en CSV', () => {
      const contactWithQuotes: Contact = {
        ...mockContact,
        notes: 'Test "quoted" notes',
      };

      const csv = exportContactsToCSV([contactWithQuotes], mockStages);
      expect(csv).toContain('"Test ""quoted"" notes"');
    });

    it('debería escapar valores con comas en CSV', () => {
      const contactWithComma: Contact = {
        ...mockContact,
        notes: 'Test, notes with comma',
      };

      const csv = exportContactsToCSV([contactWithComma], mockStages);
      expect(csv).toContain('"Test, notes with comma"');
    });

    it('debería ordenar contactos por completitud', () => {
      const completeContact: Contact = {
        ...mockContact,
        id: 'contact-complete',
        email: 'complete@example.com',
        phone: '111111111',
      };

      const incompleteContact: Contact = {
        ...mockContact,
        id: 'contact-incomplete',
        email: null,
        phone: null,
      };

      const csv = exportContactsToCSV([incompleteContact, completeContact], mockStages);
      const lines = csv.split('\n');
      // El contacto completo debería aparecer primero
      expect(lines[1]).toContain('complete@example.com');
      expect(lines[2]).toContain('contact-incomplete');
    });

    it('debería manejar contactos sin pipelineStageId', () => {
      const contactWithoutStage: Contact = {
        ...mockContact,
        pipelineStageId: null,
      };

      const csv = exportContactsToCSV([contactWithoutStage], mockStages);
      expect(csv).toContain('John Doe');
    });

    it('debería manejar contactos sin tags', () => {
      const contactWithoutTags: Contact = {
        ...mockContact,
        tags: [],
      };

      const csv = exportContactsToCSV([contactWithoutTags], mockStages);
      expect(csv).toContain('John Doe');
    });

    it('debería manejar array inválido de contactos', () => {
      const csv = exportContactsToCSV(null as any, mockStages);
      expect(csv).toContain('Nombre Completo');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('downloadCSV', () => {
    beforeEach(() => {
      // Mock DOM APIs
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();

      // Mock document.createElement
      const mockLink = {
        setAttribute: vi.fn(),
        style: {},
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

      // Mock setTimeout
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('debería descargar CSV con nombre de archivo', () => {
      const csv = exportContactsToCSV([mockContact], mockStages);

      downloadCSV(csv, 'test-contacts');

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('debería lanzar error si el contenido está vacío', () => {
      expect(() => {
        downloadCSV('', 'test');
      }).toThrow('El contenido CSV está vacío');
    });

    it('debería mostrar warning si solo hay headers', () => {
      const csvOnlyHeaders = '\uFEFFNombre Completo,Email\n';

      downloadCSV(csvOnlyHeaders, 'test');

      expect(console.warn).toHaveBeenCalled();
    });

    it('debería limpiar URL después de descargar', () => {
      const csv = exportContactsToCSV([mockContact], mockStages);

      downloadCSV(csv, 'test-contacts');

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });
});
