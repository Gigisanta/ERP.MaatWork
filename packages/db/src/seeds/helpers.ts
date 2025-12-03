/**
 * Seed Helper Functions
 * 
 * Utility functions for generating random test data
 */

import bcrypt from 'bcrypt';

/**
 * Get a random element from an array
 */
export function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]!;
}

/**
 * Get multiple random elements from an array
 */
export function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Generate a random date between daysAgo and daysFuture
 */
export function getRandomDate(daysAgo: number, daysFuture: number = 0): Date {
  const now = new Date();
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  const future = new Date(now.getTime() + daysFuture * 24 * 60 * 60 * 1000);
  const randomTime = past.getTime() + Math.random() * (future.getTime() - past.getTime());
  return new Date(randomTime);
}

/**
 * Generate a random date (date only, no time)
 */
export function getRandomDateOnly(daysAgo: number, daysFuture: number = 0): string {
  const date = getRandomDate(daysAgo, daysFuture);
  return date.toISOString().split('T')[0]!;
}

/**
 * Argentine first names for random data generation
 */
export const ARGENTINE_FIRST_NAMES = [
  'Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Laura', 'Diego', 'Sofía',
  'Pedro', 'Valentina', 'Miguel', 'Camila', 'José', 'Martina', 'Fernando', 'Isabella',
  'Roberto', 'Lucía', 'Daniel', 'Emma', 'Andrés', 'Olivia', 'Javier', 'Sara',
  'Ricardo', 'Emma', 'Gustavo', 'Mía', 'Martín', 'Julia', 'Alejandro', 'Victoria',
  'Sergio', 'Andrea', 'Pablo', 'Gabriela', 'Francisco', 'Natalia', 'Rodrigo', 'Paula'
];

/**
 * Argentine last names for random data generation
 */
export const ARGENTINE_LAST_NAMES = [
  'García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez',
  'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Álvarez',
  'Muñoz', 'Romero', 'Alonso', 'Gutiérrez', 'Navarro', 'Torres', 'Domínguez', 'Vázquez',
  'Ramos', 'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Molina', 'Morales', 'Suárez',
  'Ortega', 'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Núñez'
];

/**
 * Generate random Argentine name
 */
export function generateRandomName(): { firstName: string; lastName: string } {
  return {
    firstName: getRandomElement(ARGENTINE_FIRST_NAMES),
    lastName: getRandomElement(ARGENTINE_LAST_NAMES)
  };
}

/**
 * Generate random email
 */
export function generateRandomEmail(firstName: string, lastName: string): string {
  const domains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'grupoabax.com'];
  const domain = getRandomElement(domains);
  const number = Math.floor(Math.random() * 1000);
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${number}@${domain}`;
}

/**
 * Generate random Argentine phone number
 */
export function generateRandomPhone(): string {
  const areaCodes = ['11', '15', '351', '341', '299', '387', '381', '385', '383', '381'];
  const areaCode = getRandomElement(areaCodes);
  const number = Math.floor(1000000 + Math.random() * 9000000);
  return `+54${areaCode}${number}`;
}

/**
 * Generate random Argentine DNI
 */
export function generateRandomDNI(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}





