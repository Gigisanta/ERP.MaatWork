/**
 * Tipos relacionados con asignaciones de portfolio a contactos
 */

/**
 * Asignación de portfolio a contacto
 */
export interface PortfolioAssignment {
  id: string;
  contactId: string;
  templateId: string;
  templateName?: string; // Nombre del template (para UI)
  status: 'active' | 'paused' | 'ended';
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request para asignar portfolio a contacto
 */
export interface AssignPortfolioRequest {
  templateId: string;
  status?: 'active' | 'paused' | 'ended';
  startDate?: string;
  endDate?: string;
  notes?: string;
}

/**
 * Response de asignación de portfolio
 */
export interface AssignPortfolioResponse {
  assignment: PortfolioAssignment;
  message?: string;
}

