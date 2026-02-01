import { Link } from "react-router-dom";
import { Shield, Star, CreditCard, ExternalLink } from "lucide-react";
import { AnimatedLogo } from "@/components/AnimatedLogo";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Company Info */}
          <div className="md:col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity">
              <AnimatedLogo size="sm" />
              <span className="font-bold">Lovely<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">Answers</span></span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              The #1 Answer Engine Optimization platform. Get cited by ChatGPT, Gemini, and AI assistants.
            </p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">LovelyAnswers Ltd</p>
              <p>Suite 4, Piccadilly House</p>
              <p>Manchester, M1 1AB</p>
              <p>United Kingdom</p>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/localAEO" className="text-muted-foreground hover:text-foreground transition-colors">
                  Local AEO
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/onboarding" className="text-muted-foreground hover:text-foreground transition-colors">
                  Start Free Trial
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a href="mailto:support@lovelyanswers.io" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </a>
              </li>
              <li>
                <a 
                  href="https://lovelyanswers.io" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                >
                  lovelyanswers.io
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Trust Badges */}
          <div>
            <h4 className="font-semibold mb-4">Trust & Security</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-emerald-500" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4 text-primary" />
                <span>Powered by Stripe</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>Trusted by 500+ businesses</span>
              </div>
            </div>
            
            {/* SEO Internal Links */}
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Resources</p>
              <div className="flex flex-wrap gap-2">
                <Link to="/blog" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  AEO Articles
                </Link>
                <span className="text-muted-foreground/50">•</span>
                <Link to="/localAEO" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                  Local SEO
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} LovelyAnswers Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Answer Engine Optimization Platform</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">Made with ❤️ in Manchester</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
