// AI_DECISION: Normalización centralizada para AUM
// Justificación: Evita duplicación y asegura reglas consistentes entre parsing, matching y commit
// Impacto: Reduce errores por diferencias de formato en números de cuenta y nombres de asesor

export function normalizeAdvisorAlias(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeAccountNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const digitsOnly = value.replace(/\D+/g, '');
  return digitsOnly.length > 0 ? digitsOnly : null;
}
