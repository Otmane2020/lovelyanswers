import { Link } from "react-router-dom";
import { Heart, Shield, Star, CreditCard } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Company Info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-pink-500 to-rose-500">
                <Heart className="h-4 w-4 text-white fill-white" />
              </div>
              <span className="font-bold">LovelyAnswers</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">LovelyAnswers Ltd</p>
              <p>Suite 4, Piccadilly House</p>
              <p>Manchester, M1 1AB</p>
              <p>United Kingdom</p>
            </div>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
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
                <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <a href="mailto:support@lovelyanswers.io" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact
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
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 LovelyAnswers Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Answer Engine Optimization Platform</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
