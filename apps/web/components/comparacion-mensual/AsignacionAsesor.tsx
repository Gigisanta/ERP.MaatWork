'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, User, AlertTriangle } from 'lucide-react';

interface Asignacion {
  idcuenta: string;
  asesorAnterior?: string;
  asesorNuevo: string;
  motivo?: string;
}

interface AsignacionAsesorProps {
  asignaciones: Asignacion[];
  onAsignacionEliminar: (index: number) => void;
}

export function AsignacionAsesor({ asignaciones, onAsignacionEliminar }: AsignacionAsesorProps) {
  if (asignaciones.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-2">
            <User className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No hay asignaciones pendientes</p>
            <p className="text-sm text-muted-foreground">
              Las asignaciones aparecerán aquí cuando las agregues desde las otras pestañas
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Asignaciones de Asesor ({asignaciones.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {asignaciones.map((asignacion, index) => (
              <div 
                key={`${asignacion.idcuenta}-${index}`}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <label className="text-sm font-medium">ID Cuenta</label>
                      <p className="font-mono text-sm">{asignacion.idcuenta}</p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div>
                        <label className="text-sm font-medium">Asesor Anterior</label>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm">{asignacion.asesorAnterior || '(Sin asesor)'}</p>
                          {asignacion.asesorAnterior ? (
                            <Badge variant="outline" className="text-xs">
                              Cambio
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Nueva
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-muted-foreground">→</div>
                      
                      <div>
                        <label className="text-sm font-medium">Asesor Nuevo</label>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-green-600">
                            {asignacion.asesorNuevo}
                          </p>
                          <Badge variant="default" className="text-xs">
                            Asignado
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {asignacion.motivo && (
                      <div className="flex-1">
                        <label className="text-sm font-medium">Motivo</label>
                        <p className="text-sm text-muted-foreground">{asignacion.motivo}</p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAsignacionEliminar(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Revisión:</strong> Verifica que todas las asignaciones sean correctas. 
          Puedes eliminar asignaciones haciendo clic en el ícono de basura. 
          Estas asignaciones se aplicarán al maestro cuando confirmes los cambios.
        </AlertDescription>
      </Alert>
    </div>
  );
}


