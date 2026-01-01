import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  MessageSquare, Search, Copy, Check, TrendingUp, 
  Sparkles, FileText, RefreshCw, ExternalLink, Globe
} from "lucide-react";
import { toast } from "sonner";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

interface AeoAnswer {
  id: string;
  question: string;
  answer: string;
  platforms: string[];
  score: number;
  created_at: string;
  slug: string | null;
  is_public: boolean | null;
  has_article: boolean | null;
}

export default function AeoAnswers() {
  const { user } = useAuth();
  
  const [answers, setAnswers] = useState<AeoAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAnswers();
    }
  }, [user]);

  const fetchAnswers = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('answers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnswers(data || []);
    } catch (error) {
      console.error('Error fetching answers:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (question: string): string => {
    let slug = question.toLowerCase();
    slug = slug.replace(/[àáâãäå]/g, 'a');
    slug = slug.replace(/[èéêë]/g, 'e');
    slug = slug.replace(/[ìíîï]/g, 'i');
    slug = slug.replace(/[òóôõö]/g, 'o');
    slug = slug.replace(/[ùúûü]/g, 'u');
    slug = slug.replace(/[ç]/g, 'c');
    slug = slug.replace(/[^a-z0-9\s-]/g, '');
    slug = slug.replace(/\s+/g, '-');
    slug = slug.replace(/-+/g, '-');
    slug = slug.replace(/^-|-$/g, '');
    return slug.slice(0, 100);
  };

  const publishAnswer = async (answer: AeoAnswer) => {
    if (!user) return;
    
    setPublishingId(answer.id);
    try {
      const slug = generateSlug(answer.question);
      
      const { error } = await supabase
        .from('answers')
        .update({
          is_public: true,
          slug: slug
        })
        .eq('id', answer.id);

      if (error) throw error;
      
      toast.success("Answer published!");
      fetchAnswers();
    } catch (error) {
      console.error('Error publishing answer:', error);
      toast.error("Error publishing");
    } finally {
      setPublishingId(null);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Answer copied!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyPublicUrl = async (answer: AeoAnswer) => {
    const url = `${window.location.origin}/answers/${answer.slug}`;
    await navigator.clipboard.writeText(url);
    toast.success("Public URL copied!");
  };

  const openPublicUrl = (answer: AeoAnswer) => {
    const url = `/answers/${answer.slug}`;
    window.open(url, '_blank');
  };

  const getPlatformColor = (platform: string | undefined) => {
    if (!platform) return "bg-violet-500/20 text-violet-400 border-violet-500/30";
    const colors: Record<string, string> = {
      chatgpt: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      gemini: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      claude: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      perplexity: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      copilot: "bg-blue-600/20 text-blue-400 border-blue-600/30",
    };
    return colors[platform?.toLowerCase()] || "bg-violet-500/20 text-violet-400 border-violet-500/30";
  };

  const filteredAnswers = answers.filter(answer => 
    answer.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    answer.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">AEO Answers</h1>
            <p className="text-muted-foreground mt-1">Your answers optimized for AI assistants</p>
          </div>
          <Button onClick={fetchAnswers} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{answers.length}</p>
                <p className="text-xs text-muted-foreground">Total answers</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{answers.filter(a => a.is_public).length}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {answers.length > 0 
                    ? Math.round(answers.reduce((sum, a) => sum + (a.score || 0), 0) / answers.length)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Avg score</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold">{answers.filter(a => (a.score || 0) >= 80).length}</p>
                <p className="text-xs text-muted-foreground">High citation</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Answers List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : filteredAnswers.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No answers yet</h3>
            <p className="text-muted-foreground mb-6">
              Generate AEO opportunities to create your first answers.
            </p>
            <Button className="bg-gradient-to-r from-violet-500 to-blue-500 hover:from-violet-600 hover:to-blue-600 text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              Start wizard
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAnswers.map((answer) => (
              <Card key={answer.id} className="p-6 hover:shadow-md transition-all">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{answer.question}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {answer.platforms?.[0] && (
                            <Badge className={getPlatformColor(answer.platforms[0])}>
                              {answer.platforms[0]}
                            </Badge>
                          )}
                          <Badge variant="outline">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {answer.score || 0}%
                          </Badge>
                          {answer.is_public && (
                            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">
                              <Globe className="w-3 h-3 mr-1" />
                              Published
                            </Badge>
                          )}
                          {answer.has_article && (
                            <Badge variant="outline" className="border-blue-500/30 text-blue-600">
                              <FileText className="w-3 h-3 mr-1" />
                              Linked article
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4 ml-13">
                      <p className="text-sm leading-relaxed">{answer.answer}</p>
                    </div>
                    
                    {/* Public URL display if published */}
                    {answer.is_public && answer.slug && (
                      <div className="flex items-center gap-2 ml-13 mt-2">
                        <span className="text-xs text-muted-foreground">URL:</span>
                        <code className="text-xs text-primary bg-muted px-2 py-1 rounded">
                          /answers/{answer.slug}
                        </code>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => copyPublicUrl(answer)}
                          className="h-6 px-2"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => openPublicUrl(answer)}
                          className="h-6 px-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!answer.is_public ? (
                      <Button 
                        size="sm"
                        onClick={() => publishAnswer(answer)}
                        disabled={publishingId === answer.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {publishingId === answer.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Globe className="w-4 h-4 mr-1" />
                            Publish
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => openPublicUrl(answer)}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(answer.answer, answer.id)}
                    >
                      {copiedId === answer.id ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}