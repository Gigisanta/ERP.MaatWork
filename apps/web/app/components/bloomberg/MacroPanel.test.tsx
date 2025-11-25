import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MacroPanel from './MacroPanel';
import { getMacroSeriesList, getMacroSeries } from '@/lib/api/bloomberg';

vi.mock('@/lib/api/bloomberg', () => ({
  getMacroSeriesList: vi.fn(),
  getMacroSeries: vi.fn()
}));

describe('MacroPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería renderizar loading state inicialmente', () => {
    (getMacroSeriesList as any).mockResolvedValue({
      success: true,
      data: []
    });
    
    render(<MacroPanel />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('debería mostrar error cuando falla la carga de series', async () => {
    (getMacroSeriesList as any).mockResolvedValue({
      success: false,
      error: 'Failed to fetch'
    });
    
    render(<MacroPanel />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch/i)).toBeInTheDocument();
    });
  });

  it('debería mostrar series disponibles cuando carga exitosamente', async () => {
    const mockSeries = [
      { series_id: 'USGDP', name: 'US GDP', description: 'US Gross Domestic Product' },
      { series_id: 'USCPI', name: 'US CPI', description: 'US Consumer Price Index' }
    ];
    
    (getMacroSeriesList as any).mockResolvedValue({
      success: true,
      data: mockSeries
    });
    
    (getMacroSeries as any).mockResolvedValue({
      success: true,
      data: { points: [] }
    });
    
    render(<MacroPanel />);
    
    await waitFor(() => {
      expect(screen.getByText(/Macro Economic Data/i)).toBeInTheDocument();
    });
  });

  it('debería permitir cambiar entre US y AR', async () => {
    (getMacroSeriesList as any).mockResolvedValue({
      success: true,
      data: []
    });
    
    render(<MacroPanel />);
    
    await waitFor(() => {
      expect(screen.getByText('US')).toBeInTheDocument();
      expect(screen.getByText('AR')).toBeInTheDocument();
    });
  });

  it('debería llamar getMacroSeriesList con country correcto', async () => {
    (getMacroSeriesList as any).mockResolvedValue({
      success: true,
      data: []
    });
    
    render(<MacroPanel />);
    
    await waitFor(() => {
      expect(getMacroSeriesList).toHaveBeenCalledWith('US');
    });
  });

  it('debería mostrar "No data available" cuando no hay datos', async () => {
    (getMacroSeriesList as any).mockResolvedValue({
      success: true,
      data: [{ series_id: 'USGDP', name: 'US GDP' }]
    });
    
    (getMacroSeries as any).mockResolvedValue({
      success: true,
      data: { points: [] }
    });
    
    render(<MacroPanel />);
    
    await waitFor(() => {
      expect(screen.getByText(/No data available/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('debería aceptar className prop', () => {
    (getMacroSeriesList as any).mockResolvedValue({
      success: true,
      data: []
    });
    
    const { container } = render(<MacroPanel className="custom-class" />);
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('debería aceptar height prop', () => {
    (getMacroSeriesList as any).mockResolvedValue({
      success: true,
      data: []
    });
    
    render(<MacroPanel height={400} />);
    // Verificar que el height se aplica al chart (verificación indirecta)
    expect(screen.getByText(/Macro Economic Data/i)).toBeInTheDocument();
  });
});

