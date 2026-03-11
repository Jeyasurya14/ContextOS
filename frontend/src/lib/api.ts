// frontend/src/lib/api.ts

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const { useAuthStore } = require('@/store/auth');
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const { useAuthStore } = require('@/store/auth');
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  plan: string;
  api_key_prefix: string | null;
  team_id: string | null;
  team_role: string | null;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IntegrationStatus {
  connected: boolean;
  username: string | null;
  chunks: number;
  last_synced: string | null;
}

export interface ConversationSummary {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  message_count: number;
  created_at: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    sources: Array<{ type: string; url: string; score: number }> | null;
    created_at: string;
  }>;
}

export const authApi = {
  register: (data: { email: string; full_name: string; password: string }) =>
    api.post<AuthTokens>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthTokens>('/auth/login', data),
  me: () => api.get<UserProfile>('/auth/me'),
  refresh: (refresh_token: string) =>
    api.post<AuthTokens>('/auth/refresh', { refresh_token }),
  generateApiKey: () =>
    api.post<{ api_key: string; prefix: string }>('/auth/api-key'),
};

export const projectsApi = {
  list: () => api.get<Project[]>('/projects'),
  create: (data: { name: string; description?: string }) =>
    api.post<Project>('/projects', data),
  get: (id: string) => api.get<Project>(`/projects/${id}`),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.put<Project>(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

export const integrationsApi = {
  status: () =>
    api.get<Record<string, IntegrationStatus>>('/integrations/status/all'),
  list: () => api.get('/integrations/'),
  githubConnect: () => api.get<{ oauth_url: string }>('/integrations/github/connect'),
  githubDisconnect: () => api.delete('/integrations/github/disconnect'),
  notionConnect: () => api.get<{ oauth_url: string }>('/integrations/notion/connect'),
  notionDisconnect: () => api.delete('/integrations/notion/disconnect'),
  notionSync: () => api.post('/integrations/notion/sync'),
  slackConnect: () => api.get<{ oauth_url: string }>('/integrations/slack/connect'),
  slackDisconnect: () => api.delete('/integrations/slack/disconnect'),
  slackSync: () => api.post('/integrations/slack/sync'),
};

export const queryApi = {
  conversations: () => api.get<ConversationSummary[]>('/query/conversations'),
  conversation: (id: string) =>
    api.get<ConversationDetail>(`/query/conversations/${id}`),
};

export function createSSEStream(
  question: string,
  token: string,
  workspaceContext?: Record<string, unknown>,
  conversationId?: string
): EventSource | null {
  if (typeof window === 'undefined') { return null; }

  const url = `${API_URL}/api/v1/query`;

  const fetchSSE = async function* () {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        question,
        workspace_context: workspaceContext || null,
        stream: true,
        conversation_id: conversationId || null,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) { return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) { break; }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) { continue; }
        const jsonStr = trimmed.substring(6);
        if (!jsonStr) { continue; }
        try {
          yield JSON.parse(jsonStr);
        } catch {
          continue;
        }
      }
    }
  };

  return fetchSSE as unknown as EventSource;
}

export async function* streamQuery(
  question: string,
  token: string,
  conversationId?: string
): AsyncGenerator<Record<string, unknown>> {
  const url = `${API_URL}/api/v1/query`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      question,
      stream: true,
      conversation_id: conversationId || null,
    }),
  });

  if (!response.ok) {
    yield { event: 'error', message: `Server error: ${response.status}` };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    yield { event: 'error', message: 'No response stream available' };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) { break; }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) { continue; }
      const jsonStr = trimmed.substring(6);
      if (!jsonStr) { continue; }
      try {
        yield JSON.parse(jsonStr);
      } catch {
        continue;
      }
    }
  }
}

export default api;
