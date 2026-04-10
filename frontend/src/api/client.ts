import { supabase } from '../hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export type SpecialistRole = 'admin' | 'specialist';

export type CurrentUser = {
  id: string;
  email: string;
  full_name: string;
  timezone: string | null;
  role: SpecialistRole;
};

export type FunnelSummary = {
  new: number;
  contacted: number;
  booked: number;
  paid: number;
  no_response: number;
  declined: number;
  stale: number;
  avgResponseMinutes: number;
  revenue: number;
};

type Session = {
  id: string;
  client_id: string;
  start_time: string;
  duration_minutes: number;
  format: 'online' | 'offline';
  status: 'scheduled' | 'done' | 'no_show' | 'cancelled';
  short_summary?: string;
  price?: number;
  is_paid: boolean;
  clients?: {
    display_name: string;
  };
};

export type Lead = {
  id: string;
  specialist_id: string;
  client_id: string | null;
  mh_segment_code?: string;
  contact_channel: string;
  contact_value: string;
  status: 'new' | 'contacted' | 'booked' | 'paid' | 'no_response' | 'declined';
  created_at: string;
  updated_at: string;
  first_contact_at?: string | null;
  decline_reason?: string | null;
  meta?: Record<string, any>;
  price?: number;
  paid_at?: string | null;
};

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Get current session token
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Получить текущего пользователя с ролью
  async getMe(): Promise<CurrentUser | null> {
    try {
      return await fetchApi<CurrentUser>('/api/me');
    } catch {
      return null;
    }
  },

  async funnel(): Promise<FunnelSummary> {
    try {
      return await fetchApi<FunnelSummary>('/api/funnel/summary');
    } catch {
      // Return empty summary if API fails
      return {
        new: 0,
        contacted: 0,
        booked: 0,
        paid: 0,
        no_response: 0,
        declined: 0,
        stale: 0,
        avgResponseMinutes: 0,
        revenue: 0,
      };
    }
  },

  async sessions(params: { from?: string; to?: string; client_id?: string } = {}): Promise<Session[]> {
    const queryParams = new URLSearchParams();
    if (params.from) queryParams.set('from', params.from);
    if (params.to) queryParams.set('to', params.to);
    if (params.client_id) queryParams.set('client_id', params.client_id);
    
    const query = queryParams.toString();
    try {
      return await fetchApi<Session[]>(`/api/sessions${query ? `?${query}` : ''}`);
    } catch {
      return [];
    }
  },

  async leads(status?: string): Promise<Lead[]> {
    const query = status ? `?status=${status}` : '';
    try {
      return await fetchApi<Lead[]>(`/api/leads${query}`);
    } catch {
      return [];
    }
  },

  async updateLead(id: string, data: { status?: string; client_id?: string; decline_reason?: string }): Promise<Lead> {
    return fetchApi<Lead>(`/api/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async clients(): Promise<any[]> {
    try {
      return await fetchApi<any[]>('/api/clients');
    } catch {
      return [];
    }
  },

  async createClient(data: {
    display_name: string;
    contact_channel: string;
    contact_value: string;
    status?: string;
    source?: string;
  }): Promise<any> {
    return fetchApi<any>('/api/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async createLead(data: {
    specialist_id: string;
    contact_channel: string;
    contact_value: string;
    mh_segment_code?: string;
  }): Promise<Lead> {
    return fetchApi<Lead>('/api/public/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Получить забытые лиды (без действия более 2 часов)
  async getStaleLeads(): Promise<Lead[]> {
    try {
      return await fetchApi<Lead[]>('/api/leads/stale');
    } catch {
      return [];
    }
  },

  // Получить расширенную статистику воронки
  async getFunnelSummary(): Promise<FunnelSummary> {
    try {
      return await fetchApi<FunnelSummary>('/api/funnel/summary');
    } catch {
      return {
        new: 0,
        contacted: 0,
        booked: 0,
        paid: 0,
        no_response: 0,
        declined: 0,
        stale: 0,
        avgResponseMinutes: 0,
        revenue: 0,
      };
    }
  },
};
