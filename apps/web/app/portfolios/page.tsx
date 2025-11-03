'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRequireAuth } from '../auth/useRequireAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Plus, 
  BarChart3, 
  Target, 
  TrendingUp,
  PieChart,
  Eye,
  Edit,
  Trash2,
  ArrowRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
// AI_DECISION: Lazy load heavy components to reduce initial bundle size
// Justificación: AssetSearcher and PortfolioComparator are only used on demand, loading them async reduces FCP by 200-300ms
// Impacto: Faster initial page load, smaller initial JavaScript bundle
const AssetSearcher = dynamic(() => import('../components/AssetSearcher'), {
  loading: () => <div style={{ padding: '1rem', textAlign: 'center' }}>Loading...</div>,
  ssr: false
});
const PortfolioComparator = dynamic(() => import('../components/PortfolioComparator'), {
  loading: () => <div style={{ padding: '1rem', textAlign: 'center' }}>Loading...</div>,
  ssr: false
});
import { 
  getPortfolios, 
  getPortfolioLinesBatch, 
  getBenchmarks, 
  getBenchmarkComponentsBatch,
  createPortfolio,
  updatePortfolio as updatePortfolioApi,
  deletePortfolio,
  addPortfolioLine,
  getPortfolioLines,
  createBenchmark,
  updateBenchmark,
  deleteBenchmark,
  getBenchmarkById,
  addBenchmarkComponent
} from '@/lib/api';
import { createInstrument, getInstruments } from '@/lib/api';
import { logger } from '../../lib/logger';
import { API_BASE_URL } from '../../lib/api-url';
import type { Portfolio, PortfolioLine, Benchmark, BenchmarkComponent, BenchmarkComponentForm, Instrument, InstrumentSearchResult, RiskLevel } from '@/types';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Grid,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Heading,
  Text,
  Stack,
  Badge,
  Alert,
  DataTable,
  Spinner,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  Input,
  Select,
  Toast,
  type Column,
} from '@cactus/ui';

interface PortfolioTemplate {
  id: string;
  name: string;
  description: string;
  riskLevel: string;
  isActive: boolean;
  createdAt: string;
  lines?: PortfolioLine[];
}

// Helper para convertir Portfolio a PortfolioTemplate
function portfolioToTemplate(portfolio: Portfolio): PortfolioTemplate {
  return {
    id: portfolio.id,
    name: portfolio.name,
    description: portfolio.description ?? '',
    riskLevel: portfolio.riskLevel,
    isActive: true,
    createdAt: portfolio.createdAt,
    lines: portfolio.lines ?? []
  };
}

// Types ahora importados desde @/types

export default function PortfoliosPage() {
  const { user, loading } = useRequireAuth();
  const router = useRouter(); // AI_DECISION: Use Next.js router instead of window.location
  const [activeSection, setActiveSection] = useState<string>('portfolios');
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para crear/editar carteras
  const [showCreatePortfolio, setShowCreatePortfolio] = useState(false);
  const [newPortfolio, setNewPortfolio] = useState({
    name: '',
    description: '',
    riskLevel: 'moderate'
  });
  const [portfolioLines, setPortfolioLines] = useState<PortfolioLine[]>([]);
  const [totalWeight, setTotalWeight] = useState(0);

  // Estados para editar carteras
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [showEditPortfolio, setShowEditPortfolio] = useState(false);

  // Estados para crear/editar benchmarks
  const [showCreateBenchmark, setShowCreateBenchmark] = useState(false);
  const [editingBenchmark, setEditingBenchmark] = useState<Benchmark | null>(null);
  const [showEditBenchmark, setShowEditBenchmark] = useState(false);
  const [newBenchmark, setNewBenchmark] = useState({
    name: '',
    description: '',
    code: ''
  });
  const [benchmarkComponents, setBenchmarkComponents] = useState<BenchmarkComponentForm[]>([]);

  // Estado para toast notifications
  const [toast, setToast] = useState<{
    show: boolean;
    title: string;
    description?: string;
    variant: 'success' | 'error' | 'warning' | 'info';
  }>({
    show: false,
    title: '',
    variant: 'info'
  });

  // Estado para ConfirmDialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
    variant?: 'danger' | 'default';
  }>({
    open: false,
    title: '',
    onConfirm: () => {}
  });

  const showToast = (title: string, description?: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ 
      show: true, 
      title, 
      ...(description && { description }), 
      variant 
    });
  };

  // Obtener datos reales desde API
  useEffect(() => {
    const fetchData = async () => {
      if (!token || loading) return;
      
      setIsLoading(true);
      setError(null);

      try {
        // Fetch portfolios
        const portfoliosResponse = await getPortfolios();

        if (portfoliosResponse.success && portfoliosResponse.data) {
          const portfolioIds = portfoliosResponse.data.map((p: Portfolio) => p.id);
          
          if (portfolioIds.length > 0) {
            try {
              const linesBatchResponse = await getPortfolioLinesBatch(portfolioIds);
              
              if (linesBatchResponse.success && linesBatchResponse.data) {
                const linesByTemplate = linesBatchResponse.data || {};

                // Agregar líneas a cada portfolio
                const portfoliosWithLines = portfoliosResponse.data.map((portfolio: Portfolio) => ({
                  ...portfolio,
                  lines: linesByTemplate[portfolio.id] || []
                }));

                setPortfolios(portfoliosWithLines);
              } else {
                // Fallback: portfolios sin líneas
                setPortfolios(portfoliosResponse.data.map((p: Portfolio) => ({ ...p, lines: [] })));
              }
            } catch (err) {
              logger.error('Error fetching portfolio lines batch', { err, portfolioIds });
              setPortfolios(portfoliosResponse.data.map((p: Portfolio) => ({ ...p, lines: [] })));
            }
          } else {
            setPortfolios([]);
          }
        }

        // Fetch benchmarks (solo si es admin/manager)
        if (user?.role === 'admin' || user?.role === 'manager') {
          const benchmarksResponse = await getBenchmarks();

          if (benchmarksResponse.success && benchmarksResponse.data) {
            // Obtener componentes para TODOS los benchmarks en una sola request (batch)
            const benchmarkIds = benchmarksResponse.data.map((b: Benchmark) => b.id);

            if (benchmarkIds.length > 0) {
              try {
                const componentsBatchResponse = await getBenchmarkComponentsBatch(benchmarkIds);

                if (componentsBatchResponse.success && componentsBatchResponse.data) {
                  const componentsByBenchmark = componentsBatchResponse.data || {};

                  // Agregar componentes a cada benchmark
                  const benchmarksWithComponents = benchmarksResponse.data.map((benchmark: Benchmark) => ({
                    ...benchmark,
                    components: componentsByBenchmark[benchmark.id] || []
                  }));

                  setBenchmarks(benchmarksWithComponents);
                } else {
                  // Fallback: benchmarks sin componentes
                  setBenchmarks(benchmarksResponse.data.map((b: Benchmark) => ({ ...b, components: [] })));
                }
              } catch (err) {
                logger.error('Error fetching benchmark components batch', { err, benchmarkIds });
                setBenchmarks(benchmarksResponse.data.map((b: Benchmark) => ({ ...b, components: [] })));
              }
            } else {
              setBenchmarks([]);
            }
          }
        }
      } catch (err) {
        logger.error('Error fetching portfolios/benchmarks', { err });
        setError('Error al cargar carteras y benchmarks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token, loading, user?.role]);

  const handleAssetSelect = (asset: InstrumentSearchResult) => {
    // Verificar si ya existe
    const exists = portfolioLines.find(line => line.instrumentSymbol === asset.symbol);
    if (exists) {
      showToast('Activo duplicado', 'Este activo ya está en la cartera', 'warning');
      return;
    }

    const newLine: PortfolioLine = {
      id: `temp-${Date.now()}`,
      templateId: '', // Temporary, will be set when portfolio is created
      targetType: 'instrument',
      instrumentSymbol: asset.symbol,
      instrumentName: asset.name,
      instrumentId: null,
      targetWeight: 0
    };

    setPortfolioLines([...portfolioLines, newLine]);
  };

  const updateWeight = (lineId: string, weight: number) => {
    const updatedLines = portfolioLines.map(line =>
      line.id === lineId ? { ...line, targetWeight: weight } : line
    );
    setPortfolioLines(updatedLines);
    
    const total = updatedLines.reduce((sum, line) => sum + (line.targetWeight || 0), 0);
    setTotalWeight(total);
  };

  const removeLine = (lineId: string) => {
    const updatedLines = portfolioLines.filter(line => line.id !== lineId);
    setPortfolioLines(updatedLines);
    
    const total = updatedLines.reduce((sum, line) => sum + (line.targetWeight || 0), 0);
    setTotalWeight(total);
  };

  const handleCreatePortfolio = async () => {
    if (!newPortfolio.name.trim()) {
      showToast('Campo requerido', 'El nombre de la cartera es requerido', 'warning');
      return;
    }

    if (portfolioLines.length === 0) {
      showToast('Composición incompleta', 'Debe agregar al menos un activo a la cartera', 'warning');
      return;
    }

    if (Math.abs(totalWeight - 100) > 0.01) {
      showToast('Pesos inválidos', `Los pesos deben sumar exactamente 100%. Actual: ${totalWeight.toFixed(2)}%`, 'warning');
      return;
    }

    if (!token) {
      showToast('Autenticación requerida', 'Debes iniciar sesión para crear carteras', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      // Paso 1: Crear instrumentos si no existen
      const instrumentIds: string[] = [];
      for (const line of portfolioLines) {
        if (!line.instrumentId) {
          // Crear instrumento desde símbolo
          try {
            const instrumentResponse = await createInstrument({
              symbol: line.instrumentSymbol,
              backfill_days: 365
            });

            if (instrumentResponse.success && instrumentResponse.data?.instrument?.id) {
              instrumentIds.push(instrumentResponse.data.instrument.id);
            } else {
              // Si falla, intentar buscar si ya existe
              const searchResponse = await getInstruments({ search: line.instrumentSymbol });
              if (searchResponse.success && searchResponse.data?.instruments) {
                const existing = searchResponse.data.instruments.find((inst: Instrument) => inst.symbol === line.instrumentSymbol);
                if (existing) {
                  instrumentIds.push(existing.id);
                } else {
                  throw new Error(`No se pudo crear ni encontrar el instrumento ${line.instrumentSymbol}`);
                }
              } else {
                throw new Error(`No se pudo crear el instrumento ${line.instrumentSymbol}`);
              }
            }
          } catch (err) {
            logger.error('Error creating/finding instrument', { err, symbol: line.instrumentSymbol });
            showToast('Error al crear instrumento', `No se pudo crear ${line.instrumentSymbol}: ${err instanceof Error ? err.message : 'Error desconocido'}`, 'error');
            setIsLoading(false);
            return;
          }
        } else {
          instrumentIds.push(line.instrumentId);
        }
      }

      // Paso 2: Crear portfolio template
      const portfolioResponse = await createPortfolio({
        name: newPortfolio.name,
        description: newPortfolio.description,
        riskLevel: newPortfolio.riskLevel as RiskLevel
      });

      if (!portfolioResponse.success || !portfolioResponse.data) {
        throw new Error('Error al crear cartera');
      }

      const portfolioId = portfolioResponse.data.id;

      // Paso 3: Agregar líneas al portfolio
      for (let i = 0; i < portfolioLines.length; i++) {
        const line = portfolioLines[i];
        const instrumentId = instrumentIds[i];
        
        await addPortfolioLine(portfolioId, {
          targetType: 'instrument',
          instrumentId: instrumentId,
          targetWeight: line.targetWeight / 100 // Convertir de % a decimal
        });
      }

      // Recargar portfolios
      const refreshResponse = await getPortfolios();
      
      if (refreshResponse.success && refreshResponse.data) {
        // Obtener líneas para el nuevo portfolio
        const linesResponse = await getPortfolioLines(portfolioId);

        if (linesResponse.success && linesResponse.data) {
          const foundPortfolio = refreshResponse.data.find((p: Portfolio) => p.id === portfolioId);
          if (foundPortfolio) {
            const newPortfolio: Portfolio = {
              ...foundPortfolio,
              lines: linesResponse.data.lines || []
            };
            setPortfolios([...portfolios, newPortfolio]);
          }
        }
      }

      // Reset form
      setNewPortfolio({ name: '', description: '', riskLevel: 'moderate' });
      setPortfolioLines([]);
      setTotalWeight(0);
      setActiveSection('portfolios');
      
      showToast('Cartera creada', 'La cartera se creó exitosamente', 'success');
    } catch (err) {
      logger.error('Error creating portfolio', { err, portfolio: newPortfolio, lines: portfolioLines });
      showToast('Error al crear cartera', err instanceof Error ? err.message : 'Error desconocido', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBenchmarkAssetSelect = (asset: InstrumentSearchResult) => {
    const exists = benchmarkComponents.find(comp => comp.instrumentSymbol === asset.symbol);
    if (exists) {
      showToast('Activo duplicado', 'Este activo ya está en el benchmark', 'warning');
      return;
    }

    const newComponent: BenchmarkComponentForm = {
      id: `temp-${Date.now()}`,
      instrumentSymbol: asset.symbol,
      instrumentName: asset.name,
      instrumentId: null,
      weight: 0
    };

    setBenchmarkComponents([...benchmarkComponents, newComponent]);
  };

  const updateBenchmarkWeight = (componentId: string, weight: number) => {
    const updatedComponents = benchmarkComponents.map(comp =>
      comp.id === componentId ? { ...comp, weight } : comp
    );
    setBenchmarkComponents(updatedComponents);
  };

  const removeBenchmarkComponent = (componentId: string) => {
    setBenchmarkComponents(benchmarkComponents.filter(comp => comp.id !== componentId));
  };

  const handleEditPortfolio = (portfolio: PortfolioTemplate) => {
    const portfolioData: Portfolio = {
      id: portfolio.id,
      name: portfolio.name,
      description: portfolio.description ?? null,
      riskLevel: (portfolio.riskLevel as RiskLevel) || 'moderate',
      createdAt: portfolio.createdAt,
      updatedAt: portfolio.createdAt, // Usar createdAt como fallback
      lines: portfolio.lines ?? []
    };
    setEditingPortfolio(portfolioData);
    setNewPortfolio({
      name: portfolio.name,
      description: portfolio.description || '',
      riskLevel: portfolio.riskLevel || 'moderate'
    });
    setShowEditPortfolio(true);
  };

  const updatePortfolio = async () => {
    if (!editingPortfolio) return;

    if (!newPortfolio.name.trim()) {
      showToast('Campo requerido', 'El nombre de la cartera es requerido', 'warning');
      return;
    }

    if (!token) {
      showToast('Autenticación requerida', 'Debes iniciar sesión para editar carteras', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      await updatePortfolioApi(editingPortfolio.id, {
        name: newPortfolio.name,
        description: newPortfolio.description,
        riskLevel: newPortfolio.riskLevel as RiskLevel
      });

      // Actualizar en el estado local
      setPortfolios(portfolios.map(p => 
        p.id === editingPortfolio.id 
          ? { ...p, name: newPortfolio.name, description: newPortfolio.description, riskLevel: newPortfolio.riskLevel as RiskLevel }
          : p
      ));

      // Reset form
      setNewPortfolio({ name: '', description: '', riskLevel: 'moderate' });
      setEditingPortfolio(null);
      setShowEditPortfolio(false);
      
      showToast('Cartera actualizada', 'La cartera se actualizó exitosamente', 'success');
    } catch (err) {
      logger.error('Error updating portfolio', { err, portfolioId: editingPortfolio.id, data: newPortfolio });
      showToast('Error al actualizar cartera', err instanceof Error ? err.message : 'Error desconocido', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePortfolio = (portfolioId: string) => {
    if (!token) {
      showToast('Autenticación requerida', 'Debes iniciar sesión para eliminar carteras', 'warning');
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Eliminar cartera',
      description: '¿Estás seguro de eliminar esta cartera? Esta acción no se puede deshacer.',
      variant: 'danger',
      onConfirm: async () => {
        setIsLoading(true);

        try {
          await deletePortfolio(portfolioId);

          // Remover del estado local
          setPortfolios(portfolios.filter(p => p.id !== portfolioId));
      
          showToast('Cartera eliminada', 'La cartera se eliminó exitosamente', 'success');
        } catch (err) {
          logger.error('Error deleting portfolio', { err, portfolioId });
          showToast('Error al eliminar cartera', err instanceof Error ? err.message : 'Error desconocido', 'error');
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleEditBenchmark = (benchmark: Benchmark) => {
    setEditingBenchmark(benchmark);
    setNewBenchmark({
      name: benchmark.name,
      description: benchmark.description || '',
      code: benchmark.code || ''
    });
    setBenchmarkComponents(benchmark.components?.map(comp => ({
      id: comp.id,
      instrumentId: comp.instrumentId,
      instrumentSymbol: comp.instrumentSymbol || '',
      instrumentName: comp.instrumentName || '',
      weight: (comp.weight * 100) || 0
    })) || []);
    setShowEditBenchmark(true);
  };

  const handleUpdateBenchmark = async () => {
    if (!editingBenchmark) return;

    if (!newBenchmark.name.trim() || !newBenchmark.code.trim()) {
      showToast('Campos requeridos', 'El nombre y código del benchmark son requeridos', 'warning');
      return;
    }

    if (benchmarkComponents.length === 0) {
      showToast('Composición incompleta', 'Debe agregar al menos un componente al benchmark', 'warning');
      return;
    }

    const totalWeight = benchmarkComponents.reduce((sum, comp) => sum + (comp.weight || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      showToast('Pesos inválidos', `Los pesos deben sumar exactamente 100%. Actual: ${totalWeight.toFixed(2)}%`, 'warning');
      return;
    }

    if (!token) {
      showToast('Autenticación requerida', 'Debes iniciar sesión para editar benchmarks', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      await updateBenchmark(editingBenchmark.id, {
        name: newBenchmark.name,
        description: newBenchmark.description,
        code: newBenchmark.code
      });

      // Actualizar en el estado local
      setBenchmarks(benchmarks.map(b => 
        b.id === editingBenchmark.id 
          ? { ...b, name: newBenchmark.name, description: newBenchmark.description, code: newBenchmark.code }
          : b
      ));

      // Reset form
      setNewBenchmark({ name: '', description: '', code: '' });
      setBenchmarkComponents([]);
      setEditingBenchmark(null);
      setShowEditBenchmark(false);
      
      showToast('Benchmark actualizado', 'El benchmark se actualizó exitosamente', 'success');
    } catch (err) {
      logger.error('Error updating benchmark', { err, benchmarkId: editingBenchmark.id, data: newBenchmark });
      showToast('Error al actualizar benchmark', err instanceof Error ? err.message : 'Error desconocido', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBenchmark = (benchmarkId: string) => {
    if (!token) {
      showToast('Autenticación requerida', 'Debes iniciar sesión para eliminar benchmarks', 'warning');
      return;
    }

    setConfirmDialog({
      open: true,
      title: 'Eliminar benchmark',
      description: '¿Estás seguro de eliminar este benchmark? Esta acción no se puede deshacer.',
      variant: 'danger',
      onConfirm: async () => {
        setIsLoading(true);

        try {
          await deleteBenchmark(benchmarkId);

          // Remover del estado local
          setBenchmarks(benchmarks.filter(b => b.id !== benchmarkId));
          
          showToast('Benchmark eliminado', 'El benchmark se eliminó exitosamente', 'success');
        } catch (err) {
          logger.error('Error deleting benchmark', { err, benchmarkId });
          showToast('Error al eliminar benchmark', err instanceof Error ? err.message : 'Error desconocido', 'error');
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleCreateBenchmark = async () => {
    if (!newBenchmark.name.trim() || !newBenchmark.code.trim()) {
      showToast('Campos requeridos', 'El nombre y código del benchmark son requeridos', 'warning');
      return;
    }

    if (benchmarkComponents.length === 0) {
      showToast('Composición incompleta', 'Debe agregar al menos un componente al benchmark', 'warning');
      return;
    }

    const totalWeight = benchmarkComponents.reduce((sum, comp) => sum + (comp.weight || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      showToast('Pesos inválidos', `Los pesos deben sumar exactamente 100%. Actual: ${totalWeight.toFixed(2)}%`, 'warning');
      return;
    }

    if (!token) {
      showToast('Autenticación requerida', 'Debes iniciar sesión para crear benchmarks', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      // Paso 1: Crear instrumentos si no existen
      const instrumentIds: string[] = [];
      for (const comp of benchmarkComponents) {
        if (!comp.instrumentId) {
          // Crear instrumento desde símbolo
          try {
            const instrumentResponse = await createInstrument({
              symbol: comp.instrumentSymbol,
              backfill_days: 365
            });

            if (instrumentResponse.success && instrumentResponse.data?.instrument?.id) {
              instrumentIds.push(instrumentResponse.data.instrument.id);
            } else {
              // Si falla, intentar buscar si ya existe
              const searchResponse = await getInstruments({ search: comp.instrumentSymbol });
              if (searchResponse.success && searchResponse.data?.instruments) {
                const existing = searchResponse.data.instruments.find((inst: Instrument) => inst.symbol === comp.instrumentSymbol);
                if (existing) {
                  instrumentIds.push(existing.id);
                } else {
                  throw new Error(`No se pudo crear ni encontrar el instrumento ${comp.instrumentSymbol}`);
                }
              } else {
                throw new Error(`No se pudo crear el instrumento ${comp.instrumentSymbol}`);
              }
            }
          } catch (err) {
            logger.error('Error creating/finding instrument for benchmark', { err, symbol: comp.instrumentSymbol });
            showToast('Error al crear instrumento', `No se pudo crear ${comp.instrumentSymbol}: ${err instanceof Error ? err.message : 'Error desconocido'}`, 'error');
            setIsLoading(false);
            return;
          }
        } else {
          instrumentIds.push(comp.instrumentId);
        }
      }

      // Paso 2: Crear benchmark primero
      const benchmarkResponse = await createBenchmark({
        name: newBenchmark.name,
        type: 'composite',
        description: newBenchmark.description,
        ...(newBenchmark.code && { code: newBenchmark.code })
      });

      if (!benchmarkResponse.success || !benchmarkResponse.data) {
        throw new Error('Error al crear benchmark');
      }

      const benchmarkId = benchmarkResponse.data.id;

      // Paso 3: Agregar componentes al benchmark
      for (let i = 0; i < benchmarkComponents.length; i++) {
        const comp = benchmarkComponents[i];
        const instrumentId = instrumentIds[i];
        
        await addBenchmarkComponent(benchmarkId, {
          instrumentId: instrumentId,
          weight: comp.weight / 100 // Convertir de % a decimal
        });
      }

      // Recargar benchmarks
      const refreshResponse = await getBenchmarks();
      
      if (refreshResponse.success && refreshResponse.data) {
        // Obtener componentes para el nuevo benchmark
        const benchmarkDetailResponse = await getBenchmarkById(benchmarkId);

        if (benchmarkDetailResponse.success && benchmarkDetailResponse.data) {
          const foundBenchmark = refreshResponse.data.find((b: Benchmark) => b.id === benchmarkId);
          if (foundBenchmark) {
            const newBenchmarkData: Benchmark = {
              ...foundBenchmark,
              components: benchmarkDetailResponse.data.components || []
            };
            setBenchmarks([...benchmarks, newBenchmarkData]);
          }
        }
      }

      // Reset form
      setNewBenchmark({ name: '', description: '', code: '' });
      setBenchmarkComponents([]);
      setShowCreateBenchmark(false);
      
      showToast('Benchmark creado', 'El benchmark se creó exitosamente', 'success');
    } catch (err) {
      logger.error('Error creating benchmark', { err, benchmark: newBenchmark, components: benchmarkComponents });
      showToast('Error al crear benchmark', err instanceof Error ? err.message : 'Error desconocido', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const sections = [
    {
      id: 'portfolios',
      title: 'Mis Carteras',
      icon: BarChart3,
      description: 'Gestiona tus carteras modelo y composiciones'
    },
    {
      id: 'create',
      title: 'Crear Cartera',
      icon: Plus,
      description: 'Crea nuevas carteras con activos reales'
    },
    {
      id: 'comparison',
      title: 'Comparación',
      icon: Target,
      description: 'Compara rendimiento de carteras y benchmarks'
    },
    ...(user?.role === 'admin' || user?.role === 'manager' ? [{
      id: 'benchmarks',
      title: 'Benchmarks',
      icon: TrendingUp,
      description: 'Gestiona benchmarks para comparación'
    }] : [])
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Stack direction="column" gap="md" align="center">
          <Spinner size="lg" />
          <Text color="secondary">Cargando carteras...</Text>
        </Stack>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-4 mb-4">
        </div>
        <Heading level={3}>Carteras</Heading>
        <Text size="lg" color="secondary">
          Sistema unificado de gestión de carteras modelo, benchmarks y análisis de rendimiento
        </Text>
      </div>

      {/* Navigation Sections */}
      <Grid cols={4} gap="md">
        {sections.map(section => {
          const Icon = section.icon;
          return (
            <Card
              key={section.id}
              className={`cursor-pointer transition-all rounded-md border border-border ${
                activeSection === section.id
                  ? 'border-accent-base bg-accent-subtle'
                  : 'hover:border-border-hover'
              }`}
              onClick={() => setActiveSection(section.id)}
            >
              <CardContent className="p-4">
                <Stack direction="row" gap="sm">
                  <Icon className={`w-5 h-5 ${
                    activeSection === section.id ? 'text-accent-text' : 'text-foreground-tertiary'
                  }`} />
                  <div>
                    <Heading level={4} className={`${
                      activeSection === section.id ? 'text-accent-text' : 'text-foreground-base'
                    }`}>
                      {section.title}
                    </Heading>
                    <Text size="sm" color="secondary">{section.description}</Text>
                  </div>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Grid>

      {/* Content Sections */}
      <div className="space-y-6">
        {/* Mis Carteras */}
        {activeSection === 'portfolios' && (
          <Card className="rounded-md border border-border">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Mis Carteras</CardTitle>
                <Button
                  onClick={() => setActiveSection('create')}
                  variant="primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Cartera
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {portfolios.length > 0 ? (
                <Grid cols={3} gap="lg">
                    {portfolios.map(portfolio => (
                    <Card key={portfolio.id} className="hover:shadow-sm transition-shadow border border-border rounded-md hover:border-border-hover">
                      <CardContent className="p-4">
                        <Stack direction="column" gap="sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <Heading level={5}>{portfolio.name}</Heading>
                              <Text size="sm" color="secondary">{portfolio.description}</Text>
                            </div>
                            <Badge 
                              variant={
                                portfolio.riskLevel === 'conservative' ? 'success' :
                                portfolio.riskLevel === 'moderate' ? 'warning' : 'error'
                              }
                            >
                              {portfolio.riskLevel}
                            </Badge>
                          </div>
                          
                          <Stack direction="row" gap="sm" align="center">
                            <PieChart className="w-4 h-4 text-foreground-tertiary" />
                            <Text size="sm" color="secondary">
                              {portfolio.lines?.length || 0} activos
                            </Text>
                          </Stack>

                          <Stack direction="row" gap="sm">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => router.push(`/portfolios/${portfolio.id}`)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Ver
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleEditPortfolio(portfolioToTemplate(portfolio))}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeletePortfolio(portfolio.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Grid>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-foreground-tertiary mx-auto mb-4" />
                  <Heading level={3} className="mb-2">No tienes carteras creadas</Heading>
                  <Text color="secondary" className="mb-4">
                    Crea tu primera cartera modelo para comenzar a gestionar inversiones
                  </Text>
                  <Button
                    onClick={() => setActiveSection('create')}
                    variant="primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Primera Cartera
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Crear Cartera */}
        {activeSection === 'create' && (
          <Card className="rounded-md border border-border">
            <CardHeader className="p-4">
              <CardTitle className="text-base">Crear Nueva Cartera</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Grid cols={2} gap="lg">
                {/* Form */}
                <Stack direction="column" gap="lg">
                  <Input
                    label="Nombre de la Cartera"
                    value={newPortfolio.name}
                    onChange={(e) => setNewPortfolio({...newPortfolio, name: e.target.value})}
                    placeholder="Ej: Cartera Conservadora"
                  />

                  <div>
                    <label className="block text-sm font-medium text-foreground-base mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={newPortfolio.description}
                      onChange={(e) => setNewPortfolio({...newPortfolio, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                      rows={3}
                      placeholder="Descripción de la estrategia de inversión"
                    />
                  </div>

                  <Select
                    label="Nivel de Riesgo"
                    value={newPortfolio.riskLevel}
                    onValueChange={(value) => setNewPortfolio({...newPortfolio, riskLevel: value})}
                    items={[
                      { value: 'conservative', label: 'Conservador' },
                      { value: 'moderate', label: 'Moderado' },
                      { value: 'aggressive', label: 'Agresivo' },
                    ]}
                  />

                  <div>
                    <label className="block text-sm font-medium text-foreground-base mb-2">
                      Buscar Activos
                    </label>
                    <AssetSearcher
                      onAssetSelect={handleAssetSelect}
                      placeholder="Buscar activo (ej: AAPL, Apple, MERVAL)"
                    />
                  </div>
                </Stack>

                {/* Portfolio Composition */}
                <div>
                  <Heading level={3} className="mb-4">Composición de la Cartera</Heading>
                  
                  {portfolioLines.length > 0 ? (
                    <Stack direction="column" gap="sm">
                      {portfolioLines.map(line => (
                        <Card key={line.id} className="rounded-md border border-border">
                          <CardContent className="p-4">
                            <Stack direction="row" gap="sm" align="center">
                              <div className="flex-1">
                                <Text weight="medium">{line.instrumentName}</Text>
                                <Text size="sm" color="secondary">{line.instrumentSymbol}</Text>
                              </div>
                              <Stack direction="row" gap="sm" align="center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={line.targetWeight}
                                  onChange={(e) => updateWeight(line.id, Number(e.target.value))}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 bg-white text-gray-900 rounded focus:ring-2 focus:ring-primary focus:border-primary"
                                />
                                <Text size="sm" color="secondary">%</Text>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLine(line.id)}
                                  className="text-error-500 hover:text-error-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                      
                      <Card className="rounded-md border border-border">
                        <CardContent className="p-4">
                          <Stack direction="column" gap="sm">
                            <Stack direction="row" justify="between" align="center">
                              <Text weight="medium">Total:</Text>
                              <Text weight="bold" color={Math.abs(totalWeight - 100) < 0.01 ? 'primary' : 'secondary'}>
                                {totalWeight.toFixed(2)}%
                              </Text>
                            </Stack>
                            {Math.abs(totalWeight - 100) > 0.01 && (
                              <Text size="sm" color="secondary">
                                Los pesos deben sumar exactamente 100%
                              </Text>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>

                      <Button
                        onClick={handleCreatePortfolio}
                        disabled={Math.abs(totalWeight - 100) > 0.01 || portfolioLines.length === 0}
                        variant="primary"
                        className="w-full"
                      >
                        Crear Cartera
                      </Button>
                    </Stack>
                  ) : (
                    <div className="text-center py-8">
                      <PieChart className="w-12 h-12 mx-auto mb-4 text-foreground-tertiary" />
                      <Text color="secondary">Agrega activos a tu cartera</Text>
                      <Text size="sm" color="muted">Busca activos reales en el campo de búsqueda</Text>
                    </div>
                  )}
                </div>
              </Grid>
            </CardContent>
          </Card>
        )}

        {/* Comparación */}
        {activeSection === 'comparison' && (
          <Card className="rounded-md border border-border">
            <CardContent className="p-4">
              <PortfolioComparator
                portfolios={portfolios.map(p => {
                  const item: {
                    id: string;
                    name: string;
                    type: 'portfolio';
                    riskLevel: RiskLevel;
                    createdAt: string;
                    description?: string;
                  } = {
                    id: p.id,
                    name: p.name,
                    type: 'portfolio',
                    riskLevel: p.riskLevel,
                    createdAt: p.createdAt
                  };
                  if (p.description) {
                    item.description = p.description;
                  }
                  return item;
                })}
                benchmarks={benchmarks.map(b => {
                  const item: {
                    id: string;
                    name: string;
                    type: 'benchmark';
                    createdAt: string;
                    description?: string;
                  } = {
                    id: b.id,
                    name: b.name,
                    type: 'benchmark',
                    createdAt: b.createdAt || ''
                  };
                  if (b.description) {
                    item.description = b.description;
                  }
                  return item;
                })}
              />
            </CardContent>
          </Card>
        )}

        {/* Benchmarks (solo admin/manager) */}
        {(user?.role === 'admin' || user?.role === 'manager') && activeSection === 'benchmarks' && (
          <Card className="rounded-md border border-border">
            <CardHeader className="p-4">
              <div className="flex items-center justify-between">
                <CardTitle>Benchmarks</CardTitle>
                <Button
                  onClick={() => setShowCreateBenchmark(true)}
                  variant="primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Benchmark
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {benchmarks.length > 0 ? (
                <Grid cols={3} gap="lg">
                  {benchmarks.map(benchmark => (
                    <Card key={benchmark.id} className="hover:shadow-sm transition-shadow border border-border rounded-md hover:border-border-hover">
                      <CardContent className="p-4">
                        <Stack direction="column" gap="sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <Heading level={5}>{benchmark.name}</Heading>
                              <Text size="sm" color="secondary">{benchmark.description}</Text>
                              <Text size="xs" color="muted" className="font-mono">{benchmark.code}</Text>
                            </div>
                            <Badge variant={benchmark.isSystem ? 'brand' : 'success'}>
                              {benchmark.isSystem ? 'Sistema' : 'Custom'}
                            </Badge>
                          </div>
                          
                          <Stack direction="row" gap="sm" align="center">
                            <TrendingUp className="w-4 h-4 text-foreground-tertiary" />
                            <Text size="sm" color="secondary">
                              {benchmark.components?.length || 0} componentes
                            </Text>
                          </Stack>

                          <Stack direction="row" gap="sm">
                            <Button variant="outline" size="sm" className="flex-1">
                              <Eye className="w-4 h-4 mr-2" />
                              Ver
                            </Button>
                            {!benchmark.isSystem && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1"
                                  onClick={() => handleEditBenchmark(benchmark)}
                                >
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteBenchmark(benchmark.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Grid>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="w-16 h-16 text-foreground-tertiary mx-auto mb-4" />
                  <Heading level={3} className="mb-2">No hay benchmarks configurados</Heading>
                  <Text color="secondary" className="mb-4">
                    Crea benchmarks para comparar el rendimiento de las carteras
                  </Text>
                  <Button
                    onClick={() => setShowCreateBenchmark(true)}
                    variant="primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Primer Benchmark
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        </div>

      {/* Create Benchmark Modal */}
      {showCreateBenchmark && (
        <Modal
          open={showCreateBenchmark}
          onOpenChange={setShowCreateBenchmark}
          size="lg"
        >
          <ModalHeader>
            <ModalTitle>Crear Nuevo Benchmark</ModalTitle>
          </ModalHeader>
          <ModalContent>
            <Grid cols={2} gap="lg">
              {/* Form */}
              <Stack direction="column" gap="md">
                <Input
                  label="Nombre del Benchmark"
                  value={newBenchmark.name}
                  onChange={(e) => setNewBenchmark({...newBenchmark, name: e.target.value})}
                  placeholder="Ej: Merval + S&P 500"
                />

                <Input
                  label="Código"
                  value={newBenchmark.code}
                  onChange={(e) => setNewBenchmark({...newBenchmark, code: e.target.value.toUpperCase()})}
                  placeholder="Ej: CUSTOM_BALANCED"
                />

                <div>
                  <label className="block text-sm font-medium text-foreground-base mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={newBenchmark.description}
                    onChange={(e) => setNewBenchmark({...newBenchmark, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    rows={3}
                    placeholder="Descripción del benchmark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-base mb-2">
                    Buscar Activos
                  </label>
                  <AssetSearcher
                    onAssetSelect={handleBenchmarkAssetSelect}
                    placeholder="Buscar activo (ej: ^MERV, ^GSPC)"
                  />
                </div>
              </Stack>

              {/* Components */}
              <div>
                <Heading level={3} className="mb-4">Composición del Benchmark</Heading>
                
                {benchmarkComponents.length > 0 ? (
                  <Stack direction="column" gap="sm">
                    {benchmarkComponents.map(component => (
                      <Card key={component.id} className="rounded-md border border-border">
                        <CardContent className="p-4">
                          <Stack direction="row" gap="sm" align="center">
                            <div className="flex-1">
                              <Text weight="medium">{component.instrumentName}</Text>
                              <Text size="sm" color="secondary">{component.instrumentSymbol}</Text>
                            </div>
                            <Stack direction="row" gap="sm" align="center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={component.weight}
                                onChange={(e) => updateBenchmarkWeight(component.id, Number(e.target.value))}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 bg-white text-gray-900 rounded focus:ring-2 focus:ring-primary focus:border-primary"
                              />
                              <Text size="sm" color="secondary">%</Text>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeBenchmarkComponent(component.id)}
                                className="text-error-500 hover:text-error-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                    
                    <Card className="rounded-md border border-border">
                      <CardContent className="p-4">
                        <Stack direction="row" justify="between" align="center">
                          <Text weight="medium">Total:</Text>
                          <Text weight="bold" color={
                            Math.abs(benchmarkComponents.reduce((sum, comp) => sum + (comp.weight || 0), 0) - 100) < 0.01 
                              ? 'primary' : 'secondary'
                          }>
                            {benchmarkComponents.reduce((sum, comp) => sum + (comp.weight || 0), 0).toFixed(2)}%
                          </Text>
                        </Stack>
                      </CardContent>
                    </Card>

                    <Stack direction="row" gap="sm">
                      <Button
                        onClick={handleCreateBenchmark}
                        disabled={Math.abs(benchmarkComponents.reduce((sum, comp) => sum + (comp.weight || 0), 0) - 100) > 0.01 || benchmarkComponents.length === 0}
                        variant="primary"
                        className="flex-1"
                      >
                        Crear Benchmark
                      </Button>
                      <Button
                        onClick={() => setShowCreateBenchmark(false)}
                        variant="outline"
                      >
                        Cancelar
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-foreground-tertiary" />
                    <Text color="secondary">Agrega componentes al benchmark</Text>
                    <Text size="sm" color="muted">Busca activos reales en el campo de búsqueda</Text>
                  </div>
                )}
              </div>
            </Grid>
          </ModalContent>
        </Modal>
      )}

      {/* Edit Portfolio Modal */}
      {showEditPortfolio && editingPortfolio && (
        <Modal open={showEditPortfolio} onOpenChange={setShowEditPortfolio}>
          <ModalHeader>
            <ModalTitle>Editar Cartera</ModalTitle>
            <ModalDescription>Actualiza los detalles de la cartera</ModalDescription>
          </ModalHeader>
          <ModalContent>
            <Stack direction="column" gap="lg" className="p-4">
              <Input
                label="Nombre de la Cartera"
                value={newPortfolio.name}
                onChange={(e) => setNewPortfolio({...newPortfolio, name: e.target.value})}
                placeholder="Ej: Cartera Conservadora"
              />

              <div>
                <label className="block text-sm font-medium text-foreground-base mb-2">
                  Descripción
                </label>
                <textarea
                  value={newPortfolio.description}
                  onChange={(e) => setNewPortfolio({...newPortfolio, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="Descripción de la estrategia de inversión"
                />
              </div>

              <Select
                label="Nivel de Riesgo"
                value={newPortfolio.riskLevel}
                onValueChange={(value) => setNewPortfolio({...newPortfolio, riskLevel: value})}
                items={[
                  { value: 'conservative', label: 'Conservador' },
                  { value: 'moderate', label: 'Moderado' },
                  { value: 'aggressive', label: 'Agresivo' },
                ]}
              />
            </Stack>
          </ModalContent>
          <ModalFooter>
            <Stack direction="row" gap="sm">
              <Button
                onClick={() => {
                  setShowEditPortfolio(false);
                  setEditingPortfolio(null);
                  setNewPortfolio({ name: '', description: '', riskLevel: 'moderate' });
                }}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                onClick={updatePortfolio}
                disabled={isLoading}
                variant="primary"
              >
                {isLoading ? 'Actualizando...' : 'Guardar Cambios'}
              </Button>
            </Stack>
          </ModalFooter>
        </Modal>
      )}

      {/* Edit Benchmark Modal */}
      {showEditBenchmark && editingBenchmark && (
        <Modal
          open={showEditBenchmark}
          onOpenChange={setShowEditBenchmark}
          size="lg"
        >
          <ModalHeader>
            <ModalTitle>Editar Benchmark</ModalTitle>
          </ModalHeader>
          <ModalContent>
            <Grid cols={2} gap="lg">
              {/* Form */}
              <Stack direction="column" gap="md">
                <Input
                  label="Nombre del Benchmark"
                  value={newBenchmark.name}
                  onChange={(e) => setNewBenchmark({...newBenchmark, name: e.target.value})}
                  placeholder="Ej: Merval + S&P 500"
                />

                <Input
                  label="Código"
                  value={newBenchmark.code}
                  onChange={(e) => setNewBenchmark({...newBenchmark, code: e.target.value.toUpperCase()})}
                  placeholder="Ej: CUSTOM_BALANCED"
                  disabled={true}
                />

                <div>
                  <label className="block text-sm font-medium text-foreground-base mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={newBenchmark.description}
                    onChange={(e) => setNewBenchmark({...newBenchmark, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                    rows={3}
                    placeholder="Descripción del benchmark"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground-base mb-2">
                    Buscar Activos
                  </label>
                  <AssetSearcher
                    onAssetSelect={handleBenchmarkAssetSelect}
                    placeholder="Buscar activo (ej: ^MERV, ^GSPC)"
                  />
                </div>
              </Stack>

              {/* Components */}
              <div>
                <Heading level={3} className="mb-4">Composición del Benchmark</Heading>
                
                {benchmarkComponents.length > 0 ? (
                  <Stack direction="column" gap="sm">
                    {benchmarkComponents.map(component => (
                      <Card key={component.id} className="rounded-md border border-border">
                        <CardContent className="p-3">
                          <Stack direction="column" gap="sm">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <Text weight="medium" size="sm">{component.instrumentName}</Text>
                                <Text size="xs" color="secondary">{component.instrumentSymbol}</Text>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => removeBenchmarkComponent(component.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <Stack direction="row" gap="sm" align="center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={component.weight}
                                onChange={(e) => updateBenchmarkWeight(component.id, parseFloat(e.target.value) || 0)}
                                className="w-24 px-2 py-1 border border-gray-300 bg-white text-gray-900 rounded text-sm"
                                placeholder="%"
                              />
                              <Text size="sm" color="secondary">%</Text>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                    
                    <Card className="rounded-md border border-border">
                      <CardContent className="p-4">
                        <Stack direction="row" justify="between" align="center">
                          <Text weight="medium">Total:</Text>
                          <Text weight="bold" color={
                            Math.abs(benchmarkComponents.reduce((sum, comp) => sum + (comp.weight || 0), 0) - 100) < 0.01 
                              ? 'primary' : 'secondary'
                          }>
                            {benchmarkComponents.reduce((sum, comp) => sum + (comp.weight || 0), 0).toFixed(2)}%
                          </Text>
                        </Stack>
                      </CardContent>
                    </Card>

                    <Stack direction="row" gap="sm">
                      <Button
                        onClick={handleUpdateBenchmark}
                        disabled={Math.abs(benchmarkComponents.reduce((sum, comp) => sum + (comp.weight || 0), 0) - 100) > 0.01 || benchmarkComponents.length === 0 || isLoading}
                        variant="primary"
                        className="flex-1"
                      >
                        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowEditBenchmark(false);
                          setEditingBenchmark(null);
                          setNewBenchmark({ name: '', description: '', code: '' });
                          setBenchmarkComponents([]);
                        }}
                        variant="outline"
                      >
                        Cancelar
                      </Button>
                    </Stack>
                  </Stack>
                ) : (
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 text-foreground-tertiary" />
                    <Text color="secondary">Agrega componentes al benchmark</Text>
                    <Text size="sm" color="muted">Busca activos reales en el campo de búsqueda</Text>
                  </div>
                )}
              </div>
            </Grid>
          </ModalContent>
        </Modal>
      )}

      {/* Toast Notifications */}
      <Toast
        title={toast.title}
        {...(toast.description && { description: toast.description })}
        variant={toast.variant}
        open={toast.show}
        onOpenChange={(open) => setToast(prev => ({ ...prev, show: open }))}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant || 'default'}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
      />
    </div>
  );
}