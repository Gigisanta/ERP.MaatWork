/**
 * API client mocks for testing
 * 
 * Provides utilities to mock API client calls in tests
 */

// vi is available as a global from vitest/globals

/**
 * Mock API client response
 */
export interface MockApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Create a mock API client
 */
export function createMockApiClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
}

/**
 * Mock successful API response
 */
export function mockApiSuccess<T>(data: T): MockApiResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Mock error API response
 */
export function mockApiError(message: string, error?: string): MockApiResponse<never> {
  return {
    success: false,
    error: error || message,
    message,
  };
}

/**
 * Mock API client with default responses
 */
export function mockApiClientWithDefaults<T>(defaultData?: T) {
  const mockClient = createMockApiClient();
  
  const successResponse = mockApiSuccess(defaultData);
  
  mockClient.get.mockResolvedValue(successResponse);
  mockClient.post.mockResolvedValue(successResponse);
  mockClient.patch.mockResolvedValue(successResponse);
  mockClient.put.mockResolvedValue(successResponse);
  mockClient.delete.mockResolvedValue(successResponse);
  
  return mockClient;
}

/**
 * Mock fetch with response
 */
export function mockFetch(response: unknown, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(response),
    text: vi.fn().mockResolvedValue(JSON.stringify(response)),
    headers: new Headers(),
  } as Response);
}

/**
 * Mock fetch with error
 */
export function mockFetchError(error: Error) {
  global.fetch = vi.fn().mockRejectedValue(error);
}

/**
 * Reset fetch mock
 */
export function resetFetchMock() {
  vi.restoreAllMocks();
}

