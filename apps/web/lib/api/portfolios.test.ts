/**
 * Tests para portfolios API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import * as portfoliosApi from './portfolios';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(async (_p: string) => ({ success: true, data: [] })),
    post: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
    put: vi.fn(async (_p: string, _b?: unknown) => ({ success: true })),
    delete: vi.fn(async (_p: string) => ({ success: true })),
  },
}));

describe('portfolios api client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getPortfolios endpoint', async () => {
    await portfoliosApi.getPortfolios();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/portfolios/templates');
  });

  it('calls getPortfolioById endpoint', async () => {
    await portfoliosApi.getPortfolioById('portfolio-1');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/portfolios/templates/portfolio-1');
  });

  it('calls getPortfolioLines endpoint', async () => {
    await portfoliosApi.getPortfolioLines('portfolio-1');
    expect(apiClient.get).toHaveBeenCalledWith('/v1/portfolios/templates/portfolio-1/lines');
  });

  it('calls getPortfolioLinesBatch endpoint', async () => {
    await portfoliosApi.getPortfolioLinesBatch(['portfolio-1', 'portfolio-2']);
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/v1/portfolios/templates/lines/batch')
    );
  });

  it('calls createPortfolio endpoint', async () => {
    await portfoliosApi.createPortfolio({ name: 'Test Portfolio' });
    expect(apiClient.post).toHaveBeenCalledWith('/v1/portfolios/templates', expect.any(Object));
  });

  it('calls updatePortfolio endpoint', async () => {
    await portfoliosApi.updatePortfolio('portfolio-1', { name: 'Updated Portfolio' });
    expect(apiClient.put).toHaveBeenCalledWith(
      '/v1/portfolios/templates/portfolio-1',
      expect.any(Object)
    );
  });

  it('calls deletePortfolio endpoint', async () => {
    await portfoliosApi.deletePortfolio('portfolio-1');
    expect(apiClient.delete).toHaveBeenCalledWith('/v1/portfolios/templates/portfolio-1');
  });

  it('calls addPortfolioLine endpoint', async () => {
    await portfoliosApi.addPortfolioLine('portfolio-1', {
      targetType: 'instrument',
      instrumentId: 'instrument-1',
      targetWeight: 0.5,
    });
    expect(apiClient.post).toHaveBeenCalledWith(
      '/v1/portfolios/templates/portfolio-1/lines',
      expect.objectContaining({
        targetType: 'instrument',
        instrumentId: 'instrument-1',
        targetWeight: 0.5,
      })
    );
  });

  it('calls updatePortfolioLine endpoint', async () => {
    await portfoliosApi.updatePortfolioLine('portfolio-1', 'line-1', {
      targetWeight: 0.3,
    });
    expect(apiClient.put).toHaveBeenCalledWith(
      '/v1/portfolios/templates/portfolio-1/lines/line-1',
      expect.objectContaining({
        targetWeight: 0.3,
      })
    );
  });

  it('calls deletePortfolioLine endpoint', async () => {
    await portfoliosApi.deletePortfolioLine('portfolio-1', 'line-1');
    expect(apiClient.delete).toHaveBeenCalledWith(
      '/v1/portfolios/templates/portfolio-1/lines/line-1'
    );
  });

  it('calls getPortfolioLinesBatch with correct query params', async () => {
    await portfoliosApi.getPortfolioLinesBatch(['id1', 'id2', 'id3']);
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/v1/portfolios/templates/lines/batch')
    );
    expect(apiClient.get).toHaveBeenCalledWith(expect.stringMatching(/ids=id1,id2,id3/));
  });

  it('calls createPortfolio with correct data structure', async () => {
    const portfolioData = {
      name: 'Test Portfolio',
      description: 'Test Description',
      riskLevel: 'moderate' as const,
    };
    await portfoliosApi.createPortfolio(portfolioData);
    expect(apiClient.post).toHaveBeenCalledWith('/v1/portfolios/templates', portfolioData);
  });

  it('calls updatePortfolio with correct data structure', async () => {
    const updateData = {
      name: 'Updated Name',
      description: 'Updated Description',
      riskLevel: 'aggressive' as const,
    };
    await portfoliosApi.updatePortfolio('portfolio-1', updateData);
    expect(apiClient.put).toHaveBeenCalledWith('/v1/portfolios/templates/portfolio-1', updateData);
  });
});
