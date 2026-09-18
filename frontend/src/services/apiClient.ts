/**
 * CareCue API Client
 * Production-ready HTTP client for AWS Serverless API Gateway endpoints.
 * Supports request correlation IDs, timeouts, typed errors, and demo fallback.
 */

export class ApiError extends Error {
  public status: number;
  public details?: unknown;

  constructor(message: string, status: number = 500, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const ENABLE_LIVE_AWS = import.meta.env.VITE_ENABLE_LIVE_AWS === 'true' && Boolean(API_BASE_URL);

export function isLiveAws(): boolean {
  return ENABLE_LIVE_AWS;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 25000, headers = {}, ...rest } = options;
  const correlationId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': correlationId,
        ...headers,
      },
    });

    clearTimeout(timeoutTimer);

    if (!response.ok) {
      let errorBody: any = null;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = await response.text();
      }
      const message = errorBody?.error?.message || errorBody?.error || `HTTP error ${response.status}`;
      throw new ApiError(message, response.status, errorBody);
    }

    // Handle empty responses (e.g. 204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (err: any) {
    clearTimeout(timeoutTimer);
    if (err.name === 'AbortError') {
      throw new ApiError(`Request to ${endpoint} timed out after ${timeoutMs}ms`, 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network connection failed', 0, err);
  }
}

export const liveApi = {
  sessions: {
    async list(): Promise<any[]> {
      const data = await request<{ sessions?: any[] }>('/sessions');
      return data.sessions || (Array.isArray(data) ? data : []);
    },

    async get(sessionId: string): Promise<any> {
      return request<any>(`/sessions/${sessionId}`);
    },

    async create(type: string, title?: string): Promise<any> {
      return request<any>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ type, title }),
      });
    },

    async delete(sessionId: string): Promise<boolean> {
      await request<any>(`/sessions/${sessionId}`, { method: 'DELETE' });
      return true;
    },
  },

  documents: {
    async getUploadUrl(sessionId: string, file: File): Promise<{ uploadUrl: string; s3Key: string; documentId: string }> {
      return request<{ uploadUrl: string; s3Key: string; documentId: string }>('/documents/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          fileName: file.name,
          fileType: file.type || 'application/pdf',
          fileSizeBytes: file.size,
        }),
      });
    },

    async uploadToS3(uploadUrl: string, file: File): Promise<void> {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/pdf',
        },
        body: file,
      });

      if (!response.ok) {
        throw new ApiError(`S3 document upload failed: ${response.statusText}`, response.status);
      }
    },
  },

  analysis: {
    async start(sessionId: string, payload: { s3Key?: string; documentText?: string; documentName?: string; userNotes?: string }): Promise<any> {
      return request<any>('/analysis', {
        method: 'POST',
        body: JSON.stringify({ sessionId, ...payload }),
        timeoutMs: 45000,
      });
    },

    async get(sessionId: string): Promise<any> {
      return request<any>(`/analysis/${sessionId}`);
    },
  },

  brief: {
    async compile(sessionId: string, customConcerns?: string[], doctorName?: string): Promise<any> {
      return request<any>('/doctor-brief', {
        method: 'POST',
        body: JSON.stringify({ sessionId, customConcerns, doctorName }),
      });
    },

    async get(sessionId: string): Promise<any> {
      return request<any>(`/doctor-brief/${sessionId}`);
    },
  },

  verification: {
    async verify(sessionId: string, findings?: any[], sourceText?: string): Promise<any> {
      return request<any>('/verification', {
        method: 'POST',
        body: JSON.stringify({ sessionId, findings, sourceText }),
        timeoutMs: 35000,
      });
    },
  },

  guidance: {
    async ask(question: string, sessionId?: string, findingId?: string): Promise<any> {
      return request<any>('/guidance', {
        method: 'POST',
        body: JSON.stringify({ question, sessionId, findingId }),
      });
    },
  },
};
