'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, UserMinus, AlertTriangle } from 'lucide-react';

interface AusenteRegistro {
  id: string;
  idcuenta: string;
  comitenteAnterior: number;
  cuotapartistaAnterior: number;
  descripcionAnterior: string;
  asesorAnterior?: string;
}

interface GrillaAusentesProps {
  cargaId: string;
  filtros: {
    busqueda: string;
    sinAsesor: boolean;
    requiereConfirmacion: boolean;
  };
  ausentesInactivar: string[];
  onAusenteToggle: (idcuenta: string, checked: boolean) => void;
}

export function GrillaAusentes({ 
  cargaId, 
  filtros, 
  ausentesInactivar, 
  onAusenteToggle 
}: GrillaAusentesProps) {
  const [registros, setRegistros] = useState<AusenteRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarRegistros();
  }, [cargaId]);

  const cargarRegistros = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/comparacion-mensual/ausentes/${cargaId}?limit=1000`);
      if (!response.ok) throw new Error('Error cargando registros ausentes');
      
      const data = await response.json();
      setRegistros(data.registros || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    registrosFiltrados.forEach(registro => {
      onAusenteToggle(registro.idcuenta, checked);
    });
  };

  const registrosFiltrados = registros.filter(registro => {
    // Filtro de búsqueda
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      if (!registro.idcuenta.toLowerCase().includes(busqueda) &&
          !registro.descripcionAnterior.toLowerCase().includes(busqueda)) {
        return false;
      }
    }

    // Filtro sin asesor
    if (filtros.sinAsesor && registro.asesorAnterior) {
      return false;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando registros ausentes...</span>
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
          <p className="text-muted-foreground">No hay registros ausentes para mostrar.</p>
        </CardContent>
      </Card>
    );
  }

  const todosSeleccionados = registrosFiltrados.every(r => ausentesInactivar.includes(r.idcuenta));
  const algunosSeleccionados = registrosFiltrados.some(r => ausentesInactivar.includes(r.idcuenta));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <UserMinus className="h-5 w-5" />
              <span>Registros Ausentes ({registrosFiltrados.length})</span>
            </div>
            
            {registrosFiltrados.length > 0 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={todosSeleccionados}
                  ref={(el) => {
                    if (el) el.indeterminate = algunosSeleccionados && !todosSeleccionados;
                  }}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="select-all" className="text-sm">
                  {todosSeleccionados ? 'Deseleccionar todo' : 'Seleccionar todo'}
                </label>
              </div>
            )}
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
                    <Checkbox
                      id={`ausente-${registro.idcuenta}`}
                      checked={ausentesInactivar.includes(registro.idcuenta)}
                      onCheckedChange={(checked) => onAusenteToggle(registro.idcuenta, !!checked)}
                    />
                    
                    <div>
                      <label className="text-sm font-medium">ID Cuenta</label>
                      <p className="font-mono text-sm">{registro.idcuenta}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Comitente</label>
                      <p className="text-sm">{registro.comitenteAnterior}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Cuotapartista</label>
                      <p className="text-sm">{registro.cuotapartistaAnterior}</p>
                    </div>
                    
                    <div className="flex-1">
                      <label className="text-sm font-medium">Descripción</label>
                      <p className="text-sm truncate" title={registro.descripcionAnterior}>
                        {registro.descripcionAnterior}
                      </p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Asesor</label>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm">{registro.asesorAnterior || '(Sin asesor)'}</p>
                        {registro.asesorAnterior ? (
                          <Badge variant="secondary" className="text-xs">
                            Con Asesor
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-xs">
                            Sin Asesor
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="ml-6">
                  <p className="text-xs text-muted-foreground">
                    Este registro está en el maestro pero no aparece en el archivo mensual.
                    {ausentesInactivar.includes(registro.idcuenta) && (
                      <span className="text-orange-600 font-medium">
                        {' '}Marcado para inactivación.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {ausentesInactivar.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {ausentesInactivar.length} registro(s) marcado(s) para inactivación. 
            Estos registros se marcarán como inactivos en el maestro al aplicar los cambios.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Atención:</strong> Los registros ausentes no se eliminan automáticamente. 
          Solo se marcan como inactivos si seleccionas inactivarlos. 
          Esto permite mantener el historial y reactivarlos en el futuro si es necesario.
        </AlertDescription>
      </Alert>
    </div>
  );
}


