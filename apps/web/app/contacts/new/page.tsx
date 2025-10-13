"use client";
import { useAuth } from '../../auth/AuthContext';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PipelineStage {
  id: string;
  name: string;
  description?: string;
  order: number;
  color: string;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  role: string;
  teamId?: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dni: string;
  pipelineStageId: string;
  source: string;
  riskProfile: 'low' | 'mid' | 'high' | '';
  notes: string;
}

const initialFormData: FormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dni: '',
  pipelineStageId: '',
  source: '',
  riskProfile: '',
  notes: ''
};

export default function NewContactPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Estados para cargar datos de selects
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Cargar datos iniciales (pipeline stages y usuarios)
  useEffect(() => {
    if (!token) return;

    const loadInitialData = async () => {
      try {
        setLoadingData(true);

        // Cargar etapas del pipeline
        const stagesRes = await fetch(`${apiUrl}/pipeline/stages`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (stagesRes.ok) {
          const stagesData = await stagesRes.json();
          const stages = stagesData.data || [];
          setPipelineStages(stages);
          
          // Auto-seleccionar la primera etapa (Prospecto) si no hay una seleccionada
          if (stages.length > 0 && !formData.pipelineStageId) {
            setFormData(prev => ({
              ...prev,
              pipelineStageId: stages[0].id
            }));
          }
        }
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    loadInitialData();
  }, [token, user, apiUrl]);

  // Validación del lado del cliente
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Campos requeridos
    if (!formData.firstName.trim()) {
      errors.firstName = 'El nombre es requerido';
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'El apellido es requerido';
    }
    // Validación de etapa de pipeline (opcional pero recomendada)
    // if (!formData.pipelineStageId) {
    //   errors.pipelineStageId = 'Se recomienda asignar una etapa de pipeline';
    // }

    // Validación de email (si está presente)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
    }

    // Validación de DNI (opcional, pero si está presente debe ser numérico)
    if (formData.dni && !/^\d+$/.test(formData.dni)) {
      errors.dni = 'El DNI debe contener solo números';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Limpiar error de validación cuando el usuario empieza a escribir
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formulario
    if (!validateForm()) {
      setError('Por favor, corrija los errores en el formulario');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Preparar payload (omitir campos vacíos opcionales)
      // El contacto se asigna automáticamente al usuario que lo crea
      const payload: any = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      };
      
      // Solo asignar advisor si el ID es un UUID válido
      // El ID temporal ahora es un UUID válido, así que se puede usar
      const isValidUuid = (id: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      };
      
      if (user?.id && isValidUuid(user.id)) {
        payload.assignedAdvisorId = user.id;
      }

      // Agregar campos opcionales solo si tienen valor (trim para evitar espacios)
      if (formData.email && formData.email.trim()) payload.email = formData.email.trim();
      if (formData.phone && formData.phone.trim()) payload.phone = formData.phone.trim();
      if (formData.pipelineStageId) payload.pipelineStageId = formData.pipelineStageId;
      if (formData.source && formData.source.trim()) payload.source = formData.source.trim();
      if (formData.riskProfile) payload.riskProfile = formData.riskProfile;
      if (formData.notes && formData.notes.trim()) payload.notes = formData.notes.trim();
      
      // Guardar DNI en customFields si está presente
      if (formData.dni && formData.dni.trim()) {
        payload.customFields = { dni: formData.dni.trim() };
      }

      console.log('📤 Payload a enviar:', JSON.stringify(payload, null, 2));

      const response = await fetch(`${apiUrl}/contacts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Error del servidor:', data);
        
        // Manejar errores de validación del servidor
        if (data.details && Array.isArray(data.details)) {
          const serverErrors: Record<string, string> = {};
          data.details.forEach((err: any) => {
            if (err.path && err.path[0]) {
              serverErrors[err.path[0]] = err.message;
            }
          });
          setValidationErrors(serverErrors);
          
          // Mostrar los errores específicos en el mensaje
          const errorMessages = data.details.map((e: any) => 
            `${e.path?.join('.') || 'campo'}: ${e.message}`
          ).join(', ');
          
          throw new Error(`Error de validación: ${errorMessages}`);
        }
        throw new Error(data.error || 'Error al crear el contacto');
      }

      console.log('✅ Contacto creado:', data.data.id);

      // Éxito: redirigir a la lista de contactos
      router.push('/contacts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Error creating contact:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <main style={{ padding: 16 }}>
        <p>Debes iniciar sesión. <Link href="/login">Ir a login</Link></p>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>Nuevo Contacto</h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/contacts" style={{ color: '#3b82f6' }}>← Volver a Contactos</Link>
        </div>
      </div>

      {loadingData ? (
        <p>Cargando datos del formulario...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Error general */}
          {error && (
            <div style={{
              padding: 12,
              marginBottom: 24,
              backgroundColor: '#fee2e2',
              border: '1px solid #ef4444',
              borderRadius: 6,
              color: '#dc2626'
            }}>
              {error}
            </div>
          )}

          {/* Sección 1: Información Básica */}
          <fieldset style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24
          }}>
            <legend style={{ fontWeight: 600, fontSize: 18, padding: '0 8px' }}>
              Información Básica
            </legend>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Nombre <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: `1px solid ${validationErrors.firstName ? '#ef4444' : '#d1d5db'}`,
                    fontSize: 14
                  }}
                />
                {validationErrors.firstName && (
                  <span style={{ color: '#ef4444', fontSize: 12 }}>{validationErrors.firstName}</span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Apellido <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: `1px solid ${validationErrors.lastName ? '#ef4444' : '#d1d5db'}`,
                    fontSize: 14
                  }}
                />
                {validationErrors.lastName && (
                  <span style={{ color: '#ef4444', fontSize: 12 }}>{validationErrors.lastName}</span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: `1px solid ${validationErrors.email ? '#ef4444' : '#d1d5db'}`,
                    fontSize: 14
                  }}
                />
                {validationErrors.email && (
                  <span style={{ color: '#ef4444', fontSize: 12 }}>{validationErrors.email}</span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+54 11 1234-5678"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 14
                  }}
                />
              </div>
            </div>
          </fieldset>

          {/* Sección 2: Información Personal */}
          <fieldset style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24
          }}>
            <legend style={{ fontWeight: 600, fontSize: 18, padding: '0 8px' }}>
              Información Personal
            </legend>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  DNI
                </label>
                <input
                  type="text"
                  name="dni"
                  value={formData.dni}
                  onChange={handleChange}
                  placeholder="12345678"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: `1px solid ${validationErrors.dni ? '#ef4444' : '#d1d5db'}`,
                    fontSize: 14
                  }}
                />
                {validationErrors.dni && (
                  <span style={{ color: '#ef4444', fontSize: 12 }}>{validationErrors.dni}</span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Perfil de Riesgo
                </label>
                <select
                  name="riskProfile"
                  value={formData.riskProfile}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 14
                  }}
                >
                  <option value="">-- Seleccionar --</option>
                  <option value="low">Bajo</option>
                  <option value="mid">Medio</option>
                  <option value="high">Alto</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Sección 3: CRM */}
          <fieldset style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24
          }}>
            <legend style={{ fontWeight: 600, fontSize: 18, padding: '0 8px' }}>
              Configuración CRM
            </legend>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Etapa del Pipeline
                </label>
                <select
                  name="pipelineStageId"
                  value={formData.pipelineStageId}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 14
                  }}
                >
                  <option value="">-- Ninguna --</option>
                  {pipelineStages.map(stage => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                  Origen/Fuente
                </label>
                <input
                  type="text"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  placeholder="ej: Web, Referido, LinkedIn"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 14
                  }}
                />
              </div>

              <div>
                {/* Espacio vacío para mantener grid */}
              </div>
            </div>
          </fieldset>

          {/* Sección 4: Notas */}
          <fieldset style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24
          }}>
            <legend style={{ fontWeight: 600, fontSize: 18, padding: '0 8px' }}>
              Notas
            </legend>

            <div>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Observaciones
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                placeholder="Información adicional, comentarios, contexto..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>
          </fieldset>

          {/* Botones de acción */}
          <div style={{
            display: 'flex',
            gap: 16,
            justifyContent: 'flex-end',
            paddingTop: 16,
            borderTop: '1px solid #e5e7eb'
          }}>
            <Link
              href="/contacts"
              style={{
                padding: '10px 24px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#374151',
                textDecoration: 'none',
                fontWeight: 500,
                fontSize: 14
              }}
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 24px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                fontSize: 14
              }}
            >
              {loading ? 'Creando...' : 'Crear Contacto'}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}

