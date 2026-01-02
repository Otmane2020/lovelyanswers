-- Add missing columns to projects table for Business Settings
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#000000';
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS sitemap_url TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS brand_voice_url TEXT;