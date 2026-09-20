/**
 * CareCue API Client
 * Reads each Fetch Response body exactly once, then parses JSON or text.
 */

export class ApiError extends Error {
  public status: number;
  public details?: unknown;
  public code?: string;

  constructor(message: string, status: number = 500, details?: unknown, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
    this.code = code;
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

function getStoredUserId(): string | null {
  try {
    const stored = localStorage.getItem('carecue_user');
    if (!stored) return null;
    const u = JSON.parse(stored);
    return u?.userId || null;
  } catch {
    return null;
  }
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem('carecue_token');
  } catch {
    return null;
  }
}

function looksLikeHtml(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith('<!doctype') || trimmed.startsWith('<html') || trimmed.includes('<body');
}

function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'The request was invalid. Please check the information and try again.';
    case 401:
      return 'Please sign in to continue.';
    case 403:
      return 'You do not have access to this record.';
    case 404:
      return 'The requested resource was not found.';
    case 408:
      return 'The request timed out. Please try again.';
    case 409:
      return 'This conflicts with an existing record.';
    case 422:
      return 'Some fields could not be validated. Please review and try again.';
    case 429:
      return 'The clinical analysis engine is currently busy. Please try again shortly.';
    case 500:
    case 502:
    case 503:
      return 'The server is temporarily unavailable. Please try again shortly.';
    default:
      return `Request failed (${status}).`;
  }
}

function extractErrorMessage(body: unknown, status: number): { message: string; code?: string } {
  if (body && typeof body === 'object') {
    const record = body as Record<string, any>;
    const errorObj = record.error;
    const detail = record.detail;
    const message =
      (typeof errorObj === 'object' && errorObj?.message) ||
      (typeof errorObj === 'string' && errorObj) ||
      (typeof record.message === 'string' && record.message) ||
      (typeof detail === 'string' && detail) ||
      (typeof detail === 'object' && detail?.message) ||
      null;
    const code =
      (typeof errorObj === 'object' && errorObj?.code) ||
      record.code ||
      (typeof detail === 'object' && detail?.code) ||
      undefined;
    if (typeof message === 'string' && message.trim() && !looksLikeHtml(message)) {
      return { message: message.trim(), code };
    }
    return { message: messageForStatus(status), code };
  }
  if (typeof body === 'string' && body.trim() && !looksLikeHtml(body)) {
    return { message: body.trim().slice(0, 280) };
  }
  return { message: messageForStatus(status) };
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();

  if (!raw) {
    return null;
  }

  if (contentType.includes('application/json') || raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  return raw;
}

function joinUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (cleanEndpoint.startsWith(API_BASE_URL + '/') || cleanEndpoint === API_BASE_URL) {
    return cleanEndpoint;
  }
  let path = cleanEndpoint;
  if (API_BASE_URL === '/api' && path.startsWith('/api/')) {
    path = path.slice(4);
  }
  return `${API_BASE_URL}${path}`;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 120000, headers = {}, ...rest } = options;
  const correlationId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const url = joinUrl(endpoint);

  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), timeoutMs);

  const userId = getStoredUserId();
  const token = getStoredToken();
  const authHeaders: Record<string, string> = {};
  if (userId) authHeaders['X-User-Id'] = userId;
  if (token) authHeaders.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-Id': correlationId,
        ...authHeaders,
        ...headers,
      },
    });

    clearTimeout(timeoutTimer);
    const body = await readResponseBody(response);

    if (!response.ok) {
      const { message, code } = extractErrorMessage(body, response.status);
      throw new ApiError(message, response.status, body, code);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (body ?? {}) as T;
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
  health: {
    async getAiHealth(): Promise<any> {
      return request<any>('/health/ai');
    },
  },

  documents: {
    async upload(file: File, patientId?: string, documentType?: string): Promise<any> {
      const formData = new FormData();
      formData.append('file', file);
      if (patientId) formData.append('patientId', patientId);
      if (documentType) formData.append('documentType', documentType);

      const correlationId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const url = joinUrl('/documents/upload');

      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), 120000);

      const userId = getStoredUserId();
      const token = getStoredToken();
      const uploadHeaders: Record<string, string> = { 'X-Correlation-Id': correlationId };
      if (userId) uploadHeaders['X-User-Id'] = userId;
      if (token) uploadHeaders.Authorization = `Bearer ${token}`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
          headers: uploadHeaders,
        });

        clearTimeout(timeoutTimer);
        const body = await readResponseBody(response);

        if (!response.ok) {
          const { message, code } = extractErrorMessage(body, response.status);
          throw new ApiError(message, response.status, body, code);
        }

        return body;
      } catch (err: any) {
        clearTimeout(timeoutTimer);
        if (err.name === 'AbortError') {
          throw new ApiError('Document upload timed out after 120s', 408);
        }
        if (err instanceof ApiError) {
          throw err;
        }
        throw new ApiError(err.message || 'Document upload failed', 0, err);
      }
    },

    async get(documentId: string): Promise<any> {
      return request<any>(`/documents/${documentId}`);
    },

    async getText(documentId: string): Promise<any> {
      return request<any>(`/documents/${documentId}/text`);
    },

    async retryAnalysis(documentId: string): Promise<any> {
      return request<any>(`/documents/${documentId}/retry-analysis`, {
        method: 'POST',
        timeoutMs: 120000,
      });
    },
  },

  patients: {
    async list(): Promise<any[]> {
      return request<any[]>('/patients');
    },

    async get(patientId: string): Promise<any> {
      return request<any>(`/patients/${patientId}`);
    },

    async update(patientId: string, data: Record<string, any>): Promise<any> {
      return request<any>(`/patients/${patientId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    async create(data: {
      userId?: string;
      name: string;
      dateOfBirth?: string;
      gender?: string;
      phone?: string;
      email?: string;
      notes?: string;
      relationship?: string;
      relationshipDetail?: string;
      isDemo?: boolean;
    }): Promise<any> {
      return request<any>('/patients', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async createFromDocument(documentId: string, patientName: string, dateOfBirth?: string, notes?: string): Promise<any> {
      return request<any>('/patients/from-document', {
        method: 'POST',
        body: JSON.stringify({ documentId, patientName, dateOfBirth, notes }),
      });
    },

    async attachDocument(patientId: string, documentId: string, overrideMismatch: boolean = false): Promise<any> {
      return request<any>(`/patients/${patientId}/attach-document`, {
        method: 'POST',
        body: JSON.stringify({ documentId, overrideMismatch }),
      });
    },

    async getDocuments(patientId: string): Promise<any[]> {
      return request<any[]>(`/patients/${patientId}/documents`);
    },

    async delete(patientId: string): Promise<any> {
      return request<any>(`/patients/${patientId}`, {
        method: 'DELETE',
      });
    },

    async deleteDocument(patientId: string, documentId: string): Promise<any> {
      return request<any>(`/patients/${patientId}/documents/${documentId}`, {
        method: 'DELETE',
      });
    },

    async getTimeline(patientId: string): Promise<any[]> {
      return request<any[]>(`/patients/${patientId}/timeline`);
    },

    async getFindings(patientId: string): Promise<any[]> {
      return request<any[]>(`/patients/${patientId}/findings`);
    },

    async getMedications(patientId: string): Promise<any[]> {
      return request<any[]>(`/patients/${patientId}/medications`);
    },

    async addMedication(patientId: string, data: any): Promise<any[]> {
      return request<any[]>(`/patients/${patientId}/medications`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async getDoctorBrief(patientId: string): Promise<any> {
      return request<any>(`/patients/${patientId}/doctor-brief`);
    },

    async generateDoctorBrief(patientId: string, userNotes?: string): Promise<any> {
      return request<any>(`/patients/${patientId}/doctor-brief`, {
        method: 'POST',
        timeoutMs: 120000,
        body: JSON.stringify({ userNotes }),
      });
    },

    async updateEmergencyProfile(patientId: string, data: any): Promise<any> {
      return request<any>(`/patients/${patientId}/emergency-profile`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async getEmergencyProfile(patientId: string): Promise<any> {
      return request<any>(`/patients/${patientId}/emergency-profile`);
    },
  },

  explain: {
    async explainFinding(params: { findingTitle: string; value?: string; referenceRange?: string; sourceQuote?: string; level?: 'standard' | 'beginner' }): Promise<any> {
      return request<any>('/explain', {
        method: 'POST',
        timeoutMs: 120000,
        body: JSON.stringify(params),
      });
    },
  },

  translation: {
    async translateText(text: string, targetLanguage: string): Promise<any> {
      return request<any>('/translate', {
        method: 'POST',
        timeoutMs: 120000,
        body: JSON.stringify({ text, targetLanguage }),
      });
    },
    async translateBrief(doctorBrief: any, targetLanguage: string): Promise<any> {
      return request<any>('/translate-brief', {
        method: 'POST',
        timeoutMs: 120000,
        body: JSON.stringify({ doctorBrief, targetLanguage }),
      });
    },
    async translateBatch(items: any, targetLanguage: string): Promise<any> {
      return request<any>('/translate-batch', {
        method: 'POST',
        timeoutMs: 120000,
        body: JSON.stringify({ items, targetLanguage }),
      });
    },
  },
};

export const apiClient = {
  ...liveApi,
  async get<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'GET' });
  },
  async post<T>(endpoint: string, body?: any): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
};

export { readResponseBody, extractErrorMessage, messageForStatus, joinUrl };
