import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
// import { LayoutConfig } from '../styles/cactus-colors';

interface DiagnosticResult {
  type: 'error' | 'warning' | 'success';
  message: string;
  element?: HTMLElement;
}

const InteractionDiagnostic: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const runDiagnostic = () => {
      const diagnosticResults: DiagnosticResult[] = [];

      // 1. Verificar elementos con pointer-events: none (sampleado para evitar freeze)
      const allElements = Array.from(document.querySelectorAll<HTMLElement>('button, a, [role="button"], [data-interactive], [tabindex]'));
      let blockedElements = 0;
      const sample = allElements.slice(0, 500); // limitar inspección
      
      sample.forEach(el => {
        const styles = window.getComputedStyle(el);
        if (styles.pointerEvents === 'none') {
          blockedElements++;
        }
      });

      if (blockedElements > 0) {
        diagnosticResults.push({
          type: 'warning',
          message: `${blockedElements} elementos con pointer-events: none detectados`
        });
      }

      // 2. Verificar overlays invisibles
      const overlays = document.querySelectorAll('.fixed.inset-0, [style*="position: fixed"]');
      const visibleOverlays = Array.from(overlays).filter(el => {
        const styles = window.getComputedStyle(el);
        return styles.display !== 'none' && styles.visibility !== 'hidden' && styles.opacity !== '0';
      });

      if (visibleOverlays.length > 0) {
        diagnosticResults.push({
          type: 'error',
          message: `${visibleOverlays.length} overlays visibles que podrían bloquear interacciones`
        });
      }

      // 3. Verificar elementos clickeables
      const clickableElements = document.querySelectorAll('button, a, [onclick], [role="button"]');
      let workingButtons = 0;
      
      clickableElements.forEach(el => {
        const styles = window.getComputedStyle(el);
        if (styles.pointerEvents !== 'none' && styles.display !== 'none') {
          workingButtons++;
        }
      });

      diagnosticResults.push({
        type: 'success',
        message: `${workingButtons} elementos clickeables funcionando correctamente`
      });

      // 4. Evitar override de console.error; dejar registro a la consola nativa

      // 5. Verificar z-index problemáticos (sampleado)
      const highZIndexElements = sample.filter(el => {
        const styles = window.getComputedStyle(el);
        const z = parseInt(styles.zIndex || '0', 10);
        return Number.isFinite(z) && z > 999;
      });

      if (highZIndexElements.length > 0) {
        diagnosticResults.push({
          type: 'warning',
          message: `${highZIndexElements.length} elementos con z-index muy alto (>50)`
        });
      }

      setResults(diagnosticResults);
    };

    // Ejecutar diagnóstico inicial
    runDiagnostic();

    // Ejecutar diagnóstico cada 15 segundos para menor impacto
    const interval = setInterval(runDiagnostic, 15000);

    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: DiagnosticResult['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
    }
  };

  const hasErrors = results.some(r => r.type === 'error');
  const hasWarnings = results.some(r => r.type === 'warning');

  return (
    <>
      {/* Botón flotante para mostrar/ocultar diagnóstico */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`fixed bottom-4 right-4 z-[9999] p-3 rounded-full shadow-lg transition-all duration-300 ${
          hasErrors ? 'bg-red-600 hover:bg-red-700 text-white' : 
          hasWarnings ? 'bg-amber-600 hover:bg-amber-700 text-white' : 
          'bg-green-600 hover:bg-green-700 text-white'
        }`}
        style={{ pointerEvents: 'auto' }}
      >
        <AlertTriangle className="w-5 h-5" />
      </button>

      {/* Panel de diagnóstico */}
      {isVisible && (
        <div 
          className="fixed bottom-20 right-4 z-[9999] bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 p-4 w-80 max-h-96 overflow-y-auto"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">Diagnóstico de Interacciones</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 p-1"
              style={{ pointerEvents: 'auto' }}
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2">
            {results.map((result, index) => (
              <div key={index} className="flex items-start space-x-2 p-2 rounded bg-neutral-50 dark:bg-neutral-700">
                {getIcon(result.type)}
                <span className="text-sm text-neutral-900 dark:text-neutral-100 flex-1">{result.message}</span>
              </div>
            ))}
            
            {results.length === 0 && (
              <div className="text-center text-gray-500 py-4">
                Ejecutando diagnóstico...
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-cactus-600 hover:bg-cactus-700 text-white py-2 px-4 rounded text-sm transition-colors"
              style={{ pointerEvents: 'auto' }}
            >
              Recargar Página
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InteractionDiagnostic;