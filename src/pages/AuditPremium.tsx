import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreRing } from "@/components/ui/score-ring";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import {
  ArrowRight,
  Globe,
  TrendingUp,
  Target,
  Users,
  Zap,
  Shield,
  BarChart3,
  Search,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Clock,
  ChevronRight,
} from "lucide-react";

type Report = {
  id: string;
  url: string;
  slug: string;
  company_info: any;
  scores: any;
  macro_analysis: any;
  micro_analysis: any;
  recommendations: any;
  kpi_tracking: any[];
};

export default function AuditPremium() {
  const [searchParams] = useSearchParams();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState(searchParams.get("url") || "");

  useEffect(() => {
    const urlParam = searchParams.get("url");
    const idParam = searchParams.get("id");

    if (idParam) {
      loadReportById(idParam);
    } else if (urlParam) {
      analyzeUrl(urlParam);
    }
  }, [searchParams]);

  const loadReportById = async (id: string) => {
    setLoading(true);
    setError(null);
    const { data, error: dbError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (dbError || !data) {
      setError("Report not found");
    } else {
      setReport(data as any);
    }
    setLoading(false);
  };

  const analyzeUrl = async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-aeo", {
        body: { url },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setReport(data.report);
    } catch (err: any) {
      setError(err.message || "Analysis failed");
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      analyzeUrl(urlInput.trim());
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "Critique": return "bg-red-100 text-red-700 border-red-200";
      case "Élevé": return "bg-orange-100 text-orange-700 border-orange-200";
      case "Moyen": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default: return "bg-green-100 text-green-700 border-green-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critique": return "bg-red-500";
      case "Haute": return "bg-orange-500";
      case "Moyenne": return "bg-yellow-500";
      default: return "bg-green-500";
    }
  };

  return (
    <>
      <Helmet>
        <title>Premium AEO Audit – Competitor Analysis | LovelyAnswers</title>
        <meta name="description" content="Get a comprehensive AEO audit with competitor analysis, market trends, and strategic recommendations." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Navbar */}
        <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
          <div className="container flex h-16 items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-2">
              <AnimatedLogo size="md" />
              <span className="text-lg font-bold tracking-tight">
                Lovely<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">Answers</span>
              </span>
            </Link>
            <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 text-white" asChild>
              <Link to="/onboarding">
                <Sparkles className="h-4 w-4" />
                Start Free
              </Link>
            </Button>
          </div>
        </nav>

        {/* Input / Loading / Error */}
        {!report && !loading && (
          <section className="py-20">
            <div className="container px-4 max-w-2xl mx-auto text-center">
              <Badge className="mb-4 bg-violet-100 text-violet-700 border-violet-200">
                <BarChart3 className="mr-1 h-3 w-3" />
                Premium Audit
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                AEO/GSO Premium Audit
              </h1>
              <p className="text-muted-foreground mb-8">
                Competitor analysis, market trends, and strategic recommendations — all free.
              </p>
              {error && (
                <div className="mb-6 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex gap-3">
                <div className="relative flex-1">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="url"
                    placeholder="https://yourwebsite.com"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="pl-12 h-14 text-lg border-2 border-primary/20 focus:border-primary"
                    required
                  />
                </div>
                <Button type="submit" size="lg" className="h-14 px-8 gap-2 bg-gradient-to-r from-primary to-violet-500 text-white">
                  Analyze
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </section>
        )}

        {loading && (
          <section className="py-20">
            <div className="container px-4 max-w-4xl mx-auto text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="inline-block mb-6"
              >
                <Search className="h-12 w-12 text-primary" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">Deep Analysis in Progress...</h2>
              <p className="text-muted-foreground mb-8">Scraping content, analyzing competitors, generating report (~30s)</p>
              <div className="space-y-4 max-w-2xl mx-auto">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Report Display */}
        {report && !loading && (
          <div className="container px-4 py-8 max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <Badge className="mb-3 bg-emerald-100 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Premium Audit Complete
              </Badge>
              <h1 className="text-2xl md:text-3xl font-bold">
                {report.company_info?.name || report.url}
              </h1>
              {report.company_info?.tagline && (
                <p className="text-muted-foreground mt-1">{report.company_info.tagline}</p>
              )}
              {report.company_info?.sector && (
                <Badge variant="outline" className="mt-2">
                  <Building2 className="mr-1 h-3 w-3" />
                  {report.company_info.sector}
                </Badge>
              )}
            </motion.div>

            {/* Scores */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Scores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    {[
                      { label: "Global", value: report.scores?.global },
                      { label: "GSO", value: report.scores?.gso },
                      { label: "AEO", value: report.scores?.aeo },
                      { label: "Schema", value: report.scores?.schema },
                      { label: "Content", value: report.scores?.content },
                    ].map((s) => (
                      <div key={s.label} className="flex flex-col items-center gap-2">
                        <ScoreRing score={s.value || 0} size="lg" />
                        <span className="text-sm font-medium text-muted-foreground">{s.label}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* KPIs */}
            {report.company_info?.kpis?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {report.company_info.kpis.map((kpi: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="p-4 text-center">
                        <TrendingUp className="h-5 w-5 text-primary mx-auto mb-2" />
                        <div className="text-xl font-bold">{kpi.value}</div>
                        <div className="text-xs text-muted-foreground">{kpi.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Competitor Landscape */}
            {report.macro_analysis?.competitorLandscape?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Competitor Landscape
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {report.macro_analysis.competitorLandscape.map((comp: any, i: number) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{comp.name}</span>
                          <span className="text-sm font-bold">{comp.presence}/100</span>
                        </div>
                        <Progress value={comp.presence} className="h-2" />
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-xs font-medium text-emerald-600">Strengths</span>
                            <ul className="mt-1 space-y-0.5">
                              {comp.strengths?.map((s: string, j: number) => (
                                <li key={j} className="flex items-start gap-1 text-muted-foreground">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                                  {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-red-600">Weaknesses</span>
                            <ul className="mt-1 space-y-0.5">
                              {comp.weaknesses?.map((w: string, j: number) => (
                                <li key={j} className="flex items-start gap-1 text-muted-foreground">
                                  <XCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                                  {w}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Market Trends */}
            {report.macro_analysis?.marketTrends?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Market Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      {report.macro_analysis.marketTrends.map((trend: any, i: number) => (
                        <div key={i} className="p-4 rounded-lg border bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">{trend.trend}</span>
                            <Badge className={getImpactColor(trend.impact)} variant="outline">
                              {trend.impact}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{trend.description}</p>
                          <div className="mt-2">
                            <Progress value={trend.score} className="h-1.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Key Questions */}
            {report.macro_analysis?.keyQuestions?.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Search className="h-5 w-5 text-primary" />
                      Key Questions to Target
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {report.macro_analysis.keyQuestions.map((q: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                          <div className="flex-1">
                            <span className="text-sm font-medium">{q.question}</span>
                            <div className="flex gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                Vol: {q.volume?.toLocaleString()}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {q.difficulty}
                              </Badge>
                            </div>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(q.priority)}`} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Schema Audit */}
            {report.micro_analysis?.schemaAudit && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-primary" />
                      Schema Markup Audit
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-emerald-600 mb-2">✅ Implemented</h4>
                        <ul className="space-y-1">
                          {report.micro_analysis.schemaAudit.implemented?.map((s: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              {s}
                            </li>
                          ))}
                          {(!report.micro_analysis.schemaAudit.implemented || report.micro_analysis.schemaAudit.implemented.length === 0) && (
                            <li className="text-sm text-muted-foreground">None detected</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-red-600 mb-2">❌ Missing</h4>
                        <ul className="space-y-1">
                          {report.micro_analysis.schemaAudit.missing?.map((s: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-center gap-1">
                              <XCircle className="h-3 w-3 text-red-500" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-amber-600 mb-2">⚡ Priority</h4>
                        <ul className="space-y-1">
                          {report.micro_analysis.schemaAudit.priority?.map((s: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-amber-500" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Recommendations */}
            {report.recommendations && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" />
                      Strategic Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {[
                      { title: "🚀 Immediate Actions", items: report.recommendations.immediate },
                      { title: "📅 Short Term (1-3 months)", items: report.recommendations.shortTerm },
                      { title: "🎯 Long Term (3-12 months)", items: report.recommendations.longTerm },
                    ].map((section, idx) => (
                      <div key={idx}>
                        <h4 className="font-semibold mb-3">{section.title}</h4>
                        <div className="space-y-2">
                          {section.items?.map((rec: any, i: number) => (
                            <div key={i} className="p-3 rounded-lg border bg-muted/20">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm">{rec.title}</span>
                                <Badge className={getImpactColor(rec.impact)} variant="outline">
                                  {rec.impact}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{rec.description}</p>
                              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {rec.effort}
                                </span>
                                {rec.kpi && (
                                  <span className="flex items-center gap-1">
                                    <Target className="h-3 w-3" />
                                    {rec.kpi}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* CTA */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
              <Card className="bg-gradient-to-r from-primary/5 to-violet-500/5 border-primary/20">
                <CardContent className="p-8 text-center">
                  <h3 className="text-xl font-bold mb-2">Ready to fix these issues?</h3>
                  <p className="text-muted-foreground mb-6">
                    LovelyAnswers publishes 30 expert articles/month and optimizes your site for AI search — on autopilot.
                  </p>
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-violet-500 text-white" asChild>
                    <Link to="/onboarding">
                      <Sparkles className="h-5 w-5" />
                      Start Free Trial
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        <PublicFooter />
      </div>
    </>
  );
}
