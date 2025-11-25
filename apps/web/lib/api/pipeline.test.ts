/**
 * Tests para pipeline API client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiIndex from './pipeline';

vi.mock('../api-client', () => {
  return {
    apiClient: {
      get: vi.fn(async (_p: string) => ({ success: true })),
      post: vi.fn(async (_p: string, _b?: unknown) => ({ success: true }))
    }
  };
});

describe('pipeline api client endpoints', () => {
  const { apiClient } = require('../api-client');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get pipeline stages endpoint', async () => {
    await apiIndex.getPipelineStages();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/pipeline/stages');
  });

  it('calls move contact to stage endpoint', async () => {
    await apiIndex.moveContactToStage('contact-123', 'stage-456');
    expect(apiClient.post).toHaveBeenCalledWith('/v1/pipeline/move', {
      contactId: 'contact-123',
      toStageId: 'stage-456'
    });
  });

  it('calls get pipeline board endpoint', async () => {
    await apiIndex.getPipelineBoard();
    expect(apiClient.get).toHaveBeenCalledWith('/v1/pipeline/board');
  });

  describe('getNextPipelineStage helper', () => {
    const mockStages = [
      { id: 'stage-1', order: 1 },
      { id: 'stage-2', order: 2 },
      { id: 'stage-3', order: 3 }
    ] as any[];

    it('returns first stage when currentStageId is null', () => {
      const result = apiIndex.getNextPipelineStage(mockStages, null);
      expect(result?.id).toBe('stage-1');
    });

    it('returns next stage when currentStageId exists', () => {
      const result = apiIndex.getNextPipelineStage(mockStages, 'stage-1');
      expect(result?.id).toBe('stage-2');
    });

    it('returns null when currentStageId is last stage', () => {
      const result = apiIndex.getNextPipelineStage(mockStages, 'stage-3');
      expect(result).toBeNull();
    });

    it('returns null when currentStageId not found', () => {
      const result = apiIndex.getNextPipelineStage(mockStages, 'stage-999');
      expect(result).toBeNull();
    });
  });
});

