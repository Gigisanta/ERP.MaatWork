'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, Edit, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';

interface ModificadoRegistro {
  id: string;
  idcuenta: string;
  comitenteAnterior: number;
  cuotapartistaAnterior: number;
  descripcionAnterior: string;
  asesorAnterior?: string;
  comitenteNuevo: number;
  cuotapartistaNuevo: number;
  descripcionNueva: string;
  asesorNuevo?: string;
  camposCambiados: string[];
  necesitaAsesor: boolean;
  requiereConfirmacionAsesor?: boolean;
}

interface GrillaModificadosProps {
  cargaId: string;
  filtros: {
    busqueda: string;
    sinAsesor: boolean;
    requiereConfirmacion: boolean;
  };
  onAsignacionGuardar: (asignacion: any) => void;
}

export function GrillaModificados({ cargaId, filtros, onAsignacionGuardar }: GrillaModificadosProps) {
  const [registros, setRegistros] = useState<ModificadoRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asignacionesPendientes, setAsignacionesPendientes] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    cargarRegistros();
  }, [cargaId]);

  const cargarRegistros = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/comparacion-mensual/diff-detalle/${cargaId}?tipo=modificado&limit=1000`);
      if (!response.ok) throw new Error('Error cargando registros modificados');
      
      const data = await response.json();
      setRegistros(data.detalles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleAsesorChange = (idcuenta: string, asesor: string) => {
    setAsignacionesPendientes(prev => ({
      ...prev,
      [idcuenta]: asesor
    }));
  };

  const handleGuardarAsignacion = (registro: ModificadoRegistro) => {
    const asesor = asignacionesPendientes[registro.idcuenta];
    if (!asesor) return;

    const asignacion = {
      idcuenta: registro.idcuenta,
      asesorAnterior: registro.asesorAnterior,
      asesorNuevo: asesor,
      motivo: 'Asignación manual desde UI'
    };

    onAsignacionGuardar(asignacion);

    // Limpiar asignación pendiente
    setAsignacionesPendientes(prev => {
      const nuevo = { ...prev };
      delete nuevo[registro.idcuenta];
      return nuevo;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const registrosFiltrados = registros.filter(registro => {
    // Filtro de búsqueda
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      if (!registro.idcuenta.toLowerCase().includes(busqueda) &&
          !registro.descripcionNueva.toLowerCase().includes(busqueda)) {
        return false;
      }
    }

    // Filtro sin asesor
    if (filtros.sinAsesor && registro.asesorAnterior) {
      return false;
    }

    // Filtro requiere confirmación
    if (filtros.requiereConfirmacion && !registro.requiereConfirmacionAsesor) {
      return false;
    }

    return true;
  });

  const renderCampoCambiado = (campo: string, anterior: any, nuevo: any) => {
    const esCambio = anterior !== nuevo;
    
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium w-24">{campo}:</span>
        <div className="flex items-center space-x-2 flex-1">
          <span className={`text-sm px-2 py-1 rounded ${esCambio ? 'bg-red-100 text-red-800' : 'bg-gray-100'}`}>
            {anterior || '(vacío)'}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className={`text-sm px-2 py-1 rounded ${esCambio ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
            {nuevo || '(vacío)'}
          </span>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando registros modificados...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (registrosFiltrados.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No hay registros modificados para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Edit className="h-5 w-5" />
            <span>Registros Modificados ({registrosFiltrados.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {registrosFiltrados.map((registro) => (
              <div 
                key={registro.id} 
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <label className="text-sm font-medium">ID Cuenta</label>
                      <p className="font-mono text-sm">{registro.idcuenta}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {registro.camposCambiados.map(campo => (
                        <Badge key={campo} variant="outline" className="text-xs">
                          {campo}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center space-x-2">
                      {registro.requiereConfirmacionAsesor && (
                        <Badge variant="destructive" className="text-xs">
                          Confirma Asesor
                        </Badge>
                      )}
                      {registro.necesitaAsesor && (
                        <Badge variant="secondary" className="text-xs">
                          Sin Asesor
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(registro.id)}
                    >
                      {expanded[registro.id] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      Ver Detalles
                    </Button>
                  </div>
                </div>

                <Collapsible open={expanded[registro.id]}>
                  <CollapsibleContent className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 p-4 bg-gray-50 rounded">
                      {renderCampoCambiado('Comitente', registro.comitenteAnterior, registro.comitenteNuevo)}
                      {renderCampoCambiado('Cuotapartista', registro.cuotapartistaAnterior, registro.cuotapartistaNuevo)}
                      {renderCampoCambiado('Descripción', registro.descripcionAnterior, registro.descripcionNueva)}
                      {renderCampoCambiado('Asesor', registro.asesorAnterior, registro.asesorNuevo)}
                    </div>

                    <div className="flex items-end space-x-2">
                      <div className="flex-1">
                        <label className="text-sm font-medium">Asesor Final</label>
                        <div className="flex items-center space-x-2">
                          <Input
                            placeholder="Asignar asesor..."
                            value={asignacionesPendientes[registro.idcuenta] || registro.asesorAnterior || ''}
                            onChange={(e) => handleAsesorChange(registro.idcuenta, e.target.value)}
                            className="text-sm"
                          />
                          {asignacionesPendientes[registro.idcuenta] && (
                            <Button
                              size="sm"
                              onClick={() => handleGuardarAsignacion(registro)}
                            >
                              Guardar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {registrosFiltrados.some(r => r.requiereConfirmacionAsesor) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Algunos registros tienen cambios de asesor que requieren confirmación manual.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}



