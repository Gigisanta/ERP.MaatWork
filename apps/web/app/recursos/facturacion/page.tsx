'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Heading,
  Text,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  Badge,
  Breadcrumbs,
  Grid,
  Stack,
  Icon,
  type BreadcrumbItem,
} from '@cactus/ui';

/**
 * Página de Datos de Facturación - Guía paso a paso para facturar en AFIP
 */

interface DatoFacturacion {
  nombre: string;
  cuit: string;
}

const responsablesInscriptos: DatoFacturacion[] = [
  { nombre: 'Dillenberger Nicolas', cuit: '20332033256' },
  { nombre: 'Moure Federico', cuit: '20342251677' },
  { nombre: 'Vicente Mateo', cuit: '20344932221' },
];

interface DestinoFacturacion {
  nombre: string;
  destinatario: string;
  nota: string | null;
  color: 'blue' | 'emerald';
}

const destinosFacturacion: DestinoFacturacion[] = [
  {
    nombre: 'Balanz',
    destinatario: 'Nico (Dillenberger)',
    nota: 'Tildar "Moneda Extranjera" si son liquidaciones',
    color: 'blue',
  },
  {
    nombre: 'Zurich',
    destinatario: 'Parte a Fede, parte a Abax',
    nota: null,
    color: 'emerald',
  },
];

interface PasoFacturacion {
  numero: number;
  titulo: string;
  descripcion: string;
  subpasos?: string[];
  alerta?: string;
  destacado?: boolean;
}

const pasosFacturacion: PasoFacturacion[] = [
  {
    numero: 1,
    titulo: 'Acceder a AFIP',
    descripcion: 'Ingresar al Portal de Clave Fiscal con CUIT y contraseña',
    subpasos: ['Ir a auth.afip.gob.ar', 'Ingresar CUIT y Clave Fiscal'],
  },
  {
    numero: 2,
    titulo: 'Ir a Monotributo',
    descripcion: 'En "Servicios | Más utilizados", seleccionar Monotributo',
    subpasos: [],
  },
  {
    numero: 3,
    titulo: 'Emitir Factura',
    descripcion: 'Clic en el botón verde "EMITIR FACTURA" en Factura Electrónica',
    subpasos: [],
  },
  {
    numero: 4,
    titulo: 'Generar Comprobantes',
    descripcion: 'Seleccionar "Generar Comprobantes" → Factura C',
    subpasos: [],
  },
  {
    numero: 5,
    titulo: 'Datos de Emisión',
    descripcion: 'Completar información inicial del comprobante',
    subpasos: [
      'Fecha del Comprobante: fecha actual',
      'Conceptos: "Productos y Servicios"',
      'Período Facturado: fechas Desde/Hasta',
      'Actividad: 661999 - SERVICIOS AUXILIARES...',
    ],
    alerta: 'Si es liquidación de Balanz → tildar "Moneda Extranjera"',
    destacado: true,
  },
  {
    numero: 6,
    titulo: 'Datos del Receptor',
    descripcion: 'Ingresar datos del cliente',
    subpasos: [
      'Condición IVA: "IVA Responsable Inscripto"',
      'Tipo documento: CUIT + número',
      'Condición de Venta: "Contado"',
    ],
    destacado: true,
  },
  {
    numero: 7,
    titulo: 'Datos de la Operación',
    descripcion: 'Detalle de lo facturado',
    subpasos: [
      'Código: 1 | Cantidad: 1',
      'U. Medida: "otras unidades"',
      'Precio Unitario: MONTO A FACTURAR',
    ],
    destacado: true,
  },
  {
    numero: 8,
    titulo: 'Confirmar y Descargar',
    descripcion: 'Verificar datos, confirmar y guardar el comprobante',
    subpasos: [],
  },
];

const datosRapidos = [
  { label: 'Tipo de Factura', value: 'Factura C' },
  { label: 'Condición Receptor', value: 'IVA Responsable Inscripto' },
  { label: 'Conceptos', value: 'Productos y Servicios' },
  { label: 'Condición Venta', value: 'Contado' },
  { label: 'Unidad Medida', value: 'Otras unidades' },
  { label: 'Actividad', value: '661999' },
];

const breadcrumbItems: BreadcrumbItem[] = [
  { label: 'Recursos', href: '/recursos' },
  { label: 'Facturación' },
];

export default function FacturacionPage() {
  const [copiedCuit, setCopiedCuit] = useState<string | null>(null);

  const copyToClipboard = (cuit: string) => {
    navigator.clipboard.writeText(cuit);
    setCopiedCuit(cuit);
    setTimeout(() => setCopiedCuit(null), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Stack gap="lg">
          {/* Breadcrumb + Header */}
          <header>
            <Stack gap="lg">
              <Breadcrumbs items={breadcrumbItems} LinkComponent={Link} />

              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <Stack gap="xs">
                  <Heading level={1}>Guía de Facturación</Heading>
                  <Text size="lg" color="secondary">
                    Cómo emitir facturas electrónicas en AFIP Monotributo
                  </Text>
                </Stack>

                <a
                  href="https://auth.afip.gob.ar/contribuyente_/login.xhtml"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="primary" size="lg">
                    <Stack direction="row" gap="xs" align="center">
                      <span>Ir a AFIP</span>
                      <Icon name="ExternalLink" size={16} />
                    </Stack>
                  </Button>
                </a>
              </div>
            </Stack>
          </header>

          {/* Alerta Error - Destacada */}
          <Alert variant="error" title="Error común [Cod. 1008b]">
            Si aparece &quot;No es posible generar el comprobante en este momento&quot;,{' '}
            <strong>probá con otro navegador</strong> (Chrome, Firefox, Edge).
          </Alert>

          {/* Grid Principal: CUITs + Destinos */}
          <Grid cols={{ base: 1, lg: 2 }} gap="lg">
            {/* CUITs */}
            <Card variant="outlined" padding="none" className="overflow-hidden">
              <CardHeader className="bg-slate-800 px-6 py-4 rounded-t-lg">
                <Stack direction="row" gap="sm" align="center">
                  <Icon name="Users" size={20} className="text-white" />
                  <CardTitle className="text-white">CUITs - Responsables Inscriptos</CardTitle>
                </Stack>
              </CardHeader>
              <CardContent className="p-4">
                <Stack gap="sm">
                  {responsablesInscriptos.map((dato) => (
                    <div
                      key={dato.cuit}
                      className="flex items-center justify-between p-3 bg-surface-hover rounded-lg hover:bg-surface transition-colors group"
                    >
                      <div className="min-w-0">
                        <Text weight="medium" className="truncate">
                          {dato.nombre}
                        </Text>
                        <Text size="sm" color="secondary" className="font-mono">
                          {dato.cuit}
                        </Text>
                      </div>
                      <Button
                        variant={copiedCuit === dato.cuit ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => copyToClipboard(dato.cuit)}
                        className="flex-shrink-0 ml-3"
                      >
                        {copiedCuit === dato.cuit ? (
                          <Stack direction="row" gap="xs" align="center">
                            <Icon name="check" size={14} />
                            <span>Copiado</span>
                          </Stack>
                        ) : (
                          'Copiar'
                        )}
                      </Button>
                    </div>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* Destinos */}
            <Card variant="outlined" padding="none" className="overflow-hidden">
              <CardHeader className="bg-slate-800 px-6 py-4 rounded-t-lg">
                <Stack direction="row" gap="sm" align="center">
                  <Icon name="Briefcase" size={20} className="text-white" />
                  <CardTitle className="text-white">Destinos de Facturación</CardTitle>
                </Stack>
              </CardHeader>
              <CardContent className="p-4">
                <Stack gap="sm">
                  {destinosFacturacion.map((destino) => (
                    <div
                      key={destino.nombre}
                      className={`p-4 rounded-xl border-2 ${
                        destino.color === 'blue'
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-emerald-200 bg-emerald-50'
                      }`}
                    >
                      <Stack direction="row" justify="between" align="center" className="mb-1">
                        <Text
                          weight="bold"
                          size="lg"
                          className={
                            destino.color === 'blue' ? 'text-blue-800' : 'text-emerald-800'
                          }
                        >
                          {destino.nombre}
                        </Text>
                        <Badge variant="default" size="sm">
                          {destino.destinatario}
                        </Badge>
                      </Stack>
                      {destino.nota && (
                        <Alert variant="warning" icon={false} className="mt-2 p-2">
                          <Text size="sm">💡 {destino.nota}</Text>
                        </Alert>
                      )}
                    </div>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Datos Rápidos - Horizontal */}
          <Card variant="elevated" className="bg-gradient-to-r from-indigo-600 to-indigo-700">
            <CardContent>
              <Stack gap="md">
                <Stack direction="row" gap="sm" align="center">
                  <Icon name="Activity" size={20} className="text-white" />
                  <Text weight="semibold" size="lg" className="text-white">
                    Datos Rápidos
                  </Text>
                </Stack>
                <Grid cols={{ base: 2, sm: 3, lg: 6 }} gap="sm">
                  {datosRapidos.map((dato) => (
                    <div key={dato.label} className="bg-white/10 backdrop-blur rounded-lg p-3">
                      <Text
                        size="xs"
                        weight="medium"
                        className="text-indigo-200 uppercase tracking-wide"
                      >
                        {dato.label}
                      </Text>
                      <Text size="sm" weight="semibold" className="text-white mt-0.5">
                        {dato.value}
                      </Text>
                    </div>
                  ))}
                </Grid>
              </Stack>
            </CardContent>
          </Card>

          {/* Paso a Paso */}
          <Card variant="outlined" padding="none" className="overflow-hidden">
            <CardHeader className="bg-slate-800 px-6 py-4 rounded-t-lg">
              <Stack direction="row" gap="sm" align="center">
                <Icon name="list" size={20} className="text-white" />
                <CardTitle className="text-white">Paso a Paso</CardTitle>
              </Stack>
            </CardHeader>
            <CardContent className="p-6">
              <Grid cols={{ base: 1, md: 2, lg: 4 }} gap="md">
                {pasosFacturacion.map((paso) => (
                  <div
                    key={paso.numero}
                    className={`relative p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                      paso.destacado
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {/* Número */}
                    <div
                      className={`absolute -top-3 -left-2 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                        paso.destacado ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-white'
                      }`}
                    >
                      {paso.numero}
                    </div>

                    <div className="pt-2">
                      <Text
                        weight="semibold"
                        className={`mb-1 ${paso.destacado ? 'text-indigo-900' : 'text-slate-800'}`}
                      >
                        {paso.titulo}
                      </Text>
                      <Text size="sm" color="secondary" className="mb-2">
                        {paso.descripcion}
                      </Text>

                      {paso.alerta && (
                        <Alert variant="warning" icon={false} className="mb-2 p-2">
                          <Text size="xs" weight="medium">
                            ⚠️ {paso.alerta}
                          </Text>
                        </Alert>
                      )}

                      {paso.subpasos && paso.subpasos.length > 0 && (
                        <ul className="flex flex-col gap-1">
                          {paso.subpasos.map((subpaso, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-text-secondary flex items-start gap-1.5"
                            >
                              <span className="text-primary mt-0.5">•</span>
                              <span>{subpaso}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Stack>
      </div>
    </div>
  );
}
