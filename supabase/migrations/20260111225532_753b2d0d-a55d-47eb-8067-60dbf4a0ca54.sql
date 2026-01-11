-- Create function to call the email trigger edge function
CREATE OR REPLACE FUNCTION public.notify_email_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  payload json;
  edge_function_url text;
  service_role_key text;
BEGIN
  -- Build payload
  payload := json_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'record', row_to_json(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
  );
  
  -- Get the edge function URL from environment
  edge_function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/db-email-trigger';
  
  -- Make HTTP request to edge function (async via pg_net if available, otherwise skip)
  -- Note: This uses pg_net extension for async HTTP calls
  PERFORM net.http_post(
    url := edge_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := payload::jsonb
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the transaction if email fails
    RAISE WARNING 'Email trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new profiles (welcome email)
DROP TRIGGER IF EXISTS trigger_welcome_email ON public.profiles;
CREATE TRIGGER trigger_welcome_email
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_email_on_insert();

-- Create trigger for new support tickets (admin notification)
DROP TRIGGER IF EXISTS trigger_new_ticket_email ON public.support_tickets;
CREATE TRIGGER trigger_new_ticket_email
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_email_on_insert();

-- Create trigger for support messages (user notification when admin replies)
DROP TRIGGER IF EXISTS trigger_support_reply_email ON public.support_messages;
CREATE TRIGGER trigger_support_reply_email
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_email_on_insert();