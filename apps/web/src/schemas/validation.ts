import { z } from 'zod';

// Validaciones personalizadas
const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
const nameRegex = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/;
const companyRegex = /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s\d\.,&-]+$/;

// Esquema para contactos con validaciones robustas
export const contactSchema = z.object({
  id: z.uuid().optional(),
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es muy largo')
    .regex(nameRegex, 'El nombre solo puede contener letras y espacios')
    .transform(val => val.trim()),
  email: z.string()
    .transform(val => val.trim())
    .refine(val => val === '' || z.email().safeParse(val).success, {
      message: 'Email inválido'
    })
    .transform(val => val === '' ? undefined : val.toLowerCase())
    .optional(),
  phone: z.string()
    .transform(val => val?.trim() || '')
    .refine(val => val === '' || phoneRegex.test(val), {
      message: 'Formato de teléfono inválido'
    })
    .transform(val => val === '' ? undefined : val.replace(/\s+/g, ''))
    .optional(),
  company: z.string()
    .max(100, 'El nombre de la empresa es muy largo')
    .regex(companyRegex, 'Nombre de empresa inválido')
    .transform(val => val.trim())
    .optional(),
  status: z.enum(['Prospecto', 'Contactado', 'Primera reunión', 'Segunda reunión', 'Reunión de cierre', 'Apertura', 'Cliente', 'Cuenta Vacia']),
  assigned_to: z.uuid('ID de usuario inválido'),
  value: z.number()
    .min(0, 'El valor debe ser positivo')
    .max(999999999, 'Valor muy alto')
    .optional(),
  notes: z.array(z.string()).optional(),

  last_contact_date: z.string().datetime().optional(),
  created_at: z.iso.datetime().optional(),
  updated_at: z.iso.datetime().optional()
});

// Esquema para etiquetas
export const contactTagSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().min(1, 'El nombre de la etiqueta es requerido').max(50, 'El nombre es muy largo'),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Color hexadecimal inválido'),
  user_id: z.uuid('ID de usuario inválido'),
  created_at: z.iso.datetime().optional()
});

// Esquema para usuarios
export const userSchema = z.object({
  id: z.uuid(),
  email: z.email('Email inválido'),
  full_name: z.string().min(1, 'El nombre completo es requerido').max(100),
  role: z.enum(['admin', 'manager', 'agent']),
  status: z.enum(['active', 'inactive', 'pending']),
  created_at: z.iso.datetime().optional()
});

// Esquema para autenticación
export const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

export const registerSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  full_name: z.string()
    .min(2, 'El nombre completo debe tener al menos 2 caracteres')
    .max(100, 'El nombre es muy largo')
    .regex(nameRegex, 'El nombre solo puede contener letras y espacios')
    .transform(val => val.trim()),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

// Esquema para notas
export const noteSchema = z.object({
  id: z.uuid().optional(),
  contact_id: z.uuid('ID de contacto inválido'),
  author_id: z.uuid('ID de autor inválido'),
  content: z.string()
    .min(1, 'El contenido de la nota es requerido')
    .max(5000, 'La nota es muy larga')
    .transform(val => val.trim()),
  note_type: z.enum(['call', 'meeting', 'email', 'general', 'follow_up']),
  is_important: z.boolean().default(false),
  created_at: z.iso.datetime().optional(),
  updated_at: z.iso.datetime().optional()
});

// Esquema para tareas
export const taskSchema = z.object({
  id: z.uuid().optional(),
  title: z.string()
    .min(3, 'El título debe tener al menos 3 caracteres')
    .max(200, 'El título es muy largo')
    .transform(val => val.trim()),
  description: z.string()
    .max(2000, 'La descripción es muy larga')
    .transform(val => val.trim())
    .optional(),
  assigned_to: z.uuid('ID de usuario inválido'),
  contact_id: z.uuid('ID de contacto inválido').optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due_date: z.iso.datetime('Fecha de vencimiento inválida').optional(),
  created_at: z.iso.datetime().optional(),
  updated_at: z.iso.datetime().optional(),
  completed_at: z.iso.datetime().optional()
});

// Tipos TypeScript derivados
export type Contact = z.infer<typeof contactSchema>;
export type ContactTag = z.infer<typeof contactTagSchema>;
export type User = z.infer<typeof userSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type Note = z.infer<typeof noteSchema>;
export type Task = z.infer<typeof taskSchema>;

// Función helper para validación
export const validateData = <T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } => {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.issues.map(err => err.message);
  return { success: false, errors };
};