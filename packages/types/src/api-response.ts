export interface ApiMeta {
  source: string;
  cached: boolean;
  lastUpdatedAt?: string;
}

export interface ApiError {
  code: string;
  message: string;
  actionRequired?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  meta?: ApiMeta;
  error: ApiError | null;
}

export const createSuccessResponse = <T>(
  data: T,
  meta?: Partial<ApiMeta>,
): ApiResponse<T> => ({
  success: true,
  data,
  meta: {
    source: meta?.source || 'internal',
    cached: meta?.cached || false,
    lastUpdatedAt: meta?.lastUpdatedAt || new Date().toISOString(),
  },
  error: null,
});

export const createErrorResponse = (
  error: ApiError,
  meta?: Partial<ApiMeta>,
): ApiResponse<null> => ({
  success: false,
  data: null,
  meta: {
    source: meta?.source || 'internal',
    cached: meta?.cached || false,
  },
  error,
});
