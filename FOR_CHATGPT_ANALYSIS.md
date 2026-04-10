# Mini CRM - Код для анализа ChatGPT

> Убери токены/ключи перед отправкой

---

## 🔴 1. Frontend - AdminLeads.tsx

```typescript
// frontend/src/pages/AdminLeads.tsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAdminLeads, getSpecialists, updateLead, AdminLead, Specialist } from '../api/adminLeads'

const STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  contacted: 'В диалоге',
  booked: 'Записан',
  no_response: 'Не дозвонился',
  declined: 'Отказ'
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-green-100 text-green-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  booked: 'bg-blue-100 text-blue-800',
  no_response: 'bg-orange-100 text-orange-800',
  declined: 'bg-gray-100 text-gray-800'
}

const CHANNEL_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  email: 'Email',
  phone: 'Телефон',
  in_app: 'In App',
  vk: 'VK',
  other: 'Другое'
}

export default function AdminLeads() {
  const [leads, setLeads] = useState<AdminLead[]>([])
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  // Pagination
  const [page, setPage] = useState(0)
  const limit = 20
  
  // Modal
  const [selectedLead, setSelectedLead] = useState<AdminLead | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadSpecialists()
  }, [])

  useEffect(() => {
    loadLeads()
  }, [statusFilter, channelFilter, dateFrom, dateTo, page])

  async function loadSpecialists() {
    try {
      const data = await getSpecialists()
      setSpecialists(data)
    } catch (err) {
      console.error('Failed to load specialists:', err)
    }
  }

  async function loadLeads() {
    setLoading(true)
    setError('')
    try {
      const data = await getAdminLeads({
        status: statusFilter || undefined,
        channel: channelFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit,
        offset: page * limit
      })
      setLeads(data.leads)
      setTotal(data.total)
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(lead: AdminLead, newStatus: string) {
    try {
      await updateLead(lead.id, { status: newStatus })
      loadLeads()
    } catch (err) {
      alert('Ошибка обновления статуса')
    }
  }

  async function handleAssignSpecialist(lead: AdminLead, specialistId: string) {
    setUpdating(true)
    try {
      await updateLead(lead.id, { specialist_id: specialistId || null })
      loadLeads()
      setSelectedLead(null)
    } catch (err) {
      alert('Ошибка назначения специалиста')
    } finally {
      setUpdating(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Админ: Все лиды</h1>
          <Link to="/dashboard" className="text-blue-600 hover:underline">← На Dashboard</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Все статусы</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Канал</label>
              <select
                value={channelFilter}
                onChange={(e) => { setChannelFilter(e.target.value); setPage(0) }}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Все каналы</option>
                {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">От даты</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">До даты</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => { setStatusFilter(''); setChannelFilter(''); setDateFrom(''); setDateTo(''); setPage(0) }}
              className="text-gray-600 hover:text-gray-800"
            >
              Сбросить фильтры
            </button>
            <span className="text-gray-600">Всего: {total} лидов</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Загрузка...</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Лиды не найдены</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Имя</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Контакт</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Канал</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сегмент</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Специалист</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(lead.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {lead.meta?.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span className="font-mono">{lead.contact_value}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-gray-600">{CHANNEL_LABELS[lead.contact_channel] || lead.contact_channel}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.mh_segment_code}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer ${STATUS_COLORS[lead.status] || 'bg-gray-100'}`}
                      >
                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {lead.specialists?.full_name || (
                        <span className="text-gray-400 italic">Не назначен</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Назначить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              ←
            </button>
            <span className="px-3 py-1">
              Страница {page + 1} из {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              →
            </button>
          </div>
        )}
      </main>

      {/* Modal: Assign Specialist */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Назначить специалиста</h3>
            
            <p className="text-gray-600 mb-4">
              Лид: <strong>{selectedLead.meta?.name || selectedLead.contact_value}</strong>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Специалист</label>
              <select
                value={selectedLead.specialist_id || ''}
                onChange={(e) => {
                  setSelectedLead({ ...selectedLead, specialist_id: e.target.value || null })
                }}
                className="w-full border rounded px-3 py-2"
                disabled={updating}
              >
                <option value="">Не назначен</option>
                {specialists.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.email})</option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={updating}
              >
                Отмена
              </button>
              <button
                onClick={() => handleAssignSpecialist(selectedLead, selectedLead.specialist_id || '')}
                disabled={updating}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {updating ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 🔴 2. Frontend - API слой (adminLeads.ts)

```typescript
// frontend/src/api/adminLeads.ts
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
  meta: {
    name?: string
    score?: number
    note?: string
    source?: string
  } | null
  created_at: string
  updated_at: string
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
  data: { status?: string; specialist_id?: string | null }
): Promise<AdminLead> {
  return fetchApi<AdminLead>(`/admin/leads/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  })
}
```

---

## 🔴 3. Backend - Routes (server.ts)

```typescript
// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { authenticate, AuthRequest } from './middleware/auth';

dotenv.config();

const app = express();
const port = 3001;

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnon = process.env.SUPABASE_ANON_KEY!;
const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseService, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ============ ADMIN ROUTES ============

// GET /admin/leads - all leads with filters
app.get('/admin/leads', authenticate, async (req: AuthRequest, res) => {
  try {
    const { status, channel, dateFrom, dateTo, limit, offset } = req.query;

    let query = supabaseAdmin
      .from('leads')
      .select('*, specialists(full_name, email)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status as string);
    }
    if (channel) {
      query = query.eq('contact_channel', channel as string);
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom as string);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo as string);
    }
    if (limit) {
      query = query.limit(parseInt(limit as string));
    }
    if (offset) {
      query = query.range(
        parseInt(offset as string), 
        parseInt(offset as string) + parseInt(limit as string) - 1
      );
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({ leads: data, total: count });
  } catch (err: any) {
    console.error('Admin leads error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/specialists - all specialists
app.get('/admin/specialists', authenticate, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('specialists')
      .select('id, full_name, email')
      .order('full_name');

    if (error) throw error;

    res.json(data);
  } catch (err: any) {
    console.error('Admin specialists error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /admin/leads/:id - update lead
app.patch('/admin/leads/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, specialist_id, client_id } = req.body;

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (specialist_id !== undefined) updates.specialist_id = specialist_id;
    if (client_id !== undefined) updates.client_id = client_id;

    const { data, error } = await supabaseAdmin
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select('*, specialists(full_name, email)')
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err: any) {
    console.error('Admin update lead error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ PUBLIC ROUTES ============

// POST /api/public/leads - создание лида из mini-mh
app.post('/api/public/leads', async (req, res) => {
  try {
    const publicLeadsSchema = z.object({
      specialist_id: z.string().uuid(),
      mh_segment_code: z.string().min(1),
      contact_channel: z.enum(['telegram', 'vk', 'email', 'phone', 'in_app', 'other']),
      contact_value: z.string().min(1),
      meta: z.record(z.any()).optional()
    });

    const parseResult = publicLeadsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const { specialist_id, mh_segment_code, contact_channel, contact_value, meta } = parseResult.data;

    // Check specialist exists
    const { data: specialist } = await supabaseAdmin
      .from('specialists')
      .select('id')
      .eq('id', specialist_id)
      .single();

    if (!specialist) {
      return res.status(404).json({ error: 'Specialist not found' });
    }

    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert({
        specialist_id,
        mh_segment_code,
        contact_channel,
        contact_value,
        status: 'new',
        meta: meta ?? null
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.listen(port, () => {
  console.log(`Mini-CRM Backend running on http://localhost:${port}`);
});
```

---

## 🟡 4. Схема БД (Supabase/PostgreSQL)

```sql
-- Таблица специалистов
CREATE TABLE specialists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text,
  full_name text NOT NULL,
  timezone text DEFAULT 'Europe/Moscow',
  created_at timestamptz DEFAULT now()
);

-- Таблица лидов
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id),
  mh_segment_code text,
  contact_channel text NOT NULL CHECK (contact_channel IN ('telegram','vk','email','phone','in_app','other')),
  contact_value text NOT NULL,
  status text NOT NULL CHECK (status IN ('new','contacted','booked','no_response','declined')),
  meta jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Таблица клиентов
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  contact_channel text NOT NULL CHECK (contact_channel IN ('telegram','email','phone','other')),
  contact_value text NOT NULL,
  status text NOT NULL CHECK (status IN ('new','active','paused','closed')),
  source text NOT NULL CHECK (source IN ('manual','mental_helper','other')),
  created_at timestamptz DEFAULT now()
);

-- Таблица сессий
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  start_time timestamptz,
  duration_minutes integer DEFAULT 60,
  format text CHECK (format IN ('online','offline')),
  status text CHECK (status IN ('scheduled','done','no_show','cancelled')),
  short_summary text,
  price numeric(12,2),
  is_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

---

## 🟡 5. Пример ответа API

### GET /admin/leads
```json
{
  "leads": [
    {
      "id": "......",
      "specialist_id": ".......",
      "client_id": null,
      "mh_segment_code": "ai_bridge_insomnia",
      "contact_channel": "telegram",
      "contact_value": "@test_user",
      "status": "new",
      "meta": {
        "name": "Иван",
        "score": 7,
        "note": "Проблемы со сном уже 2 недели",
        "source": "mini_mh_app"
      },
      "created_at": "2026-03-20T14:30:00Z",
      "updated_at": "2026-03-20T14:30:00Z",
      "specialists": {
        "full_name": "Петр Петров",
        "email": "petr@example.com"
      }
    }
  ],
  "total": 15
}
```

### GET /admin/specialists
```json
[
  {
    "id": "3a955f0f-d419-46df-bf97-a116d12fadf1",
    "full_name": "Петр Петров",
    "email": "petr@example.com"
  }
]
```

---

## 🟢 6. Auth middleware

```typescript
// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false }
    }
  );
}

export interface AuthRequest extends Request {
  specialistId?: string;
  accessToken?: string;
  userClient?: SupabaseClient;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.specialistId = user.id;
    req.accessToken = token;
    req.userClient = createUserClient(token);
    
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token verification failed' });
  }
}
```

---

## 🟢 7. Откуда приходят лиды (mini-mh)

```typescript
// mini-mh/lib/crmApi.ts - клиент для отправки лидов
const CRM_API_URL = process.env.NEXT_PUBLIC_CRM_API_URL || 'http://localhost:3001/api/public/leads'
const DEFAULT_SPECIALIST_ID = '...' // твой specialist_id

function detectChannel(contact: string): { channel: string; value: string } {
  const lower = contact.toLowerCase().trim()
  
  if (lower.startsWith('@') || lower.includes('telegram')) {
    return { channel: 'telegram', value: contact.trim() }
  }
  if (lower.includes('@')) {
    return { channel: 'email', value: contact.trim() }
  }
  if (/^[\d\s\-\+\(\)]+$/.test(lower)) {
    return { channel: 'phone', value: contact.replace(/\s/g, '') }
  }
  
  return { channel: 'in_app', value: contact.trim() }
}

export async function sendLeadToCRM(data: LeadData): Promise<CRMSendResult | null> {
  const { channel, value } = detectChannel(data.contact)
  
  const payload = {
    specialist_id: DEFAULT_SPECIALIST_ID,
    mh_segment_code: data.mh_segment_code || 'ai_bridge_insomnia',
    contact_channel: channel,
    contact_value: value,
    meta: {
      name: data.name,
      score: data.score,
      note: data.note || null,
      source: 'mini_mh_app'
    }
  }

  const res = await fetch(CRM_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  if (!res.ok) throw new Error(`CRM API returned ${res.status}`)
  return await res.json()
}
```

---

## 📊 Статусы лидов

| Код | Статус | Цвет |
|-----|--------|------|
| new | Новый | 🟢 Зелёный |
| contacted | В диалоге | 🟡 Жёлтый |
| booked | Записан | 🔵 Синий |
| no_response | Не дозвонился | 🟠 Оранжевый |
| declined | Отказ | ⚪ Серый |

---

## 📝 Текущая архитектура

```
mini-mh (Next.js) 
    ↓ POST /api/public/leads
Mini CRM Backend (Express)
    ↓
Supabase DB
    ↓
Mini CRM Frontend (React) → /admin/leads
```

---

**Готов к анализу ChatGPT! 🚀**
