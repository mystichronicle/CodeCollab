import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (username: string, password: string) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await axios.post(`${API_BASE_URL}/auth/login`, formData);
    
    // Save token to localStorage
    const { access_token } = response.data;
    if (access_token) {
      localStorage.setItem('access_token', access_token);
    }
    
    return response.data;
  },
  
  register: async (data: {
    username: string;
    email: string;
    password: string;
    full_name?: string;
  }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Sessions API
export interface Session {
  id: string;
  name: string;
  language: string;
  description?: string;
  owner_id: number;
  owner_username: string;
  participants: string[];
  share_code: string;
  created_at: string;
  updated_at?: string;
  last_accessed_at?: string;
  access_count?: number;
  is_active: boolean;
  code?: string;
  tags?: string[];
}

export interface CreateSessionData {
  name: string;
  language: string;
  description?: string;
  code?: string;
  tags?: string[];
}

export const sessionsAPI = {
  list: async (language?: string, tags?: string[]): Promise<Session[]> => {
    const params: any = {};
    if (language) params.language = language;
    if (tags && tags.length > 0) params.tags = tags.join(',');
    const response = await api.get('/sessions', { params });
    return response.data;
  },
  
  create: async (data: CreateSessionData): Promise<Session> => {
    const response = await api.post('/sessions', data);
    return response.data;
  },
  
  get: async (sessionId: string): Promise<Session> => {
    const response = await api.get(`/sessions/${sessionId}`);
    return response.data;
  },
  
  update: async (sessionId: string, data: {
    name?: string;
    code?: string;
    is_active?: boolean;
  }): Promise<Session> => {
    const response = await api.put(`/sessions/${sessionId}`, data);
    return response.data;
  },
  
  delete: async (sessionId: string): Promise<void> => {
    await api.delete(`/sessions/${sessionId}`);
  },
  
  join: async (sessionId: string): Promise<Session> => {
    const response = await api.post(`/sessions/${sessionId}/join`);
    return response.data;
  },
  
  joinByCode: async (shareCode: string): Promise<Session> => {
    const response = await api.post(`/sessions/join-by-code/${shareCode}`);
    return response.data;
  },
  
  export: async (sessionId: string): Promise<Blob> => {
    const response = await api.get(`/sessions/${sessionId}/export`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Favorites API
export const favoritesAPI = {
  getFavorites: async (): Promise<string[]> => {
    const response = await api.get('/users/favorites');
    return response.data;
  },
  
  addFavorite: async (sessionId: string): Promise<void> => {
    await api.post(`/users/favorites/${sessionId}`);
  },
  
  removeFavorite: async (sessionId: string): Promise<void> => {
    await api.delete(`/users/favorites/${sessionId}`);
  },
};

export default api;
