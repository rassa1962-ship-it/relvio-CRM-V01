import { supabase } from '../hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
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

export interface AdminLead {
  id: string
  specialist_id: string | null
  client_id: string | null
  mh_segment_code: string
  contact_channel: string
  contact_value: string
  status: string
  price: number | null
  paid_at: string | null
  meta: {
    name?: string
    score?: number
    note?: string
    source?: string
  } | null
  created_at: string
  updated_at: string
  assigned_at: string | null
  first_contact_at: string | null
  specialists?: {
    full_name: string
    email: string
  }
}

export interface Specialist {
  id: string
  full_name: string
  email: string
}

export interface LeadsResponse {
  leads: AdminLead[]
  total: number
}

export interface LeadFilters {
  status?: string
  channel?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

export async function getAdminLeads(filters: LeadFilters = {}): Promise<LeadsResponse> {
  const params = new URLSearchParams()
  
  if (filters.status) params.append('status', filters.status)
  if (filters.channel) params.append('channel', filters.channel)
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom)
  if (filters.dateTo) params.append('dateTo', filters.dateTo)
  if (filters.limit) params.append('limit', filters.limit.toString())
  if (filters.offset !== undefined) params.append('offset', filters.offset.toString())

  const query = params.toString() ? `?${params.toString()}` : ''
  return fetchApi<LeadsResponse>(`/admin/leads${query}`)
}

export async function getSpecialists(): Promise<Specialist[]> {
  return fetchApi<Specialist[]>('/admin/specialists')
}

export async function updateLead(
  id: string, 
  data: { status?: string; specialist_id?: string | null; price?: number }
): Promise<AdminLead> {
  return fetchApi<AdminLead>(`/admin/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}
