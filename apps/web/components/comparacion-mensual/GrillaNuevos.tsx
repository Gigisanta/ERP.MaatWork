'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserPlus, AlertTriangle } from 'lucide-react';

interface NuevoRegistro {
  id: string;
  idcuenta: string;
  comitente: number;
  cuotapartista: number;
  descripcion: string;
  asesor?: string;
  necesitaAsesor: boolean;
}

interface GrillaNuevosProps {
  cargaId: string;
  filtros: {
    busqueda: string;
    sinAsesor: boolean;
    requiereConfirmacion: boolean;
  };
  onAsignacionGuardar: (asignacion: any) => void;
}

export function GrillaNuevos({ cargaId, filtros, onAsignacionGuardar }: GrillaNuevosProps) {
  const [registros, setRegistros] = useState<NuevoRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asignacionesPendientes, setAsignacionesPendientes] = useState<Record<string, string>>({});

  useEffect(() => {
    cargarRegistros();
  }, [cargaId]);

  const cargarRegistros = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/comparacion-mensual/diff-detalle/${cargaId}?tipo=nuevo&limit=1000`);
      if (!response.ok) throw new Error('Error cargando registros nuevos');
      
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

  const handleGuardarAsignacion = (registro: NuevoRegistro) => {
    const asesor = asignacionesPendientes[registro.idcuenta];
    if (!asesor) return;

    const asignacion = {
      idcuenta: registro.idcuenta,
      asesorAnterior: registro.asesor,
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

  const registrosFiltrados = registros.filter(registro => {
    // Filtro de búsqueda
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      if (!registro.idcuenta.toLowerCase().includes(busqueda) &&
          !registro.descripcion.toLowerCase().includes(busqueda)) {
        return false;
      }
    }

    // Filtro sin asesor
    if (filtros.sinAsesor && registro.asesor) {
      return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando registros nuevos...</span>
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
          <p className="text-muted-foreground">No hay registros nuevos para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span>Registros Nuevos ({registrosFiltrados.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {registrosFiltrados.map((registro) => (
              <div 
                key={registro.id} 
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                  <div>
                    <label className="text-sm font-medium">ID Cuenta</label>
                    <p className="font-mono text-sm">{registro.idcuenta}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Comitente</label>
                    <p className="text-sm">{registro.comitente}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Cuotapartista</label>
                    <p className="text-sm">{registro.cuotapartista}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Descripción</label>
                    <p className="text-sm truncate" title={registro.descripcion}>
                      {registro.descripcion}
                    </p>
                  </div>
                  
                  <div className="flex items-end space-x-2">
                    <div className="flex-1">
                      <label className="text-sm font-medium">Asesor</label>
                      <div className="flex items-center space-x-2">
                        <Input
                          placeholder="Asignar asesor..."
                          value={asignacionesPendientes[registro.idcuenta] || registro.asesor || ''}
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
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {registro.necesitaAsesor && (
                      <Badge variant="destructive" className="text-xs">
                        Sin Asesor
                      </Badge>
                    )}
                    {registro.asesor && (
                      <Badge variant="secondary" className="text-xs">
                        Con Asesor
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {registrosFiltrados.some(r => r.necesitaAsesor) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Algunos registros nuevos necesitan asignación de asesor antes de continuar.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}


