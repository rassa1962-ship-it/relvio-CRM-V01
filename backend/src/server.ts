import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { authenticate, AuthRequest, requireAdmin } from './middleware/auth';
import type * as types from './types';

dotenv.config();

const app = express();
const port = 3001;

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3002'],
  credentials: true
}));
app.use(express.json());

// simple request logger
app.use((req, res, next) => {
  console.log('INCOMING', req.method, req.url);
  next();
});

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnon = process.env.SUPABASE_ANON_KEY!;
const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabasePublic = createClient(supabaseUrl, supabaseAnon);
const supabaseAdmin = createClient(supabaseUrl, supabaseService, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Schema for public leads
const publicLeadsSchema = z.object({
  specialist_id: z.string().uuid().optional(),
  mh_segment_code: z.string().min(1),
  contact_channel: z.enum(['telegram', 'vk', 'email', 'phone', 'in_app', 'other']),
  contact_value: z.string().min(1),
  issue_type: z.enum(['sleep', 'anxiety', 'overload', 'other']).optional(),
  source: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  meta: z.record(z.any()).optional()
});

// Авто-распределение лида специалисту с наименьшей нагрузкой
async function assignLeadAutomatically(): Promise<string | null> {
  try {
    // Получаем всех специалистов
    const { data: specialists, error: specError } = await supabaseAdmin
      .from('specialists')
      .select('id');

    if (specError || !specialists || specialists.length === 0) {
      return null;
    }

    // Получаем лидов со специалистами
    const { data: leads, error: leadsError } = await supabaseAdmin
      .from('leads')
      .select('specialist_id, status')
      .not('specialist_id', 'is', null);

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      return specialists[0].id;
    }

    // Считаем нагрузку (new + contacted)
    const loadMap: Record<string, number> = {};
    leads?.forEach((l: any) => {
      if (['new', 'contacted'].includes(l.status)) {
        loadMap[l.specialist_id] = (loadMap[l.specialist_id] || 0) + 1;
      }
    });

    // Выбираем специалиста с наименьшей нагрузкой
    let bestId = specialists[0].id;
    let minLoad = loadMap[specialists[0].id] || 0;

    specialists.forEach((s: any) => {
      const load = loadMap[s.id] || 0;
      if (load < minLoad) {
        minLoad = load;
        bestId = s.id;
      }
    });

    return bestId;
  } catch (err) {
    console.error('Auto-assign error:', err);
    return null;
  }
}

// POST /api/public/leads
app.post('/api/public/leads', async (req, res) => {
  try {
    const parseResult = publicLeadsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Invalid input', details: parseResult.error.flatten() });
    }

    const { specialist_id, mh_segment_code, contact_channel, contact_value, issue_type, source, utm_source, utm_medium, utm_campaign, meta } = parseResult.data;

    // Авто-распределение если specialist_id не передан
    const assignedSpecialistId = await assignLeadAutomatically();

    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert({
        specialist_id: assignedSpecialistId,
        mh_segment_code,
        contact_channel,
        contact_value,
        status: 'new',
        issue_type: issue_type ?? null,
        source: source ?? 'organic',
        utm_source: utm_source ?? null,
        utm_medium: utm_medium ?? null,
        utm_campaign: utm_campaign ?? null,
        meta: meta ?? null,
        assigned_at: assignedSpecialistId ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Auth middleware routes

// GET /api/me
app.get('/api/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const { specialistId, userClient } = req;
    const { data, error } = await userClient!
      .from('specialists')
      .select('*')
      .eq('id', specialistId)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads
app.get('/api/leads', authenticate, async (req: AuthRequest, res) => {
  try {
    const { userClient } = req;
    const status = req.query.status as string | undefined;

    let query = userClient!
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/leads/:id
app.patch('/api/leads/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { specialistId, userClient } = req;
    const id = req.params.id;
    const { status, client_id } = req.body;

    const { data, error } = await userClient!
      .from('leads')
      .update({
        status,
        client_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('specialist_id', specialistId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients
app.get('/api/clients', authenticate, async (req: AuthRequest, res) => {
  const { specialistId, userClient } = req;
  const { data, error } = await userClient!
    .from('clients')
    .select('*')
    .eq('specialist_id', specialistId);

  if (error) throw error;

  res.json(data);
});

// POST /api/clients
app.post('/api/clients', authenticate, async (req: AuthRequest, res) => {
  try {
    const { specialistId } = req;
    const bodySchema = z.object({
      display_name: z.string(),
      contact_channel: z.enum(['telegram','email','phone','other']),
      contact_value: z.string(),
      status: z.enum(['new','active','paused','closed']).default('active'),
      source: z.enum(['manual','mental_helper','other']).default('manual')
    });
    const { display_name, contact_channel, contact_value, status, source } = bodySchema.parse(req.body);

    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert({
        specialist_id: specialistId,
        display_name,
        contact_channel,
        contact_value,
        status,
        source
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions
app.get('/api/sessions', authenticate, async (req: AuthRequest, res) => {
  const { specialistId, userClient } = req;
  const from = req.query.from as string;
  const to = req.query.to as string;
  const client_id = req.query.client_id as string;

  let query = userClient!
    .from('sessions')
    .select('*, clients!inner(*)')
    .eq('clients.specialist_id', specialistId);

  if (client_id) query = query.eq('client_id', client_id);
  if (from && to) query = query.gte('start_time', from).lte('start_time', to);

  const { data, error } = await query.order('start_time');

  if (error) throw error;

  res.json(data);
});

// POST /api/sessions
app.post('/api/sessions', authenticate, async (req: AuthRequest, res) => {
  try {
    const { specialistId } = req;
    const bodySchema = z.object({
      client_id: z.string().uuid(),
      start_time: z.string(),
      duration_minutes: z.number().default(60),
      format: z.enum(['online','offline']),
      status: z.enum(['scheduled','done','no_show','cancelled']).default('scheduled'),
      short_summary: z.string().optional(),
      price: z.number().optional(),
      is_paid: z.boolean().default(false)
    });
    const body = bodySchema.parse(req.body);

    // Check client belongs to specialist
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('id', body.client_id)
      .eq('specialist_id', specialistId)
      .single();

    if (!client) {
      return res.status(404).json({ error: 'Client not found or not yours' });
    }

    const { data, error } = await supabaseAdmin
      .from('sessions')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

// ============ ADMIN ROUTES (require admin role) ============

// GET /admin/leads - all leads with filters (admin only)
app.get('/admin/leads', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status, channel, dateFrom, dateTo, limit, offset, source, issue_type, utm_source } = req.query;

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
    if (source) {
      query = query.eq('source', source as string);
    }
    if (issue_type) {
      query = query.eq('issue_type', issue_type as string);
    }
    if (utm_source) {
      query = query.eq('utm_source', utm_source as string);
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
      query = query.range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({ leads: data, total: count });
  } catch (err: any) {
    console.error('Admin leads error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /admin/specialists - all specialists for assignment
app.get('/admin/specialists', authenticate, requireAdmin, async (req: AuthRequest, res) => {
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

// PATCH /admin/leads/:id - update lead (admin, any specialist)
app.patch('/admin/leads/:id', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, specialist_id, client_id, price } = req.body;

    // Получаем текущий лид
    const { data: existingLead } = await supabaseAdmin
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (!existingLead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    
    if (status) updates.status = status;
    if (specialist_id !== undefined) {
      updates.specialist_id = specialist_id;
      if (specialist_id) {
        updates.assigned_at = new Date().toISOString();
      }
    }
    if (client_id !== undefined) updates.client_id = client_id;
    
    // При статусе contacted - first_contact_at
    if (status === 'contacted' && !existingLead.first_contact_at) {
      updates.first_contact_at = new Date().toISOString();
    }
    
    // При статусе paid - paid_at и price
    if (status === 'paid') {
      updates.paid_at = new Date().toISOString();
      if (price !== undefined) {
        updates.price = price;
      }
    }

    // Обновляем лид
    const { data, error } = await supabaseAdmin
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select('*, specialists(full_name, email)')
      .single();

    if (error) throw error;

    // При статусе booked - создаём клиента автоматически
    if (status === 'booked' && existingLead.status !== 'booked') {
      try {
        await supabaseAdmin.from('clients').insert({
          specialist_id: existingLead.specialist_id,
          display_name: existingLead.meta?.name || 'Клиент',
          contact_channel: existingLead.contact_channel,
          contact_value: existingLead.contact_value,
          status: 'active',
          source: existingLead.meta?.source || 'mental_helper'
        });
        console.log('✅ Клиент создан автоматически для лида:', id);
      } catch (clientErr) {
        console.error('❌ Ошибка создания клиента:', clientErr);
      }
    }

    res.json(data);
  } catch (err: any) {
    console.error('Admin update lead error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/funnel/summary - расширенная статистика для мини-дашборда
app.get('/api/funnel/summary', authenticate, async (req: AuthRequest, res) => {
  try {
    const { specialistId, userClient } = req;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const statuses = ['new', 'contacted', 'booked', 'paid', 'no_response', 'declined'] as const;
    const summary: Record<string, number> = {
      new: 0,
      contacted: 0,
      booked: 0,
      paid: 0,
      no_response: 0,
      declined: 0
    };

    // Получаем количество по статусам
    for (const status of statuses) {
      const { count, error } = await userClient!
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('specialist_id', specialistId)
        .eq('status', status)
        .gte('created_at', thirtyDaysAgo);

      if (!error) summary[status] = count || 0;
    }

    // Получаем забытые лиды (new/contacted без действия > 2 часов)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { count: staleCount } = await userClient!
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('specialist_id', specialistId)
      .in('status', ['new', 'contacted'])
      .lt('updated_at', twoHoursAgo);

    summary.stale = staleCount || 0;

    // Получаем среднее время ответа (для тех, у кого есть first_contact_at)
    const { data: leadsWithContact } = await userClient!
      .from('leads')
      .select('created_at, first_contact_at')
      .eq('specialist_id', specialistId)
      .not('first_contact_at', 'is', null)
      .gte('created_at', thirtyDaysAgo);

    if (leadsWithContact && leadsWithContact.length > 0) {
      const totalMs = leadsWithContact.reduce((sum, l) => {
        const created = new Date(l.created_at).getTime();
        const contacted = new Date(l.first_contact_at!).getTime();
        return sum + (contacted - created);
      }, 0);
      summary.avgResponseMinutes = Math.round(totalMs / leadsWithContact.length / 60000);
    } else {
      summary.avgResponseMinutes = 0;
    }

    // Получаем выручку за 30 дней
    const { data: paidLeads } = await userClient!
      .from('leads')
      .select('price')
      .eq('specialist_id', specialistId)
      .eq('status', 'paid')
      .not('price', 'is', null)
      .gte('paid_at', thirtyDaysAgo);

    summary.revenue = paidLeads?.reduce((sum, l) => sum + (l.price || 0), 0) || 0;

    res.json(summary);
  } catch (err: any) {
    console.error('Funnel summary error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/stale - забытые лиды (нужны срочные действия)
app.get('/api/leads/stale', authenticate, async (req: AuthRequest, res) => {
  try {
    const { specialistId, userClient } = req;
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data, error } = await userClient!
      .from('leads')
      .select('*')
      .eq('specialist_id', specialistId)
      .in('status', ['new', 'contacted'])
      .lt('updated_at', twoHoursAgo)
      .order('updated_at', { ascending: true });

    if (error) throw error;

    // Добавляем информацию о времени бездействия
    const now = Date.now();
    const enrichedData = data?.map(lead => ({
      ...lead,
      staleHours: Math.round((now - new Date(lead.updated_at).getTime()) / (1000 * 60 * 60) * 10) / 10
    }));

    res.json(enrichedData || []);
  } catch (err: any) {
    console.error('Stale leads error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/by-source - статистика по источникам
app.get('/api/analytics/by-source', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const from = dateFrom ? dateFrom as string : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const to = dateTo ? dateTo as string : new Date().toISOString();

    // Получаем всех лидов с группировкой по source
    const { data, error } = await supabaseAdmin
      .from('leads')
      .select('source, issue_type, status, utm_source')
      .gte('created_at', from)
      .lte('created_at', to);

    if (error) throw error;

    // Группируем по source
    const sourceStats: Record<string, { total: number; new: number; contacted: number; booked: number; paid: number }> = {};
    
    data?.forEach((lead: any) => {
      const source = lead.source || 'unknown';
      if (!sourceStats[source]) {
        sourceStats[source] = { total: 0, new: 0, contacted: 0, booked: 0, paid: 0 };
      }
      sourceStats[source].total++;
      if (lead.status === 'new') sourceStats[source].new++;
      if (lead.status === 'contacted') sourceStats[source].contacted++;
      if (lead.status === 'booked') sourceStats[source].booked++;
      if (lead.status === 'paid') sourceStats[source].paid++;
    });

    // Группируем по issue_type
    const issueTypeStats: Record<string, { total: number; booked: number; paid: number }> = {};
    
    data?.forEach((lead: any) => {
      const issueType = lead.issue_type || 'unknown';
      if (!issueTypeStats[issueType]) {
        issueTypeStats[issueType] = { total: 0, booked: 0, paid: 0 };
      }
      issueTypeStats[issueType].total++;
      if (lead.status === 'booked') issueTypeStats[issueType].booked++;
      if (lead.status === 'paid') issueTypeStats[issueType].paid++;
    });

    res.json({
      bySource: sourceStats,
      byIssueType: issueTypeStats,
      dateRange: { from, to }
    });
  } catch (err: any) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Mini-CRM Backend running on http://localhost:${port}`);
  console.log('Available routes:');
  console.log('  POST /api/public/leads');
  console.log('  GET  /api/admin/leads');
  console.log('  GET  /api/admin/specialists');
  console.log('  PATCH /api/admin/leads/:id');
  console.log('  GET  /api/analytics/by-source');
});
