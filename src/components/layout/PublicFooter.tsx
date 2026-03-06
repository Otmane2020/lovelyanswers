import { Link } from "react-router-dom";
import { Shield, Star, CreditCard, ExternalLink } from "lucide-react";
import { AnimatedLogo } from "@/components/AnimatedLogo";

export function PublicFooter() {
  return (
    <footer className="bg-[hsl(222,47%,11%)] border-t border-white/10">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div className="md:col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center mb-4 hover:opacity-80 transition-opacity">
              <AnimatedLogo size="sm" theme="dark" />
            </Link>
            <p className="text-sm text-white/50 mb-4 max-w-xs">The #1 Answer Engine Optimization platform. Get cited by ChatGPT, Gemini, and AI assistants.</p>
            <div className="text-sm text-white/40 space-y-1">
              <p className="font-medium text-white/60">AutoPilot Geo Ltd</p>
              <p>Suite 4, Piccadilly House</p>
              <p>Manchester, M1 1AB</p>
              <p>United Kingdom</p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-white/80">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/blog" className="text-white/40 hover:text-white transition-colors">Blog</Link></li>
              <li><Link to="/localAEO" className="text-white/40 hover:text-white transition-colors">Local AEO</Link></li>
              <li><Link to="/pricing" className="text-white/40 hover:text-white transition-colors">Pricing</Link></li>
              <li><Link to="/auth" className="text-white/40 hover:text-white transition-colors">Login</Link></li>
              <li><Link to="/onboarding" className="text-white/40 hover:text-white transition-colors">Start Free Trial</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-white/80">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-white/40 hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/terms" className="text-white/40 hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-white/40 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><a href="mailto:support@autopilotgeo.com" className="text-white/40 hover:text-white transition-colors">Contact</a></li>
              <li><a href="https://autopilotgeo.com" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-colors inline-flex items-center gap-1">autopilotgeo.com <ExternalLink className="h-3 w-3" /></a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-white/80">Trust & Security</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-white/40"><Shield className="h-4 w-4 text-white/50" /><span>Secure Payment</span></div>
              <div className="flex items-center gap-2 text-sm text-white/40"><CreditCard className="h-4 w-4 text-white/50" /><span>Powered by Stripe</span></div>
              <div className="flex items-center gap-2 text-sm text-white/40"><Star className="h-4 w-4 text-yellow-400" /><span>Trusted by 500+ businesses</span></div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10">
              <p className="text-xs text-white/30 mb-2">Resources</p>
              <div className="flex flex-wrap gap-2">
                <Link to="/blog" className="text-xs text-white/30 hover:text-white transition-colors">AEO Articles</Link>
                <span className="text-white/20">•</span>
                <Link to="/localAEO" className="text-xs text-white/30 hover:text-white transition-colors">Local SEO</Link>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/30">© {new Date().getFullYear()} AutoPilot Geo Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4 text-sm text-white/30">
            <span>Answer Engine Optimization Platform</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">Made with ❤️ in Manchester</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
