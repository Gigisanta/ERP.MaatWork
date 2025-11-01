'use client';

import { useState, useEffect } from 'react';
import { useRequireAuth } from '../auth/useRequireAuth';
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

  // Estados para crear/editar benchmarks
  const [showCreateBenchmark, setShowCreateBenchmark] = useState(false);
  const [newBenchmark, setNewBenchmark] = useState({
    name: '',
    description: '',
    code: ''
  });
  const [benchmarkComponents, setBenchmarkComponents] = useState<any[]>([]);

  // Datos simulados
  useEffect(() => {
    const mockPortfolios: PortfolioTemplate[] = [
      {
        id: '1',
        name: 'Cartera Conservadora',
        description: 'Portfolio de bajo riesgo con enfoque en renta fija',
        riskLevel: 'conservative',
        isActive: true,
        createdAt: '2024-01-15',
        lines: [
          { id: '1', instrumentId: '1', instrumentSymbol: 'GGAL.BA', instrumentName: 'Grupo Financiero Galicia', targetWeight: 0.3 },
          { id: '2', instrumentId: '2', instrumentSymbol: 'PAMP.BA', instrumentName: 'Pampa Energía', targetWeight: 0.2 },
          { id: '3', instrumentId: '3', instrumentSymbol: '^MERV', instrumentName: 'MERVAL', targetWeight: 0.5 }
        ]
      },
      {
        id: '2',
        name: 'Cartera Agresiva',
        description: 'Portfolio de alto riesgo con exposición a tecnología',
        riskLevel: 'aggressive',
        isActive: true,
        createdAt: '2024-02-20',
        lines: [
          { id: '4', instrumentId: '4', instrumentSymbol: 'AAPL', instrumentName: 'Apple Inc.', targetWeight: 0.4 },
          { id: '5', instrumentId: '5', instrumentSymbol: 'TSLA', instrumentName: 'Tesla Inc.', targetWeight: 0.3 },
          { id: '6', instrumentId: '6', instrumentSymbol: 'NVDA', instrumentName: 'NVIDIA Corporation', targetWeight: 0.3 }
        ]
      }
    ];

    const mockBenchmarks: Benchmark[] = [
      {
        id: '1',
        name: 'S&P 500',
        description: 'Índice de las 500 empresas más grandes de EE.UU.',
        code: 'SP500',
        isSystem: true,
        components: [
          { id: '1', instrumentId: '1', instrumentSymbol: '^GSPC', weight: 1.0 }
        ]
      },
      {
        id: '2',
        name: 'MERVAL',
        description: 'Índice bursátil de Argentina',
        code: 'MERVAL',
        isSystem: true,
        components: [
          { id: '2', instrumentId: '2', instrumentSymbol: '^MERV', weight: 1.0 }
        ]
      }
    ];

    setPortfolios(mockPortfolios);
    setBenchmarks(mockBenchmarks);
  }, []);

  const handleAssetSelect = (asset: any) => {
    // Verificar si ya existe
    const exists = portfolioLines.find(line => line.instrumentSymbol === asset.symbol);
    if (exists) {
      alert('Este activo ya está en la cartera');
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
      alert('El nombre de la cartera es requerido');
      return;
    }

    if (portfolioLines.length === 0) {
      alert('Debe agregar al menos un activo a la cartera');
      return;
    }

    if (Math.abs(totalWeight - 100) > 0.01) {
      alert(`Los pesos deben sumar exactamente 100%. Actual: ${totalWeight.toFixed(2)}%`);
      return;
    }

    // Simular creación exitosa
    const newPortfolioData: PortfolioTemplate = {
      id: `portfolio-${Date.now()}`,
      name: newPortfolio.name,
      description: newPortfolio.description,
      riskLevel: newPortfolio.riskLevel,
      isActive: true,
      createdAt: new Date().toISOString(),
      lines: portfolioLines.map(line => ({
        id: line.id,
        instrumentSymbol: line.instrumentSymbol,
        instrumentName: line.instrumentName,
        instrumentId: line.instrumentId,
        targetWeight: line.targetWeight / 100
      }))
    };

    setPortfolios([...portfolios, newPortfolioData]);
    
    // Reset form
    setNewPortfolio({ name: '', description: '', riskLevel: 'moderate' });
    setPortfolioLines([]);
    setTotalWeight(0);
    setShowCreatePortfolio(false);
    
    alert('Cartera creada exitosamente');
  };

  const handleBenchmarkAssetSelect = (asset: any) => {
    const exists = benchmarkComponents.find(comp => comp.instrumentSymbol === asset.symbol);
    if (exists) {
      alert('Este activo ya está en el benchmark');
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

  const createBenchmark = async () => {
    if (!newBenchmark.name.trim() || !newBenchmark.code.trim()) {
      alert('El nombre y código del benchmark son requeridos');
      return;
    }

    if (benchmarkComponents.length === 0) {
      alert('Debe agregar al menos un componente al benchmark');
      return;
    }

    const totalWeight = benchmarkComponents.reduce((sum, comp) => sum + (comp.weight || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.01) {
      alert(`Los pesos deben sumar exactamente 100%. Actual: ${totalWeight.toFixed(2)}%`);
      return;
    }

    // Simular creación exitosa
    const newBenchmarkData: Benchmark = {
      id: `benchmark-${Date.now()}`,
      name: newBenchmark.name,
      description: newBenchmark.description,
      code: newBenchmark.code,
      isSystem: false,
      components: benchmarkComponents.map(comp => ({
        id: comp.id,
        instrumentSymbol: comp.instrumentSymbol,
        instrumentName: comp.instrumentName,
        instrumentId: comp.instrumentId,
        weight: comp.weight / 100
      }))
    };

    setBenchmarks([...benchmarks, newBenchmarkData]);
    
    // Reset form
    setNewBenchmark({ name: '', description: '', code: '' });
    setBenchmarkComponents([]);
    setShowCreateBenchmark(false);
    
    alert('Benchmark creado exitosamente');
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
                            <Button variant="outline" size="sm" className="flex-1">
                              <Eye className="w-4 h-4 mr-2" />
                              Ver
                            </Button>
                            <Button variant="outline" size="sm" className="flex-1">
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
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
                              <Button variant="outline" size="sm" className="flex-1">
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </Button>
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
    </div>
  );
}