import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Función para formatear fechas
export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Función para formatear números como moneda
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(amount);
}

// Función para generar colores aleatorios para avatares
export function getAvatarColor(name: string): string {
  const colors = [
    'bg-error-500',
    'bg-oasis-500',
    'bg-cactus-500',
    'bg-sunlight-500',
    'bg-terracotta-500',
    'bg-pear-500',
    'bg-neutral-500',
    'bg-neutral-600'
  ];
  
  // Validar que name existe y no está vacío
  if (!name || name.trim().length === 0) {
    return 'bg-gradient-to-br from-pastel-mint-400 to-pastel-mint-500';
  }
  
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

// Función para obtener las iniciales de un nombre
export function getInitials(name: string): string {
  // Validar que name existe y no está vacío
  if (!name || name.trim().length === 0) {
    return 'U';
  }
  
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Función para validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Función para validar teléfono argentino
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+54\s?\d{2,4}\s?\d{4}-?\d{4}$/;
  return phoneRegex.test(phone);
}

// Función para truncar texto
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

// Función para generar ID único
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Función para calcular días transcurridos
export function daysSince(date: string | Date): number {
  const now = new Date();
  const past = new Date(date);
  const diffTime = Math.abs(now.getTime() - past.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Función para obtener saludo según la hora
export function getGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour < 12) {
    return 'Buenos días';
  } else if (hour < 18) {
    return 'Buenas tardes';
  } else {
    return 'Buenas noches';
  }
}

// Función para determinar el estado de prioridad
export function getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'high':
      return 'bg-error-50 text-error';
    case 'medium':
      return 'bg-sunlight-50 text-sunlight-700';
    case 'low':
      return 'bg-cactus-50 text-cactus-700';
    default:
      return 'bg-neutral-50 text-primary';
  }
}

// Función para obtener el progreso en porcentaje
export function calculateProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}