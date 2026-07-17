import type { User } from '../types';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
let sessionToken: string | null = null;

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface CloudState {
  profile?: unknown;
  plan?: unknown;
  logs?: unknown;
  reviews?: unknown;
  adjustments?: unknown;
  chat?: unknown;
  ownedIngredients?: unknown;
  measurements?: unknown;
  repairsCompleted?: unknown;
  progressPhotos?: unknown;
  reminderPrefs?: unknown;
  restaurantHistory?: unknown;
  connectedWearables?: unknown;
  assignedExpertId?: unknown;
  expertMessages?: unknown;
  planReviews?: unknown;
}

interface SessionResponse {
  token: string;
  user: User;
  state: CloudState;
}

export function setApiToken(token: string | null) {
  sessionToken = token;
}

export function isApiConfigured() {
  return API_URL.length > 0;
}

export function hasApiSession() {
  return isApiConfigured() && Boolean(sessionToken);
}

async function request<T>(path: string, init: RequestInit = {}, token = sessionToken): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(payload?.error || 'The request could not be completed.', response.status);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('The server took too long to respond.', 0);
    }
    throw new ApiError('Cannot reach the FitPlan server. Check that the backend is running.', 0);
  } finally {
    clearTimeout(timeout);
  }
}

export const authApi = {
  register(name: string, email: string, password: string) {
    return request<SessionResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },
  login(email: string, password: string) {
    return request<SessionResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },
  me(token: string) {
    return request<{ user: User }>('/auth/me', {}, token);
  },
  acceptConsent(token: string) {
    return request<{ user: User }>(
      '/users/me/consent',
      { method: 'PATCH', body: JSON.stringify({ accepted: true }) },
      token,
    );
  },
  loadState(token: string) {
    return request<{ state: CloudState }>('/users/me/state', {}, token);
  },
  saveState(token: string, state: CloudState) {
    return request<{ savedAt: string }>(
      '/users/me/state',
      { method: 'PUT', body: JSON.stringify({ state }) },
      token,
    );
  },
};

export function postAI(body: {
  system: string;
  messages: unknown[];
  maxTokens: number;
}) {
  return request<{ content?: { text?: string }[] }>('/ai/messages', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
