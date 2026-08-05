"use client";
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark, themeVars } from "@/components/brand/BrandMark";

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [searchParams] = useSearchParams();
  const modeFromUrl = searchParams.get("mode");
  const checkoutSuccess = searchParams.get("checkout") === "success";
  const [isLogin, setIsLogin] = useState(modeFromUrl !== "signup");

  const [email, setEmail] = useState("");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirmPassword?: string }>({});

  useEffect(() => {
    const saved = localStorage.getItem("onboarding_email");
    if (saved) setEmail(saved);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  // Auth events: OAuth callback, password recovery.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsResetPassword(true);
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        const u = session.user;
        const isOAuth = u.app_metadata?.provider && u.app_metadata.provider !== "email";
        const isNewUser = Date.now() - new Date(u.created_at).getTime() < 60000;

        if (isOAuth && isNewUser) {
          try {
            await supabase.functions.invoke("send-email", {
              body: {
                type: "welcome",
                to: u.email,
                name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0],
              },
            });
          } catch (emailError) {
            console.error("[AUTH] Failed to send welcome email:", emailError);
          }
        }
      }
    });

    const checkRecoveryToken = () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      if (hashParams.get("type") === "recovery") { setIsResetPassword(true); return; }

      const qs = new URLSearchParams(window.location.search);
      if (qs.get("type") === "recovery") { setIsResetPassword(true); return; }

      const errorCode = hashParams.get("error_code") || qs.get("error_code");
      const errorDescription = hashParams.get("error_description") || qs.get("error_description");
      if (errorCode === "otp_expired" || errorDescription?.includes("expired")) {
        toast({
          title: "Link expired",
          description: "The password reset link has expired. Please request a new one.",
          variant: "destructive",
        });
      }
    };

    checkRecoveryToken();
    return () => subscription.unsubscribe();
  }, [toast]);

  // Signed in: project -> dashboard, no project -> onboarding.
  useEffect(() => {
    if (isResetPassword || !user) return;

    const checkUserAndRedirect = async () => {
      const { data: existingProjects, error } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (error) {
        console.error("[AUTH] Error fetching projects:", error);
        return;
      }

      localStorage.removeItem("onboarding_data");
      localStorage.removeItem("onboarding_email");

      if (existingProjects && existingProjects.length > 0) {
        navigate(checkoutSuccess ? "/geo?subscription=success" : "/geo", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    };

    checkUserAndRedirect();
  }, [user, navigate, isResetPassword, checkoutSuccess]);

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
        title: "Sign in failed",
        description: error.message === "Invalid login credentials" ? "Invalid email or password." : error.message,
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
      if (error.message.includes("already registered")) message = "This email is already registered. Please sign in.";
      toast({ title: "Sign up failed", description: message, variant: "destructive" });
      return;
    }
    toast({ title: "Account created!", description: "Setting up your workspace..." });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      return;
    }
    setErrors({});
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setIsLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Check your email",
      description: "We've sent you a password reset link. Please check your inbox and spam folder.",
    });
    setIsForgotPassword(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setErrors({ password: passwordResult.error.errors[0].message });
      return;
    }
    if (password !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }
    setErrors({});
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Password updated!", description: "Your password has been successfully reset." });
    setIsResetPassword(false);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const oauth = async (provider: "google" | "apple") => {
    const { error } = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: `${window.location.origin}/auth`,
    });
    if (error) {
      toast({
        title: `${provider === "google" ? "Google" : "Apple"} sign in failed`,
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return (
      <div style={{ ...themeVars, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper)" }}>
        <Loader2 style={{ width: 30, height: 30, color: "var(--primary)" }} className="animate-spin" />
      </div>
    );
  }

  const title = isResetPassword
    ? "Set a new password"
    : isForgotPassword
    ? "Reset your password"
    : isLogin
    ? "Sign in"
    : "Create your account";

  return (
    <div style={{ ...themeVars, minHeight: "100vh", display: "flex", background: "var(--paper)", fontFamily: "Inter, system-ui, sans-serif", color: "var(--ink)" }}>
      {/* ---- Form panel ---- */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 24px" }}>
        <div style={{ width: "100%", maxWidth: "420px", margin: "0 auto" }}>
          <Link to="/" style={{ display: "inline-block", marginBottom: "40px" }}>
            <BrandMark size={38} withText />
          </Link>

          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "30px", fontWeight: 700, letterSpacing: "-.01em", margin: "0 0 8px" }}>
            {title}
          </h1>

          <p style={{ fontSize: "14.5px", color: "var(--ink-soft)", margin: "0 0 28px" }}>
            {isResetPassword ? (
              "Enter your new password below"
            ) : isForgotPassword ? (
              <>Remember your password? <button style={linkBtn} onClick={() => setIsForgotPassword(false)}>Sign in</button></>
            ) : isLogin ? (
              <>Don't have an account? <button style={linkBtn} onClick={() => navigate("/onboarding")}>Start free</button></>
            ) : (
              <>Already have an account? <button style={linkBtn} onClick={() => setIsLogin(true)}>Sign in</button></>
            )}
          </p>

          {!isResetPassword && !isForgotPassword && (
            <>
              <button style={socialBtn} onClick={() => oauth("google")}>
                <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
              <button style={{ ...socialBtn, marginBottom: "22px" }} onClick={() => oauth("apple")}>
                <svg style={{ width: 18, height: 18 }} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 12.54c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.18-1.72-1.35-.14-2.64.8-3.33.8-.69 0-1.75-.78-2.87-.76-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.74 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.7.71 2.87.69 1.18-.02 1.93-1.08 2.65-2.14.84-1.23 1.18-2.42 1.2-2.48-.03-.01-2.3-.88-2.31-3.5zM14.88 5.6c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.55 1.31-.56.64-1.05 1.68-.92 2.67.97.08 1.96-.49 2.57-1.22z" />
                </svg>
                Continue with Apple
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "0 0 22px" }}>
                <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
                <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: ".1em", color: "var(--ink-soft)" }}>or</span>
                <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
              </div>
            </>
          )}

          {/* ---- Reset password ---- */}
          {isResetPassword ? (
            <form onSubmit={handleResetPassword}>
              <label style={labelStyle}>New password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                />
                <button type="button" style={eyeBtn} onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p style={errStyle}>{errors.password}</p>}

              <label style={labelStyle}>Confirm password</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
              />
              {errors.confirmPassword && <p style={errStyle}>{errors.confirmPassword}</p>}

              <button type="submit" disabled={isLoading} style={{ ...goldBtn, opacity: isLoading ? 0.6 : 1 }}>
                {isLoading ? "Updating…" : "Update password"}
              </button>
            </form>
          ) : isForgotPassword ? (
            /* ---- Forgot password ---- */
            <form onSubmit={handleForgotPassword}>
              <label style={labelStyle}>Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
              {errors.email && <p style={errStyle}>{errors.email}</p>}
              <button type="submit" disabled={isLoading} style={{ ...goldBtn, opacity: isLoading ? 0.6 : 1 }}>
                {isLoading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          ) : (
            /* ---- Sign in / Sign up ---- */
            <form onSubmit={isLogin ? handleSignIn : handleSignUp}>
              {!isLogin && (
                <>
                  <label style={labelStyle}>Full name</label>
                  <input type="text" placeholder="Jane Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
                </>
              )}

              <label style={labelStyle}>Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
              {errors.email && <p style={errStyle}>{errors.email}</p>}

              <label style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                />
                <button type="button" style={eyeBtn} onClick={() => setShowPassword((s) => !s)} aria-label="Toggle password">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p style={errStyle}>{errors.password}</p>}

              {isLogin && (
                <button type="button" style={{ ...linkBtn, display: "block", marginBottom: "18px", fontSize: "13px" }} onClick={() => setIsForgotPassword(true)}>
                  Forgot password?
                </button>
              )}

              <button type="submit" disabled={isLoading} style={{ ...goldBtn, opacity: isLoading ? 0.6 : 1 }}>
                {isLoading ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
              </button>
            </form>
          )}

          <p style={{ fontSize: "12px", color: "var(--ink-soft)", textAlign: "center", marginTop: "20px" }}>
            <Link to="/terms" style={{ color: "inherit", textDecoration: "underline" }}>Terms</Link>
            {" · "}
            <Link to="/privacy" style={{ color: "inherit", textDecoration: "underline" }}>Privacy</Link>
          </p>
        </div>
      </div>

      {/* ---- Brand panel (desktop only) ---- */}
      <div className="apg-auth-aside" style={{ flex: 1, background: "linear-gradient(150deg,var(--primary-deep),#2a377f)", color: "#fff", padding: "60px 56px", flexDirection: "column", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-80px", right: "-80px", opacity: 0.13, pointerEvents: "none" }}>
          <BrandMark size={320} />
        </div>
        <p style={{ fontSize: "11.5px", fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "#e9dfa8", marginBottom: "18px" }}>
          Win generative search
        </p>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "30px", lineHeight: 1.2, marginBottom: "18px", maxWidth: "440px" }}>
          Buyers ask AI which brand to choose. Make sure it's yours.
        </h2>
        <p style={{ color: "#b7bce8", fontSize: "15px", lineHeight: 1.6, maxWidth: "420px", marginBottom: "38px" }}>
          AutopilotGEO creates, optimizes and publishes the content that ChatGPT, Gemini and Perplexity
          actually cite — every day, on autopilot.
        </p>
        <div style={{ display: "flex", gap: "38px", flexWrap: "wrap" }}>
          {[["500+", "active sites ranking on AI"], ["★ 4.9/5", "founder reviews"], ["+60%", "avg traffic in 3 months"]].map(([n, l]) => (
            <div key={n}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "22px", fontWeight: 600 }}>{n}</div>
              <div style={{ fontSize: "12px", color: "#b7bce8" }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .apg-auth-aside{display:none;}
        @media (min-width:900px){ .apg-auth-aside{display:flex;} }
      `}</style>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "12.5px", fontWeight: 600, color: "var(--ink-soft)", marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px 14px", fontSize: "14.5px", border: "1px solid var(--line)",
  borderRadius: "10px", marginBottom: "14px", boxSizing: "border-box", fontFamily: "inherit",
  background: "var(--surface)", color: "var(--ink)",
};

const goldBtn: React.CSSProperties = {
  width: "100%", padding: "13px", fontSize: "15px", fontWeight: 600, fontFamily: "inherit",
  background: "linear-gradient(120deg,#f3e3ad,#c79a2e)", color: "#3a2c05", border: "none",
  borderRadius: "10px", cursor: "pointer",
};

const socialBtn: React.CSSProperties = {
  width: "100%", padding: "12px", fontSize: "14px", fontWeight: 600, fontFamily: "inherit",
  background: "var(--surface)", color: "var(--ink)", border: "1px solid var(--line)",
  borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center",
  justifyContent: "center", gap: "10px", marginBottom: "10px",
};

const linkBtn: React.CSSProperties = {
  background: "none", border: "none", padding: 0, font: "inherit", fontWeight: 600,
  color: "var(--primary)", cursor: "pointer", textDecoration: "underline",
};

const eyeBtn: React.CSSProperties = {
  position: "absolute", right: "12px", top: "20px", transform: "translateY(-50%)",
  background: "none", border: "none", cursor: "pointer", color: "var(--ink-soft)", padding: 0,
};

const errStyle: React.CSSProperties = {
  fontSize: "12.5px", color: "var(--red)", margin: "-8px 0 12px",
};
