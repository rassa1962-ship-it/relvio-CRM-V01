-- Add new fields to leads table
-- Execute in Supabase SQL Editor

-- Issue type (sleep, anxiety, overload, other)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS issue_type text;

-- Source (organic, paid, referral, social, other)
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'organic';

-- UTM parameters
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS utm_source text;

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS utm_medium text;

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS utm_campaign text;

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_issue_type ON public.leads(issue_type);
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON public.leads(utm_source);
