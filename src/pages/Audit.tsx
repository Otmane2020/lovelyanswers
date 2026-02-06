import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { supabase } from "@/integrations/supabase/client";
import {
  Globe,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Shield,
  Sparkles,
  BarChart3,
  Search,
  RefreshCw,
} from "lucide-react";

interface AuditResult {
  category: string;
  status: "pass" | "warning" | "fail";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  recommendation?: string;
}

interface AuditData {
  success: boolean;
  url: string;
  domain: string;
  pageTitle: string;
  scores: {
    overall: number;
    seo: number;
    aeo: number;
  };
  summary: {
    total: number;
    passed: number;
    warnings: number;
    failed: number;
  };
  results: AuditResult[];
  scrapedAt: string;
}

function ScoreRing({ score, label, size = 120 }: { score: number; label: string; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 70 ? "text-emerald-500" : score >= 40 ? "text-amber-500" : "text-red-500";
  const bgColor = score >= 70 ? "stroke-emerald-500" : score >= 40 ? "stroke-amber-500" : "stroke-red-500";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-muted/20"
            strokeWidth="8"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={bgColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className={`text-2xl font-bold ${color}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {score}
          </motion.span>
        </div>
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function StatusIcon({ status }: { status: "pass" | "warning" | "fail" }) {
  if (status === "pass") return <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />;
  if (status === "warning") return <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />;
  return <XCircle className="h-5 w-5 text-red-500 shrink-0" />;
}

function ImpactBadge({ impact }: { impact: "high" | "medium" | "low" }) {
  const colors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors[impact]}`}>
      {impact}
    </span>
  );
}

export default function Audit() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlFromParams = searchParams.get("url") || "";
  const idFromParams = searchParams.get("id") || "";

  const [websiteUrl, setWebsiteUrl] = useState(urlFromParams);
  const [isLoading, setIsLoading] = useState(false);
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // Force light theme
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  // Load audit from DB if ID provided
  useEffect(() => {
    if (idFromParams && !auditData && !isLoading) {
      loadAuditFromDb(idFromParams);
    }
  }, [idFromParams]);

  // Auto-start audit if URL provided (and no ID)
  useEffect(() => {
    if (urlFromParams && !idFromParams && !auditData && !isLoading) {
      runAudit(urlFromParams);
    }
  }, [urlFromParams, idFromParams]);

  const loadAuditFromDb = async (auditId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from("site_audits")
        .select("*")
        .eq("id", auditId)
        .single();

      if (dbError || !data) {
        console.error("[audit] DB load error:", dbError);
        setError("Audit report not found. It may have expired.");
        return;
      }

      setWebsiteUrl(data.url);
      setAuditData({
        success: true,
        url: data.url,
        domain: data.domain,
        pageTitle: data.page_title || "",
        scores: data.scores as unknown as AuditData["scores"],
        summary: data.summary as unknown as AuditData["summary"],
        results: data.results as unknown as AuditResult[],
        scrapedAt: data.created_at,
      });
    } catch (err) {
      console.error("[audit] Error loading from DB:", err);
      setError("Failed to load audit report.");
    } finally {
      setIsLoading(false);
    }
  };

  const runAudit = async (url: string) => {
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setAuditData(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("free-audit", {
        body: { url: url.trim() },
      });

      if (fnError) {
        console.error("[audit] Function error:", fnError);
        setError("Failed to analyze website. Please try again.");
        return;
      }

      if (!data?.success) {
        setError(data?.error || "Failed to analyze website.");
        return;
      }

      setAuditData(data);
    } catch (err) {
      console.error("[audit] Error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (websiteUrl.trim()) {
      // Update URL params
      navigate(`/audit?url=${encodeURIComponent(websiteUrl.trim())}`, { replace: true });
      runAudit(websiteUrl.trim());
    }
  };

  const toggleExpand = (index: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleGetStarted = () => {
    navigate(`/onboarding?url=${encodeURIComponent(websiteUrl || urlFromParams)}`);
  };

  return (
    <>
      <Helmet>
        <title>Free AEO & SEO Audit | LovelyAnswers</title>
        <meta name="description" content="Get a free comprehensive SEO and AEO audit for your website. Find out how to rank on ChatGPT, Gemini, and Google." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
          <div className="container flex h-16 items-center justify-between px-4">
            <Link to="/" className="flex items-center gap-2">
              <AnimatedLogo size="md" />
              <span className="text-xl font-bold tracking-tight">
                Lovely<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">Answers</span>
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Login</Link>
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-primary to-violet-500 text-white" asChild>
                <Link to="/onboarding">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Start Free
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="container px-4 py-8 md:py-12 max-w-4xl mx-auto">
          {/* Title & URL Input */}
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <BarChart3 className="mr-1 h-3 w-3" />
              Free SEO + AEO Audit
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
              How visible is your site on{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">AI & Google</span>?
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Get a comprehensive SEO + AEO audit in seconds. Discover what's holding you back.
            </p>
          </div>

          {/* URL Input Form */}
          <form onSubmit={handleSubmit} className="mb-10">
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="pl-12 h-13 text-base border-2 border-primary/20 focus:border-primary"
                  disabled={isLoading}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading || !websiteUrl.trim()}
                className="h-13 px-6 gap-2 bg-gradient-to-r from-primary to-violet-500 text-white hover:opacity-90"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : auditData ? (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Re-audit
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Run Audit
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Loading State */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center py-16"
              >
                <div className="relative inline-flex mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Analyzing your website...</h3>
                <p className="text-muted-foreground">Scraping content, checking SEO, evaluating AEO readiness</p>
                <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Shield className="h-4 w-4" /> SSL Check</span>
                  <span className="flex items-center gap-1"><Search className="h-4 w-4" /> SEO Analysis</span>
                  <span className="flex items-center gap-1"><Sparkles className="h-4 w-4" /> AEO Scoring</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error State */}
          {error && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Audit Failed</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={() => runAudit(websiteUrl)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </motion.div>
          )}

          {/* Audit Results */}
          {auditData && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Domain Info */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Audit report for</p>
                <h2 className="text-2xl font-bold">{auditData.domain}</h2>
                {auditData.pageTitle && (
                  <p className="text-sm text-muted-foreground mt-1 truncate max-w-md mx-auto">
                    {auditData.pageTitle}
                  </p>
                )}
              </div>

              {/* Score Cards */}
              <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-lg mx-auto">
                <ScoreRing score={auditData.scores.overall} label="Overall" size={110} />
                <ScoreRing score={auditData.scores.seo} label="SEO" size={110} />
                <ScoreRing score={auditData.scores.aeo} label="AEO" size={110} />
              </div>

              {/* Summary Bar */}
              <div className="flex items-center justify-center gap-6 text-sm">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium">{auditData.summary.passed}</span>
                  <span className="text-muted-foreground">passed</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{auditData.summary.warnings}</span>
                  <span className="text-muted-foreground">warnings</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="font-medium">{auditData.summary.failed}</span>
                  <span className="text-muted-foreground">failed</span>
                </span>
              </div>

              {/* CTA Banner */}
              <div className="bg-gradient-to-r from-primary/10 via-violet-500/10 to-fuchsia-500/10 border border-primary/20 rounded-2xl p-6 text-center">
                <h3 className="text-lg font-bold mb-2">
                  🚀 Fix these issues automatically with LovelyAnswers
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Get 30 SEO articles/month, AEO optimization, and auto-publishing — all on autopilot.
                </p>
                <Button
                  onClick={handleGetStarted}
                  className="gap-2 bg-gradient-to-r from-primary to-violet-500 text-white hover:opacity-90"
                >
                  Fix My Site Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Detailed Results */}
              <div>
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Detailed Audit Results
                </h3>

                <div className="space-y-2">
                  {auditData.results.map((result, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border border-border rounded-xl overflow-hidden bg-card"
                    >
                      <button
                        onClick={() => toggleExpand(index)}
                        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                      >
                        <StatusIcon status={result.status} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{result.title}</span>
                            <ImpactBadge impact={result.impact} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{result.category}</p>
                        </div>
                        <svg
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            expandedItems.has(index) ? "rotate-180" : ""
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      <AnimatePresence>
                        {expandedItems.has(index) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-0 space-y-2 border-t border-border/50">
                              <p className="text-sm text-muted-foreground pt-3">{result.description}</p>
                              {result.recommendation && (
                                <div className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                                  <p className="text-sm">
                                    <span className="font-medium text-primary">💡 Recommendation: </span>
                                    {result.recommendation}
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="text-center py-8 border-t border-border">
                <h3 className="text-2xl font-bold mb-3">
                  Ready to dominate AI search results?
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  LovelyAnswers fixes these issues and publishes expert content daily — automatically.
                </p>
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-primary via-violet-500 to-fuchsia-500 text-white shadow-xl hover:opacity-90 text-lg px-8"
                >
                  <TrendingUp className="h-5 w-5" />
                  Start Growing Now
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  <Shield className="inline h-3 w-3 mr-1" />
                  14-day money-back guarantee • No credit card required to start
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}
