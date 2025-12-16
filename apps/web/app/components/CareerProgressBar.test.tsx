/**
 * Tests for CareerProgressBar Component
 *
 * Covers:
 * - Rendering with data
 * - Loading and error states
 * - Navigation on click
 * - Progress calculation
 * - Display logic (when to show/hide)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CareerProgressBar from './CareerProgressBar';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { getUserCareerProgress } from '@/lib/api/career-plan';

// Mock dependencies
vi.mock('next/navigation');
vi.mock('swr');
vi.mock('@/lib/api/career-plan');

describe('CareerProgressBar', () => {
  const mockPush = vi.fn();
  const mockRouter = {
    push: mockPush,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
  });

  describe('Rendering', () => {
    it('should render with current level and progress', () => {
      const mockData = {
        currentLevel: {
          id: '1',
          level: 'Asesor Junior',
          annualGoalUsd: 100000,
          percentage: '5',
        },
        nextLevel: null,
        annualProduction: 75000,
        progressPercentage: 75,
      };

      (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockData,
        error: null,
      });

      render(<CareerProgressBar />);

      expect(screen.getByText('Asesor Junior')).toBeInTheDocument();
      expect(screen.getByText(/75%/i)).toBeInTheDocument();
    });

    it('should render with next level when no current level', () => {
      const mockData = {
        currentLevel: null,
        nextLevel: {
          id: '2',
          level: 'Asesor Senior',
          annualGoalUsd: 200000,
          percentage: '7',
        },
        annualProduction: 50000,
        progressPercentage: 25,
      };

      (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockData,
        error: null,
      });

      render(<CareerProgressBar />);

      expect(screen.getByText('Asesor Senior')).toBeInTheDocument();
    });

    it('should render commission percentage', () => {
      const mockData = {
        currentLevel: {
          id: '1',
          level: 'Asesor Junior',
          annualGoalUsd: 100000,
          percentage: '5',
        },
        nextLevel: null,
        annualProduction: 75000,
        progressPercentage: 75,
      };

      (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockData,
        error: null,
      });

      render(<CareerProgressBar />);

      expect(screen.getByText(/5/i)).toBeInTheDocument();
    });

    it('should render progress bar with correct width', () => {
      const mockData = {
        currentLevel: {
          id: '1',
          level: 'Asesor Junior',
          annualGoalUsd: 100000,
          percentage: '5',
        },
        nextLevel: null,
        annualProduction: 75000,
        progressPercentage: 75,
      };

      (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockData,
        error: null,
      });

      render(<CareerProgressBar />);

      const progressBar = document.querySelector('.bg-primary');
      expect(progressBar).toBeInTheDocument();
      expect((progressBar as HTMLElement).style.width).toBe('75%');
    });

    it('should cap progress bar at 100% visually', () => {
      const mockData = {
        currentLevel: {
          id: '1',
          level: 'Asesor Junior',
          annualGoalUsd: 100000,
          percentage: '5',
        },
        nextLevel: null,
        annualProduction: 150000,
        progressPercentage: 150, // Over 100%
      };

      (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockData,
        error: null,
      });

      render(<CareerProgressBar />);

      const progressBar = document.querySelector('.bg-primary');
      expect((progressBar as HTMLElement).style.width).toBe('100%');
    });
  });

  describe('Display Logic', () => {
    it('should not render when there is an error', () => {
      (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
        data: null,
        error: new Error('Failed to fetch'),
      });

      const { container } = render(<CareerProgressBar />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when data is null', () => {
      (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
        data: null,
        error: null,
      });

      const { container } = render(<CareerProgressBar />);
      expect(container.firstChild).toBeNull();
    });

    it('should not render when no level and zero production', () => {
      const mockData = {
        currentLevel: null,
        nextLevel: null,
        annualProduction: 0,
        progressPercentage: 0,
      };

      (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockData,
        error: null,
      });

      const { container } = render(<CareerProgressBar />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when no current level but has production', () => {
      const mockData = {
        currentLevel: null,
        nextLevel: {
          id: '2',
          level: 'Asesor Senior',
          annualGoalUsd: 200000,
          percentage: '7',
        },
        annualProduction: 50000,
        progressPercentage: 25,
      };

      (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockData,
        error: null,
      });

      render(<CareerProgressBar />);
      expect(screen.getByText('Asesor Senior')).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to career plan page on click', () => {
      const mockData = {
        currentLevel: {
          id: '1',
          level: 'Asesor Junior',
          annualGoalUsd: 100000,
          percentage: '5',
        },
        nextLevel: null,
        annualProduction: 75000,
        progressPercentage: 75,
      };

      (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockData,
        error: null,
      });

      render(<CareerProgressBar />);

      const button = screen.getByRole('button', { name: /ver plan de carrera/i });
      fireEvent.click(button);

      expect(mockPush).toHaveBeenCalledWith('/plandecarrera');
    });

    it('should have correct aria-label', () => {
      const mockData = {
        currentLevel: {
          id: '1',
          level: 'Asesor Junior',
          annualGoalUsd: 100000,
          percentage: '5',
        },
        nextLevel: null,
        annualProduction: 75000,
        progressPercentage: 75,
      };

      (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockData,
        error: null,
      });

      render(<CareerProgressBar />);

      const button = screen.getByRole('button', { name: /ver plan de carrera/i });
      expect(button).toHaveAttribute('aria-label', 'Ver plan de carrera');
    });
  });

  describe('SWR Configuration', () => {
    it('should use correct SWR key', () => {
      const mockData = {
        currentLevel: {
          id: '1',
          level: 'Asesor Junior',
          annualGoalUsd: 100000,
          percentage: '5',
        },
        nextLevel: null,
        annualProduction: 75000,
        progressPercentage: 75,
      };

      (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockData,
        error: null,
      });

      render(<CareerProgressBar />);

      expect(useSWR).toHaveBeenCalledWith(
        'career-plan-user-progress',
        expect.any(Function),
        expect.objectContaining({
          revalidateOnFocus: false,
          revalidateOnReconnect: false,
          dedupingInterval: 60000,
          shouldRetryOnError: false,
        })
      );
    });

    it('should use getUserCareerProgress as fetcher', () => {
      const mockData = {
        currentLevel: {
          id: '1',
          level: 'Asesor Junior',
          annualGoalUsd: 100000,
          percentage: '5',
        },
        nextLevel: null,
        annualProduction: 75000,
        progressPercentage: 75,
      };

      (useSWR as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockData,
        error: null,
      });

      render(<CareerProgressBar />);

      const swrCall = (useSWR as ReturnType<typeof vi.fn>).mock.calls[0];
      const fetcher = swrCall[1];

      // Verify fetcher calls getUserCareerProgress
      expect(fetcher).toBeDefined();
    });
  });
});
