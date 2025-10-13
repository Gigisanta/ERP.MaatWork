'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, FileText, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface CargaReciente {
  id: string;
  mes: string;
  nombreArchivo: string;
  estado: string;
  totalRegistros: number;
  nuevosDetectados: number;
  modificadosDetectados: number;
  ausentesDetectados: number;
  sinAsesor: number;
  createdAt: string;
}

export default function ComparacionMensualPage() {
  const router = useRouter();
  const [cargasRecientes, setCargasRecientes] = useState<CargaReciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargarCargasRecientes();
  }, []);

  const cargarCargasRecientes = async () => {
    try {
      const response = await fetch('/api/comparacion-mensual/cargas-recientes?limit=10');
      if (!response.ok) throw new Error('Error cargando cargas recientes');
      
      const data = await response.json();
      setCargasRecientes(data.cargas || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'cargado': return 'bg-blue-100 text-blue-800';
      case 'revisando': return 'bg-yellow-100 text-yellow-800';
      case 'aplicado': return 'bg-green-100 text-green-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'cargado': return <FileText className="h-4 w-4" />;
      case 'revisando': return <Clock className="h-4 w-4" />;
      case 'aplicado': return <CheckCircle className="h-4 w-4" />;
      case 'cancelado': return <AlertTriangle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando comparación mensual...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Comparación Mensual</h1>
          <p className="text-muted-foreground">
            Sistema de gestión del maestro "Balanz Cactus 2025" vs reportes mensuales
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Link href="/comparacion-mensual/cargar">
            <Button className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Cargar Archivo Mensual</span>
            </Button>
          </Link>
          
          <Link href="/comparacion-mensual/historial">
            <Button variant="outline">
              Ver Historial
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Instrucciones */}
      <Card>
        <CardHeader>
          <CardTitle>¿Cómo funciona el sistema?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-medium">Cargar Archivo</h3>
              <p className="text-sm text-muted-foreground">
                Sube el Excel mensual "reporteClusterCuentasV2"
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-yellow-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <span className="text-yellow-600 font-bold">2</span>
              </div>
              <h3 className="font-medium">Comparar</h3>
              <p className="text-sm text-muted-foreground">
                El sistema detecta nuevos, modificados y ausentes
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <span className="text-green-600 font-bold">3</span>
              </div>
              <h3 className="font-medium">Revisar</h3>
              <p className="text-sm text-muted-foreground">
                Asigna asesores y confirma cambios
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <span className="text-purple-600 font-bold">4</span>
              </div>
              <h3 className="font-medium">Aplicar</h3>
              <p className="text-sm text-muted-foreground">
                Actualiza el maestro con snapshots de auditoría
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cargas Recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Cargas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {cargasRecientes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay cargas recientes</p>
              <p className="text-sm text-muted-foreground">
                Sube tu primer archivo mensual para comenzar
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {cargasRecientes.map((carga) => (
                <div key={carga.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="font-medium">{carga.nombreArchivo}</h3>
                        <p className="text-sm text-muted-foreground">
                          Mes: {carga.mes} • {new Date(carga.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <Badge className={getEstadoColor(carga.estado)}>
                        <div className="flex items-center space-x-1">
                          {getEstadoIcon(carga.estado)}
                          <span className="capitalize">{carga.estado}</span>
                        </div>
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{carga.totalRegistros} registros</div>
                        <div className="text-xs text-muted-foreground">
                          {carga.nuevosDetectados}N • {carga.modificadosDetectados}M • {carga.ausentesDetectados}A
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        {carga.estado === 'revisando' && (
                          <Link href={`/comparacion-mensual/revisar/${carga.id}`}>
                            <Button size="sm">Revisar</Button>
                          </Link>
                        )}
                        
                        {carga.estado === 'aplicado' && (
                          <Link href={`/comparacion-mensual/export/diff/${carga.id}`}>
                            <Button size="sm" variant="outline">
                              Exportar
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {carga.sinAsesor > 0 && (
                    <div className="mt-2">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          {carga.sinAsesor} registros sin asesor asignado
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Estadísticas del Maestro */}
      <Card>
        <CardHeader>
          <CardTitle>Estado del Maestro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {/* Aquí se cargarían las estadísticas del maestro */}
                -
              </div>
              <p className="text-sm text-muted-foreground">Total Cuentas</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {/* Aquí se cargarían las estadísticas del maestro */}
                -
              </div>
              <p className="text-sm text-muted-foreground">Activas</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {/* Aquí se cargarían las estadísticas del maestro */}
                -
              </div>
              <p className="text-sm text-muted-foreground">Con Asesor</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}