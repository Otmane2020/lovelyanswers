"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string, phone?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const redirectAfterAuth = async (authUser: User) => {
    if (typeof window === "undefined") return;

    const path = window.location.pathname;
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    const isRecovery = hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery";

    if (isRecovery || !["/auth", "/signup"].includes(path)) return;

    try {
      const { data: projects, error } = await supabase
        .from("projects")
        .select("id")
        .eq("user_id", authUser.id)
        .limit(1);

      if (error) throw error;

      const target = projects && projects.length > 0 ? "/dashboard" : "/wizard";
      console.log("[AuthContext] Post-auth redirect →", target);
      window.location.replace(target);
    } catch (e) {
      console.error("[AuthContext] Post-auth redirect query error:", e);
      window.location.replace("/wizard");
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST.
    // Supabase-js auto-detects OAuth tokens in URL hash (detectSessionInUrl=true by default)
    // and fires SIGNED_IN automatically — we don't need to manually call setSession.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[AuthContext] event:", event, "hasSession:", !!session);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);

        if (event === "SIGNED_IN" && session?.user) {
          // Clean OAuth hash from URL if present
          if (window.location.hash.includes("access_token")) {
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          }
          setTimeout(() => {
            redirectAfterAuth(session.user);
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (session?.user) {
        redirectAfterAuth(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName?: string, phone?: string) => {
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          phone: phone || null,
        },
      },
    });

    // Phone saved via user_metadata during signup

    // Trigger AI welcome call + WhatsApp (fire & forget)
    if (!error && data.user) {
      const country = await fetch("https://ipapi.co/country/")
        .then(r => r.text())
        .catch(() => "");
      fetch("https://apg-welcome-automation.oben-rockman.workers.dev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName || "",
          email,
          phone: phone || "",
          country,
        }),
      }).catch(() => {});
    }

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'local' });
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
