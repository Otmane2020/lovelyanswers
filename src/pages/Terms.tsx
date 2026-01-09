import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Rocket, ArrowLeft } from "lucide-react";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-bg shadow-glow-sm">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">
              Aeo<span className="gradient-text">Rocket</span>
            </span>
          </Link>
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </nav>

      {/* Content */}
      <main className="container pt-32 pb-20 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Last updated: January 2026</p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Agreement to Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using AeoRocket's services, you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. Description of Service</h2>
            <p className="text-muted-foreground">
              AeoRocket provides Answer Engine Optimization (AEO) services, including AI-generated content, 
              SEO optimization, and content publishing tools. Our services are designed to help businesses 
              improve their visibility in AI-powered search and recommendation systems.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Subscription and Payment</h2>
            <p className="text-muted-foreground">
              We offer a 3-day free trial for new users. After the trial period, you will be charged 
              according to the subscription plan you selected. All payments are processed securely through Stripe.
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Subscriptions are billed monthly</li>
              <li>You may cancel your subscription at any time</li>
              <li>No refunds are provided after the trial period due to API and AI service costs</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Content Ownership</h2>
            <p className="text-muted-foreground">
              All content generated through our platform belongs to you. You retain full rights to use, 
              modify, and distribute the content as you see fit. AeoRocket does not claim any ownership 
              over content created using our services.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Acceptable Use</h2>
            <p className="text-muted-foreground">
              You agree not to use our services to generate content that is illegal, harmful, or violates 
              third-party rights. We reserve the right to terminate accounts that violate these terms.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Contact</h2>
            <p className="text-muted-foreground">
              For any questions regarding these terms, please contact us at{" "}
              <a href="mailto:support@aeorocket.io" className="text-primary hover:underline">
                support@aeorocket.io
              </a>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Company Information</h2>
            <p className="text-muted-foreground">
              AeoRocket Ltd<br />
              Suite 4, Piccadilly House<br />
              Manchester, M1 1AB<br />
              United Kingdom
            </p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
