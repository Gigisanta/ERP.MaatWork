'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, AlertTriangle, Download, RotateCcw } from 'lucide-react';

interface DiffResumen {
  totalNuevos: number;
  totalModificados: number;
  totalAusentes: number;
  totalSinAsesor: number;
  totalConAsesor: number;
  totalRegistros: number;
  porcentajeSinAsesor: number;
}

interface CargaInfo {
  id: string;
  mes: string;
  nombreArchivo: string;
  estado: string;
  totalRegistros: number;
  createdAt: string;
}

interface DatosConfirmacion {
  cargaId: string;
  asignaciones: any[];
  ausentesInactivar: string[];
  resumen: DiffResumen;
}

export default function ConfirmarCambiosPage() {
  const params = useParams();
  const router = useRouter();
  const cargaId = params.cargaId as string;

  const [cargaInfo, setCargaInfo] = useState<CargaInfo | null>(null);
  const [datosConfirmacion, setDatosConfirmacion] = useState<DatosConfirmacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [aplicando, setAplicando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultadoAplicacion, setResultadoAplicacion] = useState<any>(null);

  useEffect(() => {
    if (cargaId) {
      cargarDatos();
    }
  }, [cargaId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar datos desde localStorage
      const datosGuardados = localStorage.getItem('datosConfirmacion');
      if (!datosGuardados) {
        throw new Error('No se encontraron datos de confirmación. Vuelve a la pantalla anterior.');
      }

      const datos = JSON.parse(datosGuardados) as DatosConfirmacion;
      
      if (datos.cargaId !== cargaId) {
        throw new Error('Los datos de confirmación no coinciden con esta carga.');
      }

      setDatosConfirmacion(datos);

      // Cargar información adicional de la carga
      const resCarga = await fetch(`/api/comparacion-mensual/resumen/${cargaId}`);
      if (!resCarga.ok) throw new Error('Error cargando información de carga');
      const dataCarga = await resCarga.json();
      setCargaInfo(dataCarga.carga);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleAplicarCambios = async () => {
    if (!datosConfirmacion) return;

    try {
      setAplicando(true);
      setError(null);

      const response = await fetch(`/api/comparacion-mensual/aplicar-cambios/${cargaId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asignaciones: datosConfirmacion.asignaciones,
          ausentesInactivar: datosConfirmacion.ausentesInactivar
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error aplicando cambios');
      }

      const resultado = await response.json();
      setResultadoAplicacion(resultado);

      // Limpiar datos de localStorage
      localStorage.removeItem('datosConfirmacion');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error aplicando cambios');
    } finally {
      setAplicando(false);
    }
  };

  const handleVolver = () => {
    router.push(`/comparacion-mensual/revisar/${cargaId}`);
  };

  const handleExportar = async () => {
    try {
      // Exportar maestro actualizado
      const response = await fetch(`/api/comparacion-mensual/export/maestro?formato=xlsx`);
      if (!response.ok) throw new Error('Error exportando maestro');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `maestro_actualizado_${datosConfirmacion?.resumen.totalRegistros || 'unknown'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error exportando archivo');
    }
  };

  const handleExportarDiff = async () => {
    try {
      const response = await fetch(`/api/comparacion-mensual/export/diff/${cargaId}`);
      if (!response.ok) throw new Error('Error exportando diff');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diff_${cargaId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error exportando diff');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando confirmación...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.push('/comparacion-mensual')}>
            Volver al Inicio
          </Button>
        </div>
      </div>
    );
  }

  if (!cargaInfo || !datosConfirmacion) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>No se encontraron datos para esta confirmación.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Si ya se aplicaron los cambios, mostrar resultado
  if (resultadoAplicacion) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-green-600">¡Cambios Aplicados Exitosamente!</h1>
          <p className="text-muted-foreground mt-2">
            Los cambios han sido aplicados al maestro correctamente.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumen de Aplicación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {resultadoAplicacion.nuevosInsertados}
                </div>
                <p className="text-sm text-muted-foreground">Nuevos Insertados</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {resultadoAplicacion.modificadosActualizados}
                </div>
                <p className="text-sm text-muted-foreground">Modificados Actualizados</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {resultadoAplicacion.ausentesInactivados}
                </div>
                <p className="text-sm text-muted-foreground">Ausentes Inactivados</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {resultadoAplicacion.asignacionesAplicadas}
                </div>
                <p className="text-sm text-muted-foreground">Asignaciones Aplicadas</p>
              </div>
            </div>

            {resultadoAplicacion.warnings && resultadoAplicacion.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Advertencias:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {resultadoAplicacion.warnings.map((warning: string, index: number) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center space-x-4">
          <Button onClick={handleExportar} className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Exportar Maestro Actualizado</span>
          </Button>
          
          <Button variant="outline" onClick={() => router.push('/comparacion-mensual')}>
            Volver al Inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">Confirmar Aplicación de Cambios</h1>
        <p className="text-muted-foreground mt-2">
          Revisa los cambios antes de aplicarlos al maestro
        </p>
      </div>

      {/* Información de la carga */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Carga</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Archivo</label>
              <p className="text-sm">{cargaInfo.nombreArchivo}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Mes</label>
              <p className="text-sm">{cargaInfo.mes}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Estado</label>
              <Badge variant={cargaInfo.estado === 'revisando' ? 'default' : 'secondary'}>
                {cargaInfo.estado}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de cambios */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Cambios a Aplicar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {datosConfirmacion.resumen.totalNuevos}
              </div>
              <p className="text-sm text-muted-foreground">Nuevos Registros</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {datosConfirmacion.resumen.totalModificados}
              </div>
              <p className="text-sm text-muted-foreground">Registros Modificados</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {datosConfirmacion.ausentesInactivar.length}
              </div>
              <p className="text-sm text-muted-foreground">Ausentes a Inactivar</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {datosConfirmacion.asignaciones.length}
              </div>
              <p className="text-sm text-muted-foreground">Asignaciones de Asesor</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalles de asignaciones */}
      {datosConfirmacion.asignaciones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Asignaciones de Asesor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {datosConfirmacion.asignaciones.map((asignacion, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-4">
                    <span className="font-mono text-sm">{asignacion.idcuenta}</span>
                    <span className="text-sm">
                      {asignacion.asesorAnterior || '(Sin asesor)'} → {asignacion.asesorNuevo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalles de ausentes */}
      {datosConfirmacion.ausentesInactivar.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Registros a Inactivar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {datosConfirmacion.ausentesInactivar.map((idcuenta, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-orange-50 rounded">
                  <span className="font-mono text-sm">{idcuenta}</span>
                  <Badge variant="outline" className="text-xs">Se inactivará</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advertencias */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Importante:</strong> Una vez aplicados, estos cambios modificarán permanentemente 
          el maestro de cuentas. Se crearán snapshots antes y después para auditoría. 
          Esta operación no se puede deshacer fácilmente.
        </AlertDescription>
      </Alert>

      {/* Botones de acción */}
      <div className="flex justify-between">
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleVolver}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Volver a Revisar
          </Button>
          
          <Button variant="outline" onClick={handleExportarDiff}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Diff
          </Button>
        </div>

        <Button 
          onClick={handleAplicarCambios}
          disabled={aplicando}
          className="bg-green-600 hover:bg-green-700"
        >
          {aplicando ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Aplicando Cambios...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Aplicar Cambios
            </>
          )}
        </Button>
      </div>
    </div>
  );
}



