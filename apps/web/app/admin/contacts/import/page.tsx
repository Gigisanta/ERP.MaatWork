import { Heading, Text, Card, CardHeader, CardContent } from '@maatwork/ui';
import ContactFileUploader from '@/components/contacts/ContactFileUploader';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Importar Contactos | Admin | MAATWORK',
};

/**
 * Admin Contact Import Page
 * 
 * Permite a los administradores subir archivos CSV de Balanz AUM para migrar contactos
 * detectando automáticamente el asesor y evitando duplicados.
 */
export default function AdminContactImportPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Heading size="2xl" className="font-bold">Importación de Contactos</Heading>
        <Text className="text-gray-500 mt-1">
          Sincronice la base de datos de contactos desde archivos de exportación de Balanz.
        </Text>
      </div>

      <Card>
        <CardHeader>
          <Heading size="lg">Proceso de Importación Inteligente</Heading>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <div className="flex">
              <div className="ml-3">
                <Text size="sm" className="text-blue-700">
                  <strong>¿Cómo funciona?</strong> El sistema lee el archivo .csv, extrae los nombres de los clientes y 
                  detecta al asesor mediante su nombre o alias configurado. Si el contacto ya existe (identificado por 
                  su ID de Cuenta), se omitirá para evitar duplicados.
                </Text>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Heading size="sm">Columnas Requeridas en el CSV:</Heading>
            <ul className="list-disc list-inside text-sm text-gray-600 ml-2 space-y-1">
              <li><code className="bg-gray-100 px-1 rounded">idCuenta</code>: ID único de la cuenta (obligatorio para deduplicación).</li>
              <li><code className="bg-gray-100 px-1 rounded">Descripcion</code>: Nombre completo del cliente (formato APELLIDO NOMBRE).</li>
              <li><code className="bg-gray-100 px-1 rounded">Asesor</code>: Nombre del asesor asignado en Balanz.</li>
              <li><code className="bg-gray-100 px-1 rounded">comitente</code>: (Opcional) Número de comitente.</li>
            </ul>
          </div>

          <div className="pt-4 border-t">
            <Heading size="sm" className="mb-4">Subir Archivo</Heading>
            <ContactFileUploader />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="py-4">
          <Heading size="sm" className="text-amber-800">⚠️ Recomendaciones antes de importar:</Heading>
          <ul className="list-decimal list-inside text-sm text-amber-700 mt-2 space-y-1">
            <li>Asegúrese de que el archivo esté en formato <strong>CSV delimitado por comas</strong>.</li>
            <li>Verifique que los nombres de los asesores coincidan con su nombre en el sistema o tengan un <strong>Alias</strong> configurado.</li>
            <li>Si un asesor no es reconocido, el contacto se creará como <strong>Sin Asignar</strong>.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}









