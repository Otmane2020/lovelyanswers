-- Table pour logger les appels IA et WhatsApp
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email       text,
  phone       text,
  lang        text,
  results     jsonb,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Seul le service role peut lire/écrire
CREATE POLICY "service_role_only" ON public.automation_logs
  USING (false);
