-- Create admin_prospects table for manually added prospects
CREATE TABLE public.admin_prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  company TEXT,
  website TEXT,
  phone TEXT,
  source TEXT,
  notes TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint on email
ALTER TABLE public.admin_prospects ADD CONSTRAINT admin_prospects_email_unique UNIQUE (email);

-- Enable RLS
ALTER TABLE public.admin_prospects ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only (admin can do everything)
CREATE POLICY "Admin can manage all prospects" 
ON public.admin_prospects 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_admin_prospects_updated_at
BEFORE UPDATE ON public.admin_prospects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();