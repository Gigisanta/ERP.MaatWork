'use client';

import { useState, useEffect } from 'react';
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
import AssetSearcher from '../components/AssetSearcher';
import PortfolioComparator from '../components/PortfolioComparator';
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

interface PortfolioLine {
  id: string;
  instrumentId: string;
  instrumentSymbol: string;
  instrumentName: string;
  targetWeight: number;
}

interface Benchmark {
  id: string;
  name: string;
  description: string;
  code: string;
  isSystem: boolean;
  components?: BenchmarkComponent[];
}

interface BenchmarkComponent {
  id: string;
  instrumentId: string;
  instrumentSymbol: string;
  weight: number;
}

export default function PortfoliosPage() {
  const { user, token, loading } = useRequireAuth();
  const router = useRouter(); // AI_DECISION: Use Next.js router instead of window.location
  const [activeSection, setActiveSection] = useState<string>('portfolios');
  const [portfolios, setPortfolios] = useState<PortfolioTemplate[]>([]);
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
  const [portfolioLines, setPortfolioLines] = useState<any[]>([]);
  const [totalWeight, setTotalWeight] = useState(0);

  // Estados para editar carteras
  const [editingPortfolio, setEditingPortfolio] = useState<PortfolioTemplate | null>(null);
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
  const [benchmarkComponents, setBenchmarkComponents] = useState<any[]>([]);

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

  const showToast = (title: string, description?: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ show: true, title, description, variant });
  };

  // Obtener datos reales desde API
  useEffect(() => {
    const fetchData = async () => {
      if (!token || loading) return;
      
      setIsLoading(true);
      setError(null);
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      try {
        // Fetch portfolios
        const portfoliosResponse = await fetch(`${apiUrl}/v1/portfolios/templates`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (portfoliosResponse.ok) {
          const portfoliosData = await portfoliosResponse.json();
          if (portfoliosData.success && portfoliosData.data) {
            // Obtener líneas para TODOS los portfolios en una sola request (batch)
            const portfolioIds = portfoliosData.data.map((p: any) => p.id);
            
            if (portfolioIds.length > 0) {
              try {
                const linesBatchResponse = await fetch(
                  `${apiUrl}/v1/portfolios/templates/lines/batch?ids=${portfolioIds.join(',')}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  }
                );

                if (linesBatchResponse.ok) {
                  const linesBatchData = await linesBatchResponse.json();
                  const linesByTemplate = linesBatchData.data || {};

                  // Agregar líneas a cada portfolio
                  const portfoliosWithLines = portfoliosData.data.map((portfolio: any) => ({
                    ...portfolio,
                    lines: linesByTemplate[portfolio.id] || []
                  }));

                  setPortfolios(portfoliosWithLines);
                } else {
                  // Fallback: portfolios sin líneas
                  setPortfolios(portfoliosData.data.map((p: any) => ({ ...p, lines: [] })));
                }
              } catch (err) {
                console.error('Error fetching portfolio lines batch:', err);
                setPortfolios(portfoliosData.data.map((p: any) => ({ ...p, lines: [] })));
              }
            } else {
              setPortfolios([]);
            }
          }
        }

        // Fetch benchmarks (solo si es admin/manager)
        if (user?.role === 'admin' || user?.role === 'manager') {
          const benchmarksResponse = await fetch(`${apiUrl}/v1/benchmarks`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (benchmarksResponse.ok) {
            const benchmarksData = await benchmarksResponse.json();
            if (benchmarksData.success && benchmarksData.data) {
              // Obtener componentes para TODOS los benchmarks en una sola request (batch)
              const benchmarkIds = benchmarksData.data.map((b: any) => b.id);

              if (benchmarkIds.length > 0) {
                try {
                  const componentsBatchResponse = await fetch(
                    `${apiUrl}/v1/benchmarks/components/batch?ids=${benchmarkIds.join(',')}`,
                    {
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    }
                  );

                  if (componentsBatchResponse.ok) {
                    const componentsBatchData = await componentsBatchResponse.json();
                    const componentsByBenchmark = componentsBatchData.data || {};

                    // Agregar componentes a cada benchmark
                    const benchmarksWithComponents = benchmarksData.data.map((benchmark: any) => ({
                      ...benchmark,
                      components: componentsByBenchmark[benchmark.id] || []
                    }));

                    setBenchmarks(benchmarksWithComponents);
                  } else {
                    // Fallback: benchmarks sin componentes
                    setBenchmarks(benchmarksData.data.map((b: any) => ({ ...b, components: [] })));
                  }
                } catch (err) {
                  console.error('Error fetching benchmark components batch:', err);
                  setBenchmarks(benchmarksData.data.map((b: any) => ({ ...b, components: [] })));
                }
              } else {
                setBenchmarks([]);
              }
            }
          }
        }

      } catch (err) {
        console.error('Error fetching portfolios/benchmarks:', err);
        setError('Error al cargar carteras y benchmarks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [token, loading, user?.role]);

  const handleAssetSelect = (asset: any) => {
    // Verificar si ya existe
    const exists = portfolioLines.find(line => line.instrumentSymbol === asset.symbol);
    if (exists) {
      showToast('Activo duplicado', 'Este activo ya está en la cartera', 'warning');
      return;
    }

    const newLine = {
      id: `temp-${Date.now()}`,
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

  const createPortfolio = async () => {
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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      // Paso 1: Crear instrumentos si no existen
      const instrumentIds: string[] = [];
      for (const line of portfolioLines) {
        if (!line.instrumentId) {
          // Crear instrumento desde símbolo
          try {
            const instrumentResponse = await fetch(`${apiUrl}/v1/instruments`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                symbol: line.instrumentSymbol,
                backfill_days: 365
              })
            });

            if (instrumentResponse.ok) {
              const instrumentData = await instrumentResponse.json();
              instrumentIds.push(instrumentData.data.instrument.id);
            } else {
              // Si falla, intentar buscar si ya existe
              const searchResponse = await fetch(`${apiUrl}/v1/instruments?search=${line.instrumentSymbol}`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                const existing = searchData.data.instruments.find((inst: any) => inst.symbol === line.instrumentSymbol);
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
            showToast('Error al crear instrumento', `No se pudo crear ${line.instrumentSymbol}: ${err instanceof Error ? err.message : 'Error desconocido'}`, 'error');
            setIsLoading(false);
            return;
          }
        } else {
          instrumentIds.push(line.instrumentId);
        }
      }

      // Paso 2: Crear portfolio template
      const portfolioResponse = await fetch(`${apiUrl}/v1/portfolios/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newPortfolio.name,
          description: newPortfolio.description,
          riskLevel: newPortfolio.riskLevel
        })
      });

      if (!portfolioResponse.ok) {
        const errorData = await portfolioResponse.json();
        throw new Error(errorData.error || 'Error al crear cartera');
      }

      const portfolioData = await portfolioResponse.json();
      const portfolioId = portfolioData.data.id;

      // Paso 3: Agregar líneas al portfolio
      for (let i = 0; i < portfolioLines.length; i++) {
        const line = portfolioLines[i];
        const instrumentId = instrumentIds[i];
        
        const lineResponse = await fetch(`${apiUrl}/v1/portfolios/templates/${portfolioId}/lines`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            targetType: 'instrument',
            instrumentId: instrumentId,
            targetWeight: line.targetWeight / 100 // Convertir de % a decimal
          })
        });

        if (!lineResponse.ok) {
          throw new Error(`Error al agregar línea ${line.instrumentSymbol}`);
        }
      }

      // Recargar portfolios
      const refreshResponse = await fetch(`${apiUrl}/v1/portfolios/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.success && refreshData.data) {
          // Obtener líneas para el nuevo portfolio
          const linesResponse = await fetch(`${apiUrl}/v1/portfolios/templates/${portfolioId}/lines`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (linesResponse.ok) {
            const linesData = await linesResponse.json();
            const newPortfolio = {
              ...refreshData.data.find((p: any) => p.id === portfolioId),
              lines: linesData.data?.lines || []
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
      console.error('Error creating portfolio:', err);
      showToast('Error al crear cartera', err instanceof Error ? err.message : 'Error desconocido', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBenchmarkAssetSelect = (asset: any) => {
    const exists = benchmarkComponents.find(comp => comp.instrumentSymbol === asset.symbol);
    if (exists) {
      showToast('Activo duplicado', 'Este activo ya está en el benchmark', 'warning');
      return;
    }

    const newComponent = {
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
    setEditingPortfolio(portfolio);
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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      const response = await fetch(`${apiUrl}/v1/portfolios/templates/${editingPortfolio.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newPortfolio.name,
          description: newPortfolio.description,
          riskLevel: newPortfolio.riskLevel
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar cartera');
      }

      // Actualizar en el estado local
      setPortfolios(portfolios.map(p => 
        p.id === editingPortfolio.id 
          ? { ...p, name: newPortfolio.name, description: newPortfolio.description, riskLevel: newPortfolio.riskLevel }
          : p
      ));

      // Reset form
      setNewPortfolio({ name: '', description: '', riskLevel: 'moderate' });
      setEditingPortfolio(null);
      setShowEditPortfolio(false);
      
      showToast('Cartera actualizada', 'La cartera se actualizó exitosamente', 'success');
    } catch (err) {
      console.error('Error updating portfolio:', err);
      showToast('Error al actualizar cartera', err instanceof Error ? err.message : 'Error desconocido', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePortfolio = async (portfolioId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta cartera? Esta acción no se puede deshacer.')) {
      return;
    }

    if (!token) {
      showToast('Autenticación requerida', 'Debes iniciar sesión para eliminar carteras', 'warning');
      return;
    }

    setIsLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      const response = await fetch(`${apiUrl}/v1/portfolios/templates/${portfolioId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar cartera');
      }

      // Remover del estado local
      setPortfolios(portfolios.filter(p => p.id !== portfolioId));
      
      showToast('Cartera eliminada', 'La cartera se eliminó exitosamente', 'success');
    } catch (err) {
      console.error('Error deleting portfolio:', err);
      showToast('Error al eliminar cartera', err instanceof Error ? err.message : 'Error desconocido', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditBenchmark = (benchmark: Benchmark) => {
    setEditingBenchmark(benchmark);
    setNewBenchmark({
      name: benchmark.name,
      description: benchmark.description || '',
      code: benchmark.code
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

  const updateBenchmark = async () => {
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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      const response = await fetch(`${apiUrl}/v1/benchmarks/${editingBenchmark.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newBenchmark.name,
          description: newBenchmark.description,
          code: newBenchmark.code
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar benchmark');
      }

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
      console.error('Error updating benchmark:', err);
      showToast('Error al actualizar benchmark', err instanceof Error ? err.message : 'Error desconocido', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBenchmark = async (benchmarkId: string) => {
    if (!confirm('¿Estás seguro de eliminar este benchmark? Esta acción no se puede deshacer.')) {
      return;
    }

    if (!token) {
      showToast('Autenticación requerida', 'Debes iniciar sesión para eliminar benchmarks', 'warning');
      return;
    }

    setIsLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      const response = await fetch(`${apiUrl}/v1/benchmarks/${benchmarkId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar benchmark');
      }

      // Remover del estado local
      setBenchmarks(benchmarks.filter(b => b.id !== benchmarkId));
      
      showToast('Benchmark eliminado', 'El benchmark se eliminó exitosamente', 'success');
    } catch (err) {
      console.error('Error deleting benchmark:', err);
      showToast('Error al eliminar benchmark', err instanceof Error ? err.message : 'Error desconocido', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const createBenchmark = async () => {
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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    try {
      // Paso 1: Crear instrumentos si no existen
      const instrumentIds: string[] = [];
      for (const comp of benchmarkComponents) {
        if (!comp.instrumentId) {
          // Crear instrumento desde símbolo
          try {
            const instrumentResponse = await fetch(`${apiUrl}/v1/instruments`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                symbol: comp.instrumentSymbol,
                backfill_days: 365
              })
            });

            if (instrumentResponse.ok) {
              const instrumentData = await instrumentResponse.json();
              instrumentIds.push(instrumentData.data.instrument.id);
            } else {
              // Si falla, intentar buscar si ya existe
              const searchResponse = await fetch(`${apiUrl}/v1/instruments?search=${comp.instrumentSymbol}`, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                const existing = searchData.data.instruments.find((inst: any) => inst.symbol === comp.instrumentSymbol);
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
            showToast('Error al crear instrumento', `No se pudo crear ${comp.instrumentSymbol}: ${err instanceof Error ? err.message : 'Error desconocido'}`, 'error');
            setIsLoading(false);
            return;
          }
        } else {
          instrumentIds.push(comp.instrumentId);
        }
      }

      // Paso 2: Crear benchmark con componentes
      const benchmarkResponse = await fetch(`${apiUrl}/v1/benchmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          code: newBenchmark.code,
          name: newBenchmark.name,
          description: newBenchmark.description,
          components: benchmarkComponents.map((comp, index) => ({
            instrumentId: instrumentIds[index],
            weight: comp.weight / 100 // Convertir de % a decimal
          }))
        })
      });

      if (!benchmarkResponse.ok) {
        const errorData = await benchmarkResponse.json();
        throw new Error(errorData.error || 'Error al crear benchmark');
      }

      const benchmarkData = await benchmarkResponse.json();
      const benchmarkId = benchmarkData.data.id;

      // Recargar benchmarks
      const refreshResponse = await fetch(`${apiUrl}/v1/benchmarks`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.success && refreshData.data) {
          // Obtener componentes para el nuevo benchmark
          const benchmarkDetailResponse = await fetch(`${apiUrl}/v1/benchmarks/${benchmarkId}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (benchmarkDetailResponse.ok) {
            const benchmarkDetail = await benchmarkDetailResponse.json();
            const newBenchmarkData = {
              ...refreshData.data.find((b: any) => b.id === benchmarkId),
              components: benchmarkDetail.data?.components || []
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
      console.error('Error creating benchmark:', err);
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
          <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', fontWeight: '500' }}>
            ← Volver al inicio
          </Link>
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
                              onClick={() => handleEditPortfolio(portfolio)}
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
                        onClick={createPortfolio}
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
                portfolios={portfolios.map(p => ({
                  id: p.id,
                  name: p.name,
                  type: 'portfolio' as const,
                  riskLevel: p.riskLevel,
                  description: p.description,
                  createdAt: p.createdAt
                }))}
                benchmarks={benchmarks.map(b => ({
                  id: b.id,
                  name: b.name,
                  type: 'benchmark' as const,
                  description: b.description,
                  createdAt: ''
                }))}
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
                        onClick={createBenchmark}
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
                        onClick={updateBenchmark}
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
        description={toast.description}
        variant={toast.variant}
        open={toast.show}
        onOpenChange={(open) => setToast(prev => ({ ...prev, show: open }))}
      />
    </div>
  );
}