import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Rocket, Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, Quote } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Adresse email invalide");
const passwordSchema = z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères");

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, signUp, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) newErrors.email = emailResult.error.errors[0].message;
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) newErrors.password = passwordResult.error.errors[0].message;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast({
        title: "Connexion échouée",
        description: error.message === "Invalid login credentials" ? "Email ou mot de passe incorrect." : error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    setIsLoading(false);
    if (error) {
      let message = error.message;
      if (error.message.includes("already registered")) message = "Cet email est déjà enregistré. Connectez-vous.";
      toast({ title: "Inscription échouée", description: message, variant: "destructive" });
    } else {
      toast({ title: "Compte créé !", description: "Bienvenue sur Aeoreply. Configurons votre projet." });
      navigate("/onboarding");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Auth Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-16">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg shadow-glow-sm">
              <Rocket className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">
              Aeo<span className="gradient-text">reply</span>
            </span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {isLogin ? "Connexion" : "Créer un compte"}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {isLogin ? "Pas encore inscrit ? " : "Déjà inscrit ? "}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-primary font-medium hover:underline"
                >
                  {isLogin ? "Inscrivez-vous" : "Connectez-vous"}
                </button>
              </p>
            </div>

            {/* Google Button */}
            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-base font-medium border-primary/20 bg-primary/5 hover:bg-primary/10"
              disabled
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuer avec Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            <form onSubmit={isLogin ? handleSignIn : handleSignUp} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-muted-foreground">Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Jean Dupont"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10 h-12 bg-muted/50 border-border"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="vous@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-muted/50 border-border"
                    required
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-muted-foreground">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 bg-muted/50 border-border"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>

              {isLogin && (
                <button type="button" className="text-sm text-primary hover:underline">
                  Mot de passe oublié ?
                </button>
              )}

              <Button
                type="submit"
                className="w-full h-12 gap-2 bg-foreground text-background hover:bg-foreground/90 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Se connecter" : "Créer un compte"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {!isLogin && (
              <p className="text-xs text-center text-muted-foreground">
                En vous inscrivant, vous acceptez nos Conditions d'utilisation et notre Politique de confidentialité.
              </p>
            )}
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Testimonial */}
      <div className="hidden lg:flex w-1/2 bg-muted/30 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="hsl(var(--muted-foreground))" opacity="0.1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <line x1="20%" y1="30%" x2="80%" y2="70%" stroke="hsl(var(--primary))" strokeWidth="1" />
            <line x1="30%" y1="80%" x2="70%" y2="20%" stroke="hsl(var(--primary))" strokeWidth="1" />
            <line x1="50%" y1="10%" x2="50%" y2="90%" stroke="hsl(var(--primary))" strokeWidth="1" />
            <circle cx="20%" cy="30%" r="4" fill="hsl(var(--primary))" />
            <circle cx="80%" cy="70%" r="4" fill="hsl(var(--primary))" />
            <circle cx="30%" cy="80%" r="3" fill="hsl(var(--primary))" />
            <circle cx="70%" cy="20%" r="3" fill="hsl(var(--primary))" />
          </svg>
        </div>

        {/* Testimonial Card */}
        <div className="relative z-10 flex items-center justify-center w-full p-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-background rounded-2xl shadow-2xl p-8 max-w-md"
          >
            {/* CEO Info */}
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                AB
              </div>
              <div>
                <h3 className="font-bold text-lg">Anis Bennaceur</h3>
                <p className="text-primary text-sm font-medium">CEO @Attention</p>
              </div>
            </div>

            {/* Quote */}
            <blockquote className="space-y-4">
              <p className="text-primary font-medium text-lg leading-relaxed">
                "Je suis impressionné par la façon dont Aeoreply s'occupe de tout pour nous. De la recherche de mots-clés à la génération de contenu optimisé. C'est une solution vraiment géniale qui nous fait gagner un temps fou !"
              </p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Le plan de contenu généré était parfait. Chaque réponse est pertinente et optimisée pour l'IA, avec des citations et des liens internes.
              </p>
            </blockquote>
          </motion.div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-8 right-8">
          <div className="h-12 w-12 rounded-full gradient-bg opacity-60 blur-sm" />
        </div>
      </div>
    </div>
  );
}
