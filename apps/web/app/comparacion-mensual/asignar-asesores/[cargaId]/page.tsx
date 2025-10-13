'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface RegistroSinAsesor {
  id: string;
  idcuenta: string;
  comitente: number;
  cuotapartista: number;
  descripcion: string;
  asesor?: string;
}

interface AsignacionAsesor {
  idcuenta: string;
  asesorNuevo: string;
  motivo?: string;
}

export default function AsignarAsesoresPage() {
  const params = useParams();
  const cargaId = params.cargaId as string;
  
  const [registros, setRegistros] = useState<RegistroSinAsesor[]>([]);
  const [asignaciones, setAsignaciones] = useState<Map<string, AsignacionAsesor>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Cargar registros sin asesor
  useEffect(() => {
    cargarRegistrosSinAsesor();
  }, [cargaId]);

  const cargarRegistrosSinAsesor = async () => {
    try {
      const response = await fetch(`/api/comparacion-mensual/sin-asesor/${cargaId}`);
      const result = await response.json();
      
      if (result.success) {
        setRegistros(result.registros);
      } else {
        setError(result.error || 'Error al cargar registros');
      }
    } catch (err) {
      setError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  // Manejar cambio de asesor
  const handleAsesorChange = (idcuenta: string, asesor: string) => {
    setAsignaciones(prev => {
      const newMap = new Map(prev);
      if (asesor.trim()) {
        newMap.set(idcuenta, {
          idcuenta,
          asesorNuevo: asesor.trim(),
          motivo: newMap.get(idcuenta)?.motivo || ''
        });
      } else {
        newMap.delete(idcuenta);
      }
      return newMap;
    });
  };

  // Manejar cambio de motivo
  const handleMotivoChange = (idcuenta: string, motivo: string) => {
    setAsignaciones(prev => {
      const newMap = new Map(prev);
      const asignacion = newMap.get(idcuenta);
      if (asignacion) {
        newMap.set(idcuenta, {
          ...asignacion,
          motivo: motivo.trim()
        });
      }
      return newMap;
    });
  };

  // Guardar asignaciones
  const guardarAsignaciones = async () => {
    if (asignaciones.size === 0) {
      alert('No hay asignaciones para guardar');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/comparacion-mensual/asignaciones/${cargaId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asignaciones: Array.from(asignaciones.values())
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`Se guardaron ${result.guardadas} asignaciones exitosamente`);
        // Recargar registros para reflejar cambios
        await cargarRegistrosSinAsesor();
        setAsignaciones(new Map());
      } else {
        setError(result.error || 'Error al guardar asignaciones');
      }
    } catch (err) {
      setError('Error de conexión al servidor');
    } finally {
      setSaving(false);
    }
  };

  // Lista de asesores sugeridos (en un sistema real vendría de la API)
  const asesoresSugeridos = [
    'Juan Pérez',
    'María González',
    'Carlos López',
    'Ana Martínez',
    'Pedro Rodríguez',
    'Laura Sánchez',
    'Miguel Torres',
    'Carmen Ruiz'
  ];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="text-2xl mb-4">⏳</div>
          <p>Cargando registros...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex">
            <div className="text-red-600 text-xl mr-3">⚠️</div>
            <div>
              <h3 className="text-red-800 font-medium">Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Asignar Asesores - Carga {cargaId.slice(0, 8)}...
        </h1>
        <p className="text-gray-600">
          Complete la asignación de asesores para los registros que no tienen uno asignado.
        </p>
      </div>

      {/* Resumen */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-blue-900">Resumen</h3>
            <p className="text-blue-700">
              {registros.length} registros sin asesor • {asignaciones.size} asignaciones pendientes
            </p>
          </div>
          {asignaciones.size > 0 && (
            <button
              onClick={guardarAsignaciones}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : `Guardar ${asignaciones.size} asignaciones`}
            </button>
          )}
        </div>
      </div>

      {/* Lista de registros */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Registros Sin Asesor</h2>
        </div>
        
        {registros.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">✅</div>
            <p>Todos los registros tienen asesor asignado</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {registros.map((registro) => {
              const asignacion = asignaciones.get(registro.idcuenta);
              return (
                <div key={registro.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    {/* Información del registro */}
                    <div className="md:col-span-2">
                      <div className="font-medium text-gray-900">{registro.descripcion}</div>
                      <div className="text-sm text-gray-500">
                        ID: {registro.idcuenta} • Comitente: {registro.comitente} • Cuota: {registro.cuotapartista}
                      </div>
                    </div>

                    {/* Campo de asesor */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Asesor
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          list={`asesores-${registro.id}`}
                          value={asignacion?.asesorNuevo || ''}
                          onChange={(e) => handleAsesorChange(registro.idcuenta, e.target.value)}
                          placeholder="Seleccionar o escribir asesor..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <datalist id={`asesores-${registro.id}`}>
                          {asesoresSugeridos.map((asesor) => (
                            <option key={asesor} value={asesor} />
                          ))}
                        </datalist>
                      </div>
                    </div>

                    {/* Campo de motivo */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Motivo (opcional)
                      </label>
                      <input
                        type="text"
                        value={asignacion?.motivo || ''}
                        onChange={(e) => handleMotivoChange(registro.idcuenta, e.target.value)}
                        placeholder="Razón del cambio..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Indicador de asignación pendiente */}
                  {asignacion && (
                    <div className="mt-2 flex items-center text-sm text-blue-600">
                      <span className="mr-2">📝</span>
                      Asignación pendiente: {asignacion.asesorNuevo}
                      {asignacion.motivo && ` - ${asignacion.motivo}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Instrucciones */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Instrucciones</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>• <strong>Asesor:</strong> Seleccione de la lista o escriba un nombre nuevo</p>
          <p>• <strong>Motivo:</strong> Explique brevemente por qué se asigna este asesor</p>
          <p>• <strong>Guardar:</strong> Las asignaciones se guardan en lote para mejor rendimiento</p>
          <p>• <strong>Validación:</strong> Todos los campos son requeridos antes de guardar</p>
        </div>
      </div>
    </div>
  );
}


