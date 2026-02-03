-- Create a function to sync onboarding session to admin_prospects
CREATE OR REPLACE FUNCTION public.sync_onboarding_to_prospects()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if email is provided and not null
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN
    -- Upsert into admin_prospects
    INSERT INTO public.admin_prospects (
      email,
      website,
      company,
      source,
      status,
      notes
    )
    VALUES (
      NEW.email,
      NEW.website_url,
      NEW.brand_name,
      COALESCE('onboarding - ' || NEW.utm_source, 'onboarding'),
      'interested',
      CONCAT(
        'Language: ', COALESCE(NEW.language, 'N/A'),
        ' | Step: ', COALESCE(NEW.current_step::text, '?'),
        ' | Device: ', COALESCE(NEW.device_type, 'N/A'),
        CASE WHEN NEW.checkout_started_at IS NOT NULL THEN ' | Checkout Started' ELSE '' END,
        CASE WHEN NEW.traffic_potential IS NOT NULL THEN ' | Traffic: ' || NEW.traffic_potential::text ELSE '' END
      )
    )
    ON CONFLICT (email) DO UPDATE SET
      website = COALESCE(EXCLUDED.website, admin_prospects.website),
      company = COALESCE(EXCLUDED.company, admin_prospects.company),
      notes = EXCLUDED.notes,
      updated_at = NOW()
    WHERE admin_prospects.status != 'converted';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on onboarding_sessions
DROP TRIGGER IF EXISTS sync_onboarding_prospect_trigger ON public.onboarding_sessions;
CREATE TRIGGER sync_onboarding_prospect_trigger
  AFTER INSERT OR UPDATE ON public.onboarding_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_onboarding_to_prospects();

-- Sync existing onboarding sessions with email to admin_prospects
INSERT INTO public.admin_prospects (email, website, company, source, status, notes)
SELECT 
  os.email,
  os.website_url,
  os.brand_name,
  COALESCE('onboarding - ' || os.utm_source, 'onboarding'),
  'interested',
  CONCAT(
    'Language: ', COALESCE(os.language, 'N/A'),
    ' | Step: ', COALESCE(os.current_step::text, '?'),
    ' | Device: ', COALESCE(os.device_type, 'N/A'),
    CASE WHEN os.checkout_started_at IS NOT NULL THEN ' | Checkout Started' ELSE '' END,
    CASE WHEN os.traffic_potential IS NOT NULL THEN ' | Traffic: ' || os.traffic_potential::text ELSE '' END
  )
FROM public.onboarding_sessions os
WHERE os.email IS NOT NULL AND os.email != ''
ON CONFLICT (email) DO UPDATE SET
  website = COALESCE(EXCLUDED.website, admin_prospects.website),
  company = COALESCE(EXCLUDED.company, admin_prospects.company),
  notes = EXCLUDED.notes,
  updated_at = NOW();