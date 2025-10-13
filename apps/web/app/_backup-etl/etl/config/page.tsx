'use client';

/**
 * Panel de Configuración del ETL
 * Permite configurar todos los parámetros del proceso de matching y ETL
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ETLConfig {
  // Configuración de Parsing
  parsing: {
    breakdownTolerance: number; // Tolerancia para suma de breakdowns (USD)
    breakdownTolerancePercent: number; // Tolerancia por porcentaje (%)
    headerRow: number; // Fila del header en Excel
    skipEmptyRows: boolean; // Saltar filas vacías
  };
  
  // Configuración de Matching
  matching: {
    fuzzyEnabled: boolean; // Habilitar matching fuzzy
    fuzzyThreshold: number; // Distancia máxima Levenshtein
    exactMatchPriority: boolean; // Priorizar matches exactos
    multiMatchAction: 'warn' | 'error' | 'allow'; // Acción para multi-matches
  };
  
  // Configuración de Validación
  validation: {
    minAUMThreshold: number; // AUM mínimo para considerar válido
    maxAUMThreshold: number; // AUM máximo para considerar válido
    requireClientMatch: boolean; // Requerir match de cliente
    allowZeroCommissions: boolean; // Permitir comisiones en 0
  };
  
  // Configuración de Procesamiento
  processing: {
    batchSize: number; // Tamaño de lote para procesamiento
    maxRetries: number; // Máximo de reintentos
    timeoutMs: number; // Timeout en milisegundos
    enableParallelProcessing: boolean; // Procesamiento paralelo
  };
  
  // Configuración de Logging
  logging: {
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    logParsingDetails: boolean; // Log detallado del parsing
    logMatchingDetails: boolean; // Log detallado del matching
    saveLogsToFile: boolean; // Guardar logs en archivo
  };
}

const defaultConfig: ETLConfig = {
  parsing: {
    breakdownTolerance: 0.1,
    breakdownTolerancePercent: 1.0,
    headerRow: 1,
    skipEmptyRows: true
  },
  matching: {
    fuzzyEnabled: true,
    fuzzyThreshold: 2,
    exactMatchPriority: true,
    multiMatchAction: 'warn'
  },
  validation: {
    minAUMThreshold: 0,
    maxAUMThreshold: 1000000000,
    requireClientMatch: false,
    allowZeroCommissions: true
  },
  processing: {
    batchSize: 1000,
    maxRetries: 3,
    timeoutMs: 300000,
    enableParallelProcessing: true
  },
  logging: {
    logLevel: 'info',
    logParsingDetails: false,
    logMatchingDetails: false,
    saveLogsToFile: true
  }
};

export default function ETLConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<ETLConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Cargar configuración al montar
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(`${API_URL}/etl/config`);
      if (response.ok) {
        const savedConfig = await response.json();
        setConfig({ ...defaultConfig, ...savedConfig });
      }
    } catch (error) {
      console.warn('No se pudo cargar configuración, usando valores por defecto:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch(`${API_URL}/etl/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Error al guardar configuración' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error de conexión' });
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setConfig(defaultConfig);
    setMessage(null);
  };

  const updateConfig = (section: keyof ETLConfig, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando configuración...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              ←
            </button>
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl">⚙️</span>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Configuración del ETL
              </h1>
              <p className="text-gray-600 text-lg">
                Configura todos los parámetros del proceso de matching y ETL
              </p>
            </div>
          </div>

          {/* Mensaje de estado */}
          {message && (
            <div className={`p-4 rounded-lg mb-6 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3">
            <button
              onClick={saveConfig}
              disabled={isSaving}
              className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  💾 Guardar Configuración
                </>
              )}
            </button>
            
            <button
              onClick={resetToDefaults}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
            >
              🔄 Restaurar Valores por Defecto
            </button>
            
            <button
              onClick={() => router.push('/etl')}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              ← Volver al ETL
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuración de Parsing */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                📊
              </span>
              Configuración de Parsing
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tolerancia Breakdowns (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1000"
                  value={config.parsing.breakdownTolerance}
                  onChange={(e) => updateConfig('parsing', 'breakdownTolerance', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tolerancia para diferencias en suma de breakdowns vs AUM total
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tolerancia Breakdowns (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={config.parsing.breakdownTolerancePercent}
                  onChange={(e) => updateConfig('parsing', 'breakdownTolerancePercent', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tolerancia por porcentaje del AUM total
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fila del Header
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.parsing.headerRow}
                  onChange={(e) => updateConfig('parsing', 'headerRow', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="skipEmptyRows"
                  checked={config.parsing.skipEmptyRows}
                  onChange={(e) => updateConfig('parsing', 'skipEmptyRows', e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="skipEmptyRows" className="ml-2 text-sm text-gray-700">
                  Saltar filas vacías
                </label>
              </div>
            </div>
          </div>

          {/* Configuración de Matching */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                🔍
              </span>
              Configuración de Matching
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="fuzzyEnabled"
                  checked={config.matching.fuzzyEnabled}
                  onChange={(e) => updateConfig('matching', 'fuzzyEnabled', e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="fuzzyEnabled" className="ml-2 text-sm text-gray-700">
                  Habilitar matching fuzzy
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Threshold Fuzzy (Levenshtein)
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={config.matching.fuzzyThreshold}
                  onChange={(e) => updateConfig('matching', 'fuzzyThreshold', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  disabled={!config.matching.fuzzyEnabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Distancia máxima permitida para coincidencias fuzzy
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="exactMatchPriority"
                  checked={config.matching.exactMatchPriority}
                  onChange={(e) => updateConfig('matching', 'exactMatchPriority', e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="exactMatchPriority" className="ml-2 text-sm text-gray-700">
                  Priorizar matches exactos
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Acción para Multi-Matches
                </label>
                <select
                  value={config.matching.multiMatchAction}
                  onChange={(e) => updateConfig('matching', 'multiMatchAction', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="warn">Advertir</option>
                  <option value="error">Error</option>
                  <option value="allow">Permitir</option>
                </select>
              </div>
            </div>
          </div>

          {/* Configuración de Validación */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                ✅
              </span>
              Configuración de Validación
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AUM Mínimo (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={config.validation.minAUMThreshold}
                  onChange={(e) => updateConfig('validation', 'minAUMThreshold', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AUM Máximo (USD)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={config.validation.maxAUMThreshold}
                  onChange={(e) => updateConfig('validation', 'maxAUMThreshold', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requireClientMatch"
                  checked={config.validation.requireClientMatch}
                  onChange={(e) => updateConfig('validation', 'requireClientMatch', e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="requireClientMatch" className="ml-2 text-sm text-gray-700">
                  Requerir match de cliente
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowZeroCommissions"
                  checked={config.validation.allowZeroCommissions}
                  onChange={(e) => updateConfig('validation', 'allowZeroCommissions', e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="allowZeroCommissions" className="ml-2 text-sm text-gray-700">
                  Permitir comisiones en 0
                </label>
              </div>
            </div>
          </div>

          {/* Configuración de Procesamiento */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                ⚡
              </span>
              Configuración de Procesamiento
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tamaño de Lote
                </label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  step="100"
                  value={config.processing.batchSize}
                  onChange={(e) => updateConfig('processing', 'batchSize', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo Reintentos
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.processing.maxRetries}
                  onChange={(e) => updateConfig('processing', 'maxRetries', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  min="30000"
                  max="1800000"
                  step="30000"
                  value={config.processing.timeoutMs}
                  onChange={(e) => updateConfig('processing', 'timeoutMs', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableParallelProcessing"
                  checked={config.processing.enableParallelProcessing}
                  onChange={(e) => updateConfig('processing', 'enableParallelProcessing', e.target.checked)}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                />
                <label htmlFor="enableParallelProcessing" className="ml-2 text-sm text-gray-700">
                  Habilitar procesamiento paralelo
                </label>
              </div>
            </div>
          </div>

          {/* Configuración de Logging */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                📝
              </span>
              Configuración de Logging
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel de Log
                </label>
                <select
                  value={config.logging.logLevel}
                  onChange={(e) => updateConfig('logging', 'logLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="logParsingDetails"
                    checked={config.logging.logParsingDetails}
                    onChange={(e) => updateConfig('logging', 'logParsingDetails', e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <label htmlFor="logParsingDetails" className="ml-2 text-sm text-gray-700">
                    Log detallado del parsing
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="logMatchingDetails"
                    checked={config.logging.logMatchingDetails}
                    onChange={(e) => updateConfig('logging', 'logMatchingDetails', e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <label htmlFor="logMatchingDetails" className="ml-2 text-sm text-gray-700">
                    Log detallado del matching
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="saveLogsToFile"
                    checked={config.logging.saveLogsToFile}
                    onChange={(e) => updateConfig('logging', 'saveLogsToFile', e.target.checked)}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <label htmlFor="saveLogsToFile" className="ml-2 text-sm text-gray-700">
                    Guardar logs en archivo
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


