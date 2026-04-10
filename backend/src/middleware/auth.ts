import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client (service role) - bypasses RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create user client with access token - respects RLS
export function createUserClient(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export interface AuthRequest extends Request {
  specialistId?: string;
  specialistRole?: 'admin' | 'specialist';
  accessToken?: string;
  userClient?: SupabaseClient;
}

// Cache for role checking (5 min TTL)
const roleCache = new Map<string, { role: string; expires: number }>();

async function getSpecialistRole(userId: string): Promise<string> {
  const cached = roleCache.get(userId);
  if (cached && cached.expires > Date.now()) {
    return cached.role;
  }

  const { data, error } = await supabaseAdmin
    .from('specialists')
    .select('role')
    .eq('auth_user_id', userId)
    .single();

  const role = error ? 'specialist' : (data?.role || 'specialist');
  roleCache.set(userId, { role, expires: Date.now() + 5 * 60 * 1000 });
  return role;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    // Verify JWT with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get specialist role
    const role = await getSpecialistRole(user.id);

    // Store specialistId, role and accessToken
    req.specialistId = user.id;
    req.specialistRole = role as 'admin' | 'specialist';
    req.accessToken = token;
    
    // Create user client that respects RLS
    req.userClient = createUserClient(token);
    
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token verification failed' });
  }
}

// Middleware to check if user is admin
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.specialistRole !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
}
