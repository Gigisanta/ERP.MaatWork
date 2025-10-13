'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Search, Filter, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { GrillaNuevos } from '@/components/comparacion-mensual/GrillaNuevos';
import { GrillaModificados } from '@/components/comparacion-mensual/GrillaModificados';
import { GrillaAusentes } from '@/components/comparacion-mensual/GrillaAusentes';
import { AsignacionAsesor } from '@/components/comparacion-mensual/AsignacionAsesor';

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

export default function RevisarCambiosPage() {
  const params = useParams();
  const router = useRouter();
  const cargaId = params.cargaId as string;

  const [cargaInfo, setCargaInfo] = useState<CargaInfo | null>(null);
  const [resumen, setResumen] = useState<DiffResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [ausentesInactivar, setAusentesInactivar] = useState<string[]>([]);
  const [filtros, setFiltros] = useState({
    busqueda: '',
    sinAsesor: false,
    requiereConfirmacion: false
  });

  useEffect(() => {
    if (cargaId) {
      cargarDatos();
    }
  }, [cargaId]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Cargar información de la carga
      const resCarga = await fetch(`/api/comparacion-mensual/resumen/${cargaId}`);
      if (!resCarga.ok) throw new Error('Error cargando información de carga');
      const dataCarga = await resCarga.json();
      setCargaInfo(dataCarga.carga);

      // Cargar resumen de diff
      const resResumen = await fetch(`/api/comparacion-mensual/diff-resumen/${cargaId}`);
      if (!resResumen.ok) throw new Error('Error cargando resumen de diff');
      const dataResumen = await resResumen.json();
      setResumen(dataResumen.resumen);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleAsignacionGuardar = (nuevaAsignacion: any) => {
    setAsignaciones(prev => [...prev, nuevaAsignacion]);
  };

  const handleAusenteToggle = (idcuenta: string, checked: boolean) => {
    if (checked) {
      setAusentesInactivar(prev => [...prev, idcuenta]);
    } else {
      setAusentesInactivar(prev => prev.filter(id => id !== idcuenta));
    }
  };

  const handleContinuar = () => {
    // Guardar asignaciones y ausentes en localStorage para la siguiente pantalla
    const datosConfirmacion = {
      cargaId,
      asignaciones,
      ausentesInactivar,
      resumen
    };
    localStorage.setItem('datosConfirmacion', JSON.stringify(datosConfirmacion));
    
    // Navegar a pantalla de confirmación
    router.push(`/comparacion-mensual/confirmar/${cargaId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Cargando cambios...</span>
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
      </div>
    );
  }

  if (!cargaInfo || !resumen) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertDescription>No se encontraron datos para esta carga.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revisar Cambios</h1>
          <p className="text-muted-foreground">
            Archivo: {cargaInfo.nombreArchivo} • Mes: {cargaInfo.mes}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={cargaInfo.estado === 'revisando' ? 'default' : 'secondary'}>
            {cargaInfo.estado}
          </Badge>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Nuevos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resumen.totalNuevos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Modificados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{resumen.totalModificados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ausentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{resumen.totalAusentes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sin Asesor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{resumen.totalSinAsesor}</div>
            <p className="text-xs text-muted-foreground">
              {resumen.porcentajeSinAsesor.toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {resumen.totalSinAsesor > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Hay {resumen.totalSinAsesor} registros sin asesor asignado. 
            Debes completar las asignaciones antes de continuar.
          </AlertDescription>
        </Alert>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por idcuenta o descripción..."
                value={filtros.busqueda}
                onChange={(e) => setFiltros(prev => ({ ...prev, busqueda: e.target.value }))}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sin-asesor"
                checked={filtros.sinAsesor}
                onCheckedChange={(checked) => setFiltros(prev => ({ ...prev, sinAsesor: !!checked }))}
              />
              <label htmlFor="sin-asesor" className="text-sm">Solo sin asesor</label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="requiere-confirmacion"
                checked={filtros.requiereConfirmacion}
                onCheckedChange={(checked) => setFiltros(prev => ({ ...prev, requiereConfirmacion: !!checked }))}
              />
              <label htmlFor="requiere-confirmacion" className="text-sm">Requiere confirmación</label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de revisión */}
      <Tabs defaultValue="nuevos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="nuevos">
            Nuevos ({resumen.totalNuevos})
          </TabsTrigger>
          <TabsTrigger value="modificados">
            Modificados ({resumen.totalModificados})
          </TabsTrigger>
          <TabsTrigger value="ausentes">
            Ausentes ({resumen.totalAusentes})
          </TabsTrigger>
          <TabsTrigger value="asignaciones">
            Asignaciones ({asignaciones.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nuevos">
          <GrillaNuevos 
            cargaId={cargaId}
            filtros={filtros}
            onAsignacionGuardar={handleAsignacionGuardar}
          />
        </TabsContent>

        <TabsContent value="modificados">
          <GrillaModificados 
            cargaId={cargaId}
            filtros={filtros}
            onAsignacionGuardar={handleAsignacionGuardar}
          />
        </TabsContent>

        <TabsContent value="ausentes">
          <GrillaAusentes 
            cargaId={cargaId}
            filtros={filtros}
            ausentesInactivar={ausentesInactivar}
            onAusenteToggle={handleAusenteToggle}
          />
        </TabsContent>

        <TabsContent value="asignaciones">
          <AsignacionAsesor 
            asignaciones={asignaciones}
            onAsignacionEliminar={(index) => {
              setAsignaciones(prev => prev.filter((_, i) => i !== index));
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Botones de acción */}
      <div className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
        >
          Volver
        </Button>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => router.push(`/comparacion-mensual/export/diff/${cargaId}`)}
          >
            Exportar Diff
          </Button>
          
          <Button 
            onClick={handleContinuar}
            disabled={resumen.totalSinAsesor > 0 && asignaciones.length === 0}
          >
            Continuar a Confirmación
          </Button>
        </div>
      </div>
    </div>
  );
}



