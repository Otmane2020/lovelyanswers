import { useState, useEffect } from 'react';
import { AccountSettings } from '@/components/dashboard/AccountSettings';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Sparkles, ExternalLink, CreditCard, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AeoAccount() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [planName, setPlanName] = useState<string | null>(null);
  const [isTrialing, setIsTrialing] = useState(false);

  useEffect(() => {
    const loadPlan = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        setPlanName('Free');
      }
    };

    loadPlan();
  }, [user]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">My Account</h1>
        {planName && (
          <Badge variant="secondary" className="mt-2 bg-primary/10 text-primary">
            <Sparkles className="w-3 h-3 mr-1" />
            {isTrialing ? 'Free trial' : planName}
          </Badge>
        )}
      </div>

      {/* Profile Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Profile Settings</h2>
        <AccountSettings />
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Subscription Card */}
        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/subscription')}>
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Manage subscription</h3>
              <p className="text-sm text-muted-foreground">View plans and upgrade</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>

        {/* External Link Card */}
        <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-muted">
              <ExternalLink className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Documentation</h3>
              <p className="text-sm text-muted-foreground">Guides and resources</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Link to AeoRocket.io */}
      <div className="text-center pt-4">
        <a 
          href="https://aeorocket.io" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm"
        >
          <ExternalLink className="h-4 w-4" />
          aeorocket.io
        </a>
      </div>
    </div>
  );
}