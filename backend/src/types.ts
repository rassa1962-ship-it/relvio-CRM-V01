export type SpecialistRole = 'admin' | 'specialist';

export interface Specialist {
  id: string;
  email: string;
  full_name: string;
  timezone: string;
  role: SpecialistRole;
  created_at: string;
}

export interface Lead {
  id: string;
  specialist_id: string;
  client_id: string | null;
  mh_segment_code?: string;
  contact_channel: string;
  contact_value: string;
  status: 'new' | 'contacted' | 'booked' | 'no_response' | 'declined';
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  specialist_id: string;
  display_name: string;
  contact_channel: string;
  contact_value: string;
  status: 'new' | 'active' | 'paused' | 'closed';
  source: string;
  created_at: string;
}

export interface Session {
  id: string;
  client_id: string;
  start_time: string;
  duration_minutes: number;
  format: 'online' | 'offline';
  status: 'scheduled' | 'done' | 'no_show' | 'cancelled';
  short_summary?: string;
  price?: number;
  is_paid: boolean;
  created_at: string;
}

export interface FunnelSummary {
  new: number;
  contacted: number;
  booked: number;
  ['no_response']: number;
  declined: number;
}

export type LeadStatus = 'new' | 'contacted' | 'booked' | 'no_response' | 'declined';

