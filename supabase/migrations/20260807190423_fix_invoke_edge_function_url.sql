/*
# Fix invoke_edge_function URL

## Purpose
The previous migration used the wrong project ref (0ec90b57d6e95fcbda19832f
from .env) instead of the correct one (pnohfokjlhpzrkczruju).

## Changes
- Replaces invoke_edge_function with the correct URL.
*/

CREATE OR REPLACE FUNCTION public.invoke_edge_function(function_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  request_id bigint;
  key text;
BEGIN
  SELECT decrypted_secret INTO key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key';

  IF key IS NULL THEN
    RAISE EXCEPTION 'Vault secret "service_role_key" is missing; cron job % cannot authenticate', function_name;
  END IF;

  SELECT net.http_post(
    url := 'https://pnohfokjlhpzrkczruju.supabase.co/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || key
    ),
    body := '{}'::jsonb
  ) INTO request_id;

  RETURN request_id;
END $$;

COMMENT ON FUNCTION public.invoke_edge_function(text) IS
  'Calls a Supabase edge function from pg_cron, authenticating with the key held in Vault.';
