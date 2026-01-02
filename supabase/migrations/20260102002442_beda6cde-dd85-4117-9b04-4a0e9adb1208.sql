-- Create reddit_responses table for storing Reddit engagement content
CREATE TABLE public.reddit_responses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    reddit_post_url TEXT NOT NULL,
    reddit_post_title TEXT NOT NULL,
    subreddit TEXT NOT NULL,
    original_question TEXT,
    generated_reply TEXT NOT NULL,
    reply_mode TEXT DEFAULT 'neutral', -- 'neutral' or 'with_brand'
    is_shared BOOLEAN DEFAULT false, -- Published on user's site
    is_posted_to_reddit BOOLEAN DEFAULT false, -- Actually posted to Reddit
    linked_answer_id UUID REFERENCES public.answers(id) ON DELETE SET NULL, -- If converted to AEO
    brand_mentioned BOOLEAN DEFAULT false,
    link_included BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reddit_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their project reddit responses" 
ON public.reddit_responses 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = reddit_responses.project_id 
    AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can create reddit responses for their projects" 
ON public.reddit_responses 
FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = reddit_responses.project_id 
    AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can update their project reddit responses" 
ON public.reddit_responses 
FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = reddit_responses.project_id 
    AND projects.user_id = auth.uid()
));

CREATE POLICY "Users can delete their project reddit responses" 
ON public.reddit_responses 
FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = reddit_responses.project_id 
    AND projects.user_id = auth.uid()
));

-- Public access for shared responses (for user's public site)
CREATE POLICY "Anyone can view shared reddit responses" 
ON public.reddit_responses 
FOR SELECT 
USING (is_shared = true);

-- Index for performance
CREATE INDEX idx_reddit_responses_project_id ON public.reddit_responses(project_id);
CREATE INDEX idx_reddit_responses_subreddit ON public.reddit_responses(subreddit);
CREATE INDEX idx_reddit_responses_is_shared ON public.reddit_responses(is_shared);

-- Trigger for updated_at
CREATE TRIGGER update_reddit_responses_updated_at
BEFORE UPDATE ON public.reddit_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();