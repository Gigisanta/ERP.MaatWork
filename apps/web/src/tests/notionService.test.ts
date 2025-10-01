import { describe, it, expect, beforeEach, vi } from 'vitest';
import { notionService } from '../services/notionService';
import { supabase } from '@cactus/database';

// Mock fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('NotionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    process.env.VITE_NOTION_CRM_FALLBACK_URL = 'http://localhost:3001';
  });

  describe('OAuth Flow', () => {
    it('should start OAuth flow successfully', async () => {
      // Mock Supabase auth
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      } as any);

      vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null
      } as any);

      const mockResponse = {
        success: true,
        redirect_url: 'https://api.notion.com/v1/oauth/authorize?client_id=test'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await notionService.startOAuthFlow();
      
      expect(result).toBe(mockResponse.redirect_url);
    });
  });

  describe('Configuration Management', () => {
    it('should get user notion config successfully', async () => {
      const mockConfig = {
        id: 'test-id',
        user_id: 'test-user',
        workspace_id: 'test-workspace',
        workspace_name: 'Test Workspace',
        access_token: 'encrypted-token',
        contacts_database_id: 'contacts-db-id',
        deals_database_id: 'deals-db-id',
        tasks_database_id: 'tasks-db-id',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Mock Supabase auth
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      } as any);

      // Mock Supabase query
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockConfig, error: null })
          })
        })
      });
      
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect
      } as any);

      const result = await notionService.getUserNotionConfig();
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
    });

    it('should handle no configuration found', async () => {
      // Mock Supabase auth
      vi.spyOn(supabase.auth, 'getUser').mockResolvedValue({
        data: { user: { id: 'test-user' } },
        error: null
      } as any);

      // Mock Supabase query returning no data
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
          })
        })
      });
      
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect
      } as any);

      const result = await notionService.getUserNotionConfig();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(result.message).toContain('No hay configuración personalizada');
    });
  });

  describe('URL Management', () => {
    it('should get effective Notion URL with custom config', async () => {
      const mockUrl = 'https://notion.so/test-page';
      
      // Mock getUserNotionConfig to return a custom URL
      vi.spyOn(notionService, 'getUserNotionConfig').mockResolvedValue({
        success: true,
        data: {
          id: 'test-id',
          user_id: 'test-user',
          workspace_id: 'test-workspace',
          workspace_name: 'Test Workspace',
          access_token: 'encrypted-token',
          contacts_database_id: 'contacts-db-id',
          deals_database_id: 'deals-db-id',
          tasks_database_id: 'tasks-db-id',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });

      const result = await notionService.getEffectiveNotionUrl();
      
      expect(result).toBe(mockUrl);
    });

    it('should return fallback URL when no custom config', async () => {
      // Mock getUserNotionConfig to return no data
      vi.spyOn(notionService, 'getUserNotionConfig').mockResolvedValue({
        success: true,
        data: null,
        fallback_url: 'http://localhost:3001'
      });

      const result = await notionService.getEffectiveNotionUrl();
      const fallbackUrl = notionService.getFallbackUrl();
      
      expect(result).toBe(fallbackUrl); // Should return the fallback URL
    });

    it('should check if user has custom configuration', async () => {
      // Mock with custom config
      vi.spyOn(notionService, 'getUserNotionConfig').mockResolvedValue({
        success: true,
        data: {
          id: 'test-id',
          user_id: 'test-user',
          workspace_id: 'test-workspace',
          workspace_name: 'Test Workspace',
          access_token: 'encrypted-token',
          contacts_database_id: 'contacts-db-id',
          deals_database_id: 'deals-db-id',
          tasks_database_id: 'tasks-db-id',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      });

      const hasConfig = await notionService.hasCustomConfiguration();
      expect(hasConfig).toBe(true);
    });
  });

  describe('URL Validation', () => {
    it('should validate Notion URLs correctly', async () => {
      const validUrl = 'https://workspace.notion.site/test-page';
      
      // Mock fetch for valid URL (no-cors mode always succeeds if no network error)
      mockFetch.mockResolvedValueOnce({ ok: true });
      const validResult = await notionService.validateNotionUrl(validUrl);
      expect(validResult).toBe(true);
    });

    it('should reject invalid URLs', async () => {
      const invalidUrl = 'https://invalid-site.com/page';
      const invalidResult = await notionService.validateNotionUrl(invalidUrl);
      expect(invalidResult).toBe(false);
    });

    it('should handle network errors gracefully', async () => {
      const validUrl = 'https://workspace.notion.site/test-page';
      
      // Mock fetch to throw network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const result = await notionService.validateNotionUrl(validUrl);
      expect(result).toBe(false);
    });

    it('should return fallback URL', () => {
      const fallbackUrl = notionService.getFallbackUrl();
      expect(typeof fallbackUrl).toBe('string');
    });
  });
});