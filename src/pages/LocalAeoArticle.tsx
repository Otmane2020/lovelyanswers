import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { GlassCard } from "@/components/ui/glass-card";
import { 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  Bot, 
  Target,
  Building2,
  Star,
  MessageSquare,
  Zap,
  Globe,
  Search
} from "lucide-react";

export default function LocalAeoArticle() {
  return (
    <>
      <Helmet>
        <title>Local AEO: Get Your Business Cited by AI Assistants | AutoPilot Geo</title>
        <meta
          name="description"
          content="Discover how AutoPilot Geo's Local AEO technology helps local businesses get cited by ChatGPT, Gemini, and other AI assistants. Dominate local AI search results."
        />
        <link rel="canonical" href="https://autopilotgeo.com/localAEO" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <AnimatedLogo size="sm" />
              <span className="font-bold text-lg">AutoPilot Geo</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link to="/blog">
                <Button variant="ghost" size="sm">Blog</Button>
              </Link>
              <Link to="/pricing">
                <Button variant="ghost" size="sm">Pricing</Button>
              </Link>
              <Link to="/auth">
                <Button size="sm">Get Started</Button>
              </Link>
            </nav>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-pink-500/10 to-violet-500/10 rounded-full blur-[120px]" />
          
          <div className="container relative">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-6">
                <MapPin className="h-3 w-3 mr-1" />
                Local AEO Technology
              </Badge>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                Make AI Assistants Recommend{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">
                  Your Local Business
                </span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                When someone asks ChatGPT, Gemini, or Perplexity for the best local services, 
                will they mention your business? With AutoPilot Geo's Local AEO, they will.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth">
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white">
                    Start Local AEO Free
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/pricing">
                  <Button size="lg" variant="outline">
                    View Pricing
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* What is Local AEO */}
        <section className="py-20 bg-muted/30">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-center">
                What is Local AEO?
              </h2>
              <div className="prose prose-lg max-w-none dark:prose-invert">
                <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                  <strong>Local Answer Engine Optimization (Local AEO)</strong> is the next evolution of local SEO. 
                  While traditional local SEO focuses on Google Maps and search rankings, Local AEO ensures 
                  your business gets recommended by AI assistants when users ask questions like:
                </p>
                <div className="grid md:grid-cols-2 gap-4 mb-8">
                  <GlassCard className="p-4">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-pink-500 mt-1 shrink-0" />
                      <p className="text-sm italic">"What's the best Italian restaurant near me?"</p>
                    </div>
                  </GlassCard>
                  <GlassCard className="p-4">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-pink-500 mt-1 shrink-0" />
                      <p className="text-sm italic">"Find me a reliable plumber in Manchester"</p>
                    </div>
                  </GlassCard>
                  <GlassCard className="p-4">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-pink-500 mt-1 shrink-0" />
                      <p className="text-sm italic">"Which dentist has the best reviews downtown?"</p>
                    </div>
                  </GlassCard>
                  <GlassCard className="p-4">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-5 w-5 text-pink-500 mt-1 shrink-0" />
                      <p className="text-sm italic">"Where can I get my car serviced this weekend?"</p>
                    </div>
                  </GlassCard>
                </div>
                <p className="text-muted-foreground text-lg leading-relaxed">
                  AI assistants are becoming the new way people discover local businesses. 
                  <strong> AutoPilot Geo</strong> helps you create optimized content that these AI systems 
                  understand, trust, and cite when answering local queries.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20">
          <div className="container">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
              How AutoPilot Geo Local AEO Works
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              Our AI-powered platform generates location-specific content optimized for AI citation
            </p>
            
            <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <GlassCard className="p-6 text-center relative">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                  1
                </div>
                <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/10 to-violet-500/10">
                  <Building2 className="h-7 w-7 text-pink-500" />
                </div>
                <h3 className="font-semibold mb-2">Connect Your Business</h3>
                <p className="text-sm text-muted-foreground">
                  Search and link your Google Business Profile to import your business data
                </p>
              </GlassCard>

              <GlassCard className="p-6 text-center relative">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                  2
                </div>
                <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/10 to-violet-500/10">
                  <Bot className="h-7 w-7 text-pink-500" />
                </div>
                <h3 className="font-semibold mb-2">AI Generates Content</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI creates 30 days of location-specific Q&A content about your business
                </p>
              </GlassCard>

              <GlassCard className="p-6 text-center relative">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                  3
                </div>
                <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/10 to-violet-500/10">
                  <Globe className="h-7 w-7 text-pink-500" />
                </div>
                <h3 className="font-semibold mb-2">Auto-Publish</h3>
                <p className="text-sm text-muted-foreground">
                  Content is automatically published to your website or our hosted solution
                </p>
              </GlassCard>

              <GlassCard className="p-6 text-center relative">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                  4
                </div>
                <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/10 to-violet-500/10">
                  <TrendingUp className="h-7 w-7 text-pink-500" />
                </div>
                <h3 className="font-semibold mb-2">Get Cited by AI</h3>
                <p className="text-sm text-muted-foreground">
                  AI assistants discover and cite your optimized content in their responses
                </p>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-20 bg-muted/30">
          <div className="container">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">
              Why Local Businesses Choose LovelyAnswers
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <GlassCard className="p-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-4" />
                <h3 className="font-semibold mb-2">90+ Citation Scores</h3>
                <p className="text-sm text-muted-foreground">
                  Our AI generates content specifically structured for maximum AI citation probability
                </p>
              </GlassCard>

              <GlassCard className="p-6">
                <Star className="h-8 w-8 text-yellow-500 mb-4" />
                <h3 className="font-semibold mb-2">Review Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically incorporates your Google reviews and ratings into optimized content
                </p>
              </GlassCard>

              <GlassCard className="p-6">
                <MapPin className="h-8 w-8 text-pink-500 mb-4" />
                <h3 className="font-semibold mb-2">Location-Specific</h3>
                <p className="text-sm text-muted-foreground">
                  Content includes your exact location, service areas, and local landmarks
                </p>
              </GlassCard>

              <GlassCard className="p-6">
                <Zap className="h-8 w-8 text-violet-500 mb-4" />
                <h3 className="font-semibold mb-2">Automated Publishing</h3>
                <p className="text-sm text-muted-foreground">
                  Set it and forget it - content publishes automatically on your schedule
                </p>
              </GlassCard>

              <GlassCard className="p-6">
                <Search className="h-8 w-8 text-blue-500 mb-4" />
                <h3 className="font-semibold mb-2">SEO + AEO Combined</h3>
                <p className="text-sm text-muted-foreground">
                  Content optimized for both traditional search and AI answer engines
                </p>
              </GlassCard>

              <GlassCard className="p-6">
                <Target className="h-8 w-8 text-orange-500 mb-4" />
                <h3 className="font-semibold mb-2">Multi-Platform</h3>
                <p className="text-sm text-muted-foreground">
                  Optimized for ChatGPT, Gemini, Claude, Perplexity, and emerging AI assistants
                </p>
              </GlassCard>
            </div>
          </div>
        </section>

        {/* Industry Examples */}
        <section className="py-20">
          <div className="container">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
              Perfect for Every Local Business
            </h2>
            <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
              From restaurants to professional services, Local AEO works for any business that serves a local area
            </p>
            
            <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
              {[
                "Restaurants & Cafés",
                "Dental Practices",
                "Law Firms",
                "Auto Repair Shops",
                "Real Estate Agents",
                "Plumbers & Electricians",
                "Fitness Studios",
                "Beauty Salons",
                "Medical Clinics",
                "Accounting Firms",
                "Pet Services",
                "Home Services"
              ].map((industry) => (
                <Badge key={industry} variant="secondary" className="text-sm py-2 px-4">
                  {industry}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-br from-pink-500/10 to-violet-500/10">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Dominate Local AI Search?
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Join hundreds of local businesses already using LovelyAnswers to get cited by AI assistants.
                Start your free trial today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth">
                  <Button size="lg" className="gap-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white">
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/about">
                  <Button size="lg" variant="outline">
                    Learn About Us
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground mt-6">
                No credit card required • 30 local answers included • Cancel anytime
              </p>
            </div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </>
  );
}
