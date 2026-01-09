import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Rocket, ArrowLeft } from "lucide-react";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function Privacy() {
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
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">Last updated: January 2026</p>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Account information (email, name, password)</li>
              <li>Business information (website URL, business description)</li>
              <li>Payment information (processed securely by Stripe)</li>
              <li>Content you create using our services</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
            <p className="text-muted-foreground">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide and improve our services</li>
              <li>Generate personalized content for your business</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send service updates and marketing communications</li>
              <li>Respond to your inquiries and support requests</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">3. Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures to protect your data. 
              All payment processing is handled by Stripe, a PCI-compliant payment processor. 
              Your data is encrypted in transit and at rest.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">4. Data Sharing</h2>
            <p className="text-muted-foreground">
              We do not sell your personal information. We may share data with:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Service providers who help us operate our platform</li>
              <li>Payment processors (Stripe) for transaction processing</li>
              <li>Legal authorities when required by law</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">5. Your Rights</h2>
            <p className="text-muted-foreground">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Opt out of marketing communications</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">6. Cookies</h2>
            <p className="text-muted-foreground">
              We use cookies and similar technologies to enhance your experience, 
              analyze site usage, and assist in our marketing efforts.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">7. Contact</h2>
            <p className="text-muted-foreground">
              For privacy inquiries, contact us at{" "}
              <a href="mailto:support@aeorocket.io" className="text-primary hover:underline">
                support@aeorocket.io
              </a>
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">8. Company Information</h2>
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
