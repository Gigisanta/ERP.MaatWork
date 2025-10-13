'use client';

/**
 * Página ETL Simplificada
 * Flujo: Madre (autoridad) → Nuevo (actualización) → Comisiones (procesamiento)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface FileUpload {
  file: File;
  status: 'uploading' | 'success' | 'error';
  result?: any;
  error?: string;
}

export default function ETLSimplifiedPage() {
  const router = useRouter();
  const [files, setFiles] = useState<{
    aum_madre?: FileUpload;
    cluster_cuentas?: FileUpload;
    comisiones?: FileUpload;
  }>({});

  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  };

  const handleFileSelect = async (fileType: string, file: File) => {
    setFiles(prev => ({
      ...prev,
      [fileType]: { file, status: 'uploading' }
    }));

    addLog(`📄 Archivo seleccionado: ${file.name} (${fileType})`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = fileType === 'aum_madre' ? '/aum-madre' : 
                      fileType === 'cluster_cuentas' ? '/cluster-cuentas' : 
                      '/comisiones';

      const response = await fetch(`${API_URL}/etl${endpoint}`, {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        setFiles(prev => ({
          ...prev,
          [fileType]: { file, status: 'success', result }
        }));

        const filasValidas = result.parseMetrics?.filasValidas || 0;
        addLog(`✅ ${fileType} cargado: ${filasValidas} filas válidas`);
      } else {
        const error = await response.json();
        setFiles(prev => ({
          ...prev,
          [fileType]: { file, status: 'error', error: error.error || 'Error desconocido' }
        }));
        addLog(`❌ Error en ${fileType}: ${error.error || 'Error desconocido'}`);
      }
    } catch (error: any) {
      setFiles(prev => ({
        ...prev,
        [fileType]: { file, status: 'error', error: error.message }
      }));
      addLog(`❌ Error en ${fileType}: ${error.message}`);
    }
  };

  const handleProcessAll = async () => {
    if (!files.aum_madre || files.aum_madre.status !== 'success') {
      addLog('❌ Error: Debe cargar el archivo Madre primero');
      return;
    }

    setIsProcessing(true);
    addLog('🚀 Iniciando proceso de conciliación...');

    try {
      // Paso 1: Verificar que el archivo Madre esté cargado
      addLog('✅ Paso 1: Archivo Madre cargado como autoridad');

      // Paso 2: Si hay archivo nuevo, actualizar el Madre
      if (files.cluster_cuentas && files.cluster_cuentas.status === 'success') {
        addLog('🔄 Paso 2: Actualizando archivo Madre con información del archivo Nuevo...');
        addLog('   - Preservando asignación de asesores del Madre');
        addLog('   - Actualizando información de AUM y breakdowns');
      } else {
        addLog('ℹ️ Paso 2: No hay archivo Nuevo para actualizar el Madre');
      }

      // Paso 3: Procesar comisiones si están disponibles
      if (files.comisiones && files.comisiones.status === 'success') {
        addLog('🔄 Paso 3: Procesando comisiones con archivo Madre actualizado...');
      } else {
        addLog('ℹ️ Paso 3: No hay comisiones para procesar');
      }

      // Ejecutar el proceso de matching simplificado
      addLog('⚡ Ejecutando proceso de conciliación...');
      
      const response = await fetch(`${API_URL}/etl/matching/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          addLog(`✅ Proceso completado exitosamente:`);
          addLog(`   - Madres procesados: ${result.stats.madresProcessed}`);
          addLog(`   - Nuevos procesados: ${result.stats.nuevosProcessed}`);
          addLog(`   - Clientes actualizados: ${result.stats.clientesActualizados}`);
          addLog(`   - Comisiones procesadas: ${result.stats.comisionesProcessed}`);
          addLog(`   - Comisiones asignadas: ${result.stats.comisionesAsignadas}`);
        } else {
          addLog(`❌ Proceso falló: ${result.message}`);
          if (result.errors && result.errors.length > 0) {
            result.errors.forEach((error: string) => addLog(`   - ${error}`));
          }
        }
      } else {
        const error = await response.json();
        addLog(`❌ Error en proceso: ${error.error || 'Error desconocido'}`);
      }

      addLog('🎉 Proceso de conciliación completado');
    } catch (error: any) {
      addLog(`❌ Error en proceso: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Calcular progreso general
  const totalFiles = 3;
  const uploadedFiles = Object.values(files).filter(f => f?.status === 'success').length;
  const progressPercentage = Math.round((uploadedFiles / totalFiles) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Simplificado */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl">🔄</span>
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Conciliación Simplificada
              </h1>
              <p className="text-gray-600 text-lg">
                Flujo directo: Madre → Nuevo → Comisiones
              </p>
            </div>
            <button
              onClick={() => router.push('/etl/config')}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors flex items-center gap-2"
            >
              ⚙️ Configuración
            </button>
          </div>
          
          {/* Barra de Progreso Simplificada */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Progreso</h3>
              <span className="text-sm font-medium text-gray-600">
                {uploadedFiles}/{totalFiles} archivos cargados
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>1. Madre (autoridad)</span>
              <span>2. Nuevo (actualización)</span>
              <span>3. Comisiones (procesamiento)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Flujo Simplificado */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  🔄
                </span>
                Proceso de Conciliación
              </h2>

              {/* Paso 1: Archivo Madre */}
              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      👑
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Paso 1: Archivo Madre (Autoridad)
                      </h3>
                      <p className="text-sm text-gray-500">
                        Define de quién es cada cliente - BASE DE REFERENCIA
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {files.aum_madre?.status === 'success' && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                        ✓ Cargado
                      </span>
                    )}
                    {files.aum_madre?.status === 'uploading' && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                        ⏳ Subiendo...
                      </span>
                    )}
                    {files.aum_madre?.status === 'error' && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                        ❌ Error
                      </span>
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect('aum_madre', file);
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                {files.aum_madre && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      📄 {files.aum_madre.file.name} ({(files.aum_madre.file.size / 1024).toFixed(0)} KB)
                    </div>
                    {files.aum_madre.result && (
                      <div className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                        ✓ {files.aum_madre.result.parseMetrics?.filasValidas || 0} clientes registrados como autoridad
                      </div>
                    )}
                    {files.aum_madre.error && (
                      <div className="mt-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                        ❌ {files.aum_madre.error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Paso 2: Archivo Nuevo */}
              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      📊
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Paso 2: Archivo Nuevo (Actualización)
                      </h3>
                      <p className="text-sm text-gray-500">
                        Se compara con el Madre y se actualiza la información
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {files.cluster_cuentas?.status === 'success' && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                        ✓ Cargado
                      </span>
                    )}
                    {files.cluster_cuentas?.status === 'uploading' && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                        ⏳ Subiendo...
                      </span>
                    )}
                    {files.cluster_cuentas?.status === 'error' && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                        ❌ Error
                      </span>
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect('cluster_cuentas', file);
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {files.cluster_cuentas && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      📄 {files.cluster_cuentas.file.name} ({(files.cluster_cuentas.file.size / 1024).toFixed(0)} KB)
                    </div>
                    {files.cluster_cuentas.result && (
                      <div className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">
                        ✓ {files.cluster_cuentas.result.parseMetrics?.filasValidas || 0} registros para actualizar
                      </div>
                    )}
                    {files.cluster_cuentas.error && (
                      <div className="mt-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                        ❌ {files.cluster_cuentas.error}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Paso 3: Comisiones */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      💰
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Paso 3: Comisiones (Procesamiento)
                      </h3>
                      <p className="text-sm text-gray-500">
                        Se procesan usando la información del archivo Madre
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {files.comisiones?.status === 'success' && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                        ✓ Cargado
                      </span>
                    )}
                    {files.comisiones?.status === 'uploading' && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                        ⏳ Subiendo...
                      </span>
                    )}
                    {files.comisiones?.status === 'error' && (
                      <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                        ❌ Error
                      </span>
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect('comisiones', file);
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
                />
                {files.comisiones && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      📄 {files.comisiones.file.name} ({(files.comisiones.file.size / 1024).toFixed(0)} KB)
                    </div>
                    {files.comisiones.result && (
                      <div className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                        ✓ {files.comisiones.result.parseMetrics?.filasValidas || 0} comisiones para procesar
                      </div>
                    )}
                    {files.comisiones.error && (
                      <div className="mt-2 text-red-600 text-sm bg-red-50 p-2 rounded">
                        ❌ {files.comisiones.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Panel de Acciones Simplificado */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
                  ⚡
                </span>
                Acciones
              </h3>

              <div className="space-y-3">
                <button
                  onClick={handleProcessAll}
                  disabled={!files.aum_madre || files.aum_madre.status !== 'success' || isProcessing}
                  className="w-full px-4 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      🚀 Ejecutar Conciliación
                    </>
                  )}
                </button>

                <div className="text-xs text-gray-500 text-center">
                  Requiere: Archivo Madre cargado
                </div>
              </div>
            </div>

            {/* Logs Simplificados */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center">
                    📝
                  </span>
                  Logs del Sistema
                </h3>
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {logs.length}
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No hay logs aún
                  </div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="text-xs text-gray-700 bg-gray-50 p-2 rounded font-mono">
                      {log}
                    </div>
                  ))
                )}
              </div>

              {logs.length > 0 && (
                <button
                  onClick={() => setLogs([])}
                  className="w-full mt-3 px-3 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded transition-colors"
                >
                  🗑️ Limpiar Logs
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
