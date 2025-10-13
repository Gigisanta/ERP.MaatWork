'use client';

/**
 * Panel de Matching ETL - Conciliación de datos Balanz
 * UI principal para cargar archivos y ejecutar matching
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type FileType = 'aum_madre' | 'cluster_cuentas' | 'comisiones';

interface UploadedFile {
  type: FileType;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  result?: any;
  error?: string;
}

export default function ETLMatchingPage() {
  const router = useRouter();
  const [files, setFiles] = useState<Record<FileType, UploadedFile | null>>({
    aum_madre: null,
    cluster_cuentas: null,
    comisiones: null
  });
  const [matchingStatus, setMatchingStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [matchingResult, setMatchingResult] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleFileSelect = (type: FileType, file: File) => {
    setFiles(prev => ({
      ...prev,
      [type]: {
        type,
        file,
        status: 'pending'
      }
    }));
    addLog(`📄 Archivo seleccionado: ${file.name} (${type})`);
  };

  const uploadFile = async (type: FileType): Promise<boolean> => {
    const uploadedFile = files[type];
    if (!uploadedFile) return false;

    try {
      setFiles(prev => ({
        ...prev,
        [type]: { ...prev[type]!, status: 'uploading' }
      }));

      addLog(`⬆️ Subiendo ${type}...`);

      const formData = new FormData();
      formData.append('file', uploadedFile.file);
      
      if (type === 'aum_madre' || type === 'cluster_cuentas') {
        formData.append('snapshotDate', new Date().toISOString().split('T')[0]);
      }

      const endpoint = type === 'aum_madre' 
        ? '/etl/aum-madre'
        : type === 'cluster_cuentas'
        ? '/etl/cluster-cuentas'
        : '/etl/comisiones';

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (res.ok || res.status === 207) {
        setFiles(prev => ({
          ...prev,
          [type]: { ...prev[type]!, status: 'success', result: data }
        }));
        addLog(`✅ ${type} cargado: ${data.parseMetrics?.filasValidas || 0} filas válidas`);
        return true;
      } else {
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error: any) {
      setFiles(prev => ({
        ...prev,
        [type]: { ...prev[type]!, status: 'error', error: error.message }
      }));
      addLog(`❌ Error en ${type}: ${error.message}`);
      return false;
    }
  };

  const uploadAllFiles = async () => {
    addLog('🚀 Iniciando carga de archivos...');
    
    const types: FileType[] = ['aum_madre', 'cluster_cuentas', 'comisiones'];
    
    for (const type of types) {
      if (files[type]) {
        await uploadFile(type);
      }
    }
    
    addLog('✅ Carga de archivos completada');
  };

  const runMatching = async () => {
    try {
      setMatchingStatus('running');
      addLog('🔄 Ejecutando matching...');

      const res = await fetch(`${API_URL}/etl/matching/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fuzzyEnabled: true,
          fuzzyThreshold: 2
        })
      });

      const data = await res.json();

      if (res.ok) {
        setMatchingStatus('success');
        setMatchingResult(data);
        addLog(`✅ Matching completado:`);
        addLog(`   - Total procesados: ${data.totalProcessed}`);
        addLog(`   - Matched: ${data.matched}`);
        addLog(`   - Multi-match: ${data.multiMatch}`);
        addLog(`   - No match: ${data.noMatch}`);
        addLog(`   - Mismatch owner/benef: ${data.mismatchOwnerBenef}`);
        addLog(`   - Match rate: ${data.metrics.matchRate.toFixed(2)}%`);
      } else {
        throw new Error(data.error || 'Error en matching');
      }
    } catch (error: any) {
      setMatchingStatus('error');
      addLog(`❌ Error en matching: ${error.message}`);
    }
  };

  const canUpload = Object.values(files).some(f => f !== null && f.status === 'pending');
  const canMatch = Object.values(files).some(f => f?.status === 'success');
  const hasUploaded = Object.values(files).some(f => f?.status === 'success');

  // Calcular progreso general
  const totalFiles = 3;
  const uploadedFiles = Object.values(files).filter(f => f?.status === 'success').length;
  const progressPercentage = Math.round((uploadedFiles / totalFiles) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Mejorado */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl">🔗</span>
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Matching ETL
              </h1>
              <p className="text-gray-600 text-lg">
                Conciliación de datos Balanz - Proceso automatizado de matching
              </p>
            </div>
            <button
              onClick={() => router.push('/etl/config')}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition-colors flex items-center gap-2"
            >
              ⚙️ Configuración
            </button>
          </div>
          
          {/* Barra de Progreso General */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Progreso General</h3>
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
              <span>1. Cargar archivos</span>
              <span>2. Ejecutar matching</span>
              <span>3. Revisar resultados</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Carga de Archivos */}
          <div className="lg:col-span-2 space-y-4">
            {/* Sección de Archivos con mejor organización */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                  📁
                </span>
                Cargar Archivos de Datos
              </h2>
              
              {/* CSV Madre */}
              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      📊
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        CSV Madre (Autoridad)
                      </h3>
                      <p className="text-sm text-gray-500">
                        Archivo principal con datos de clientes y AUM
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
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-green-100 text-green-700 px-2 py-1 rounded">
                          ✓ {files.aum_madre.result.parseMetrics?.filasValidas || 0} filas
                        </div>
                        <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          ✓ {files.aum_madre.result.loadResult?.clientesCreados || 0} nuevos
                        </div>
                        <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          ✓ {files.aum_madre.result.loadResult?.clientesActualizados || 0} actualizados
                        </div>
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

              {/* Reporte Mensual */}
              <div className="border border-gray-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      📈
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Reporte Mensual
                      </h3>
                      <p className="text-sm text-gray-500">
                        Datos de cluster de cuentas y reportes mensuales
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
                  accept=".csv,.xlsx,.xls"
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
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-green-100 text-green-700 px-2 py-1 rounded">
                          ✓ {files.cluster_cuentas.result.parseMetrics?.filasValidas || 0} filas
                        </div>
                        <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          ✓ {files.cluster_cuentas.result.loadResult?.clientesCreados || 0} nuevos
                        </div>
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

              {/* Comisiones */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      💰
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Comisiones
                      </h3>
                      <p className="text-sm text-gray-500">
                        Datos de comisiones y asesores
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
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect('comisiones', file);
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                
                {files.comisiones && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      📄 {files.comisiones.file.name} ({(files.comisiones.file.size / 1024).toFixed(0)} KB)
                    </div>
                    {files.comisiones.result && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-green-100 text-green-700 px-2 py-1 rounded">
                          ✓ {files.comisiones.result.parseMetrics?.filasValidas || 0} comisiones
                        </div>
                        <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          ✓ {files.comisiones.result.loadResult?.asesoresCreados || 0} asesores
                        </div>
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

            {/* Panel de Acciones */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  ⚡
                </span>
                Acciones del Proceso
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={uploadAllFiles}
                  disabled={!canUpload}
                  className={`px-6 py-4 rounded-xl font-semibold text-white shadow-lg transition-all ${
                    canUpload
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>⬆️</span>
                    <div className="text-left">
                      <div className="text-lg">Cargar Archivos</div>
                      <div className="text-sm opacity-90">
                        {canUpload ? 'Subir archivos seleccionados' : 'Selecciona archivos primero'}
                      </div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={runMatching}
                  disabled={!canMatch || matchingStatus === 'running'}
                  className={`px-6 py-4 rounded-xl font-semibold text-white shadow-lg transition-all ${
                    canMatch && matchingStatus !== 'running'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-xl'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>{matchingStatus === 'running' ? '⏳' : '🔄'}</span>
                    <div className="text-left">
                      <div className="text-lg">
                        {matchingStatus === 'running' ? 'Ejecutando...' : 'Ejecutar Matching'}
                      </div>
                      <div className="text-sm opacity-90">
                        {matchingStatus === 'running' 
                          ? 'Procesando datos...' 
                          : canMatch ? 'Iniciar proceso de matching' : 'Carga archivos primero'
                        }
                      </div>
                    </div>
                  </div>
                </button>
              </div>
              
              {/* Información de estado */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span className="font-medium">Estado del proceso:</span>
                  </div>
                  <ul className="space-y-1 text-xs">
                    <li>• {uploadedFiles === 0 ? '❌' : uploadedFiles === totalFiles ? '✅' : '🔄'} Archivos cargados: {uploadedFiles}/{totalFiles}</li>
                    <li>• {matchingStatus === 'idle' ? '⏸️' : matchingStatus === 'running' ? '🔄' : matchingStatus === 'success' ? '✅' : '❌'} Matching: {matchingStatus === 'idle' ? 'Pendiente' : matchingStatus === 'running' ? 'En progreso' : matchingStatus === 'success' ? 'Completado' : 'Error'}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Resultado del Matching */}
            {matchingResult && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    📊
                  </span>
                  Resultado del Matching
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                    <div className="text-3xl font-bold text-green-700 mb-1">
                      {matchingResult.matched}
                    </div>
                    <div className="text-sm font-medium text-green-600">Matched</div>
                    <div className="text-xs text-green-500 mt-1">Coincidencias exactas</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-200">
                    <div className="text-3xl font-bold text-orange-700 mb-1">
                      {matchingResult.multiMatch}
                    </div>
                    <div className="text-sm font-medium text-orange-600">Multi-match</div>
                    <div className="text-xs text-orange-500 mt-1">Múltiples coincidencias</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl border border-red-200">
                    <div className="text-3xl font-bold text-red-700 mb-1">
                      {matchingResult.noMatch}
                    </div>
                    <div className="text-sm font-medium text-red-600">No match</div>
                    <div className="text-xs text-red-500 mt-1">Sin coincidencias</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                    <div className="text-3xl font-bold text-yellow-700 mb-1">
                      {matchingResult.mismatchOwnerBenef}
                    </div>
                    <div className="text-sm font-medium text-yellow-600">Mismatch</div>
                    <div className="text-xs text-yellow-500 mt-1">Inconsistencias</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="text-3xl font-bold text-blue-700 mb-1">
                      {matchingResult.metrics.matchRate.toFixed(1)}%
                    </div>
                    <div className="text-sm font-medium text-blue-600">Match Rate</div>
                    <div className="text-xs text-blue-500 mt-1">Tasa de éxito</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => router.push('/matching-pending')}
                    className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                  >
                    🔍 Ver Matching Pendientes
                  </button>
                  <button
                    onClick={() => router.push('/etl/dashboard')}
                    className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    📊 Ver Dashboard
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Panel de Logs Mejorado */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-lg p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  📝
                </span>
                <span>Logs del Sistema</span>
                {logs.length > 0 && (
                  <span className="ml-auto px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                    {logs.length}
                  </span>
                )}
              </h3>
              
              <div className="bg-black rounded-lg p-4 h-96 overflow-y-auto font-mono text-xs border border-gray-700">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center mt-8">
                    <div className="text-4xl mb-2">⏳</div>
                    <div>Esperando operaciones...</div>
                    <div className="text-xs text-gray-600 mt-2">
                      Los logs aparecerán aquí cuando ejecutes acciones
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, i) => (
                      <div key={i} className="text-green-400 hover:bg-gray-800 p-1 rounded">
                        {log}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Acciones rápidas */}
              <div className="mt-4 space-y-2">
                <div className="text-xs text-gray-400 mb-2">Acciones rápidas:</div>
                <button
                  onClick={() => setLogs([])}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-xs font-medium hover:bg-gray-600 transition-colors"
                >
                  🗑️ Limpiar logs
                </button>
                
                {hasUploaded && (
                  <>
                    <button
                      onClick={() => router.push('/etl/dashboard')}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                    >
                      📊 Ver Dashboard
                    </button>
                    <button
                      onClick={() => router.push('/matching-pending')}
                      className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors"
                    >
                      🔍 Ver Pendientes
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

