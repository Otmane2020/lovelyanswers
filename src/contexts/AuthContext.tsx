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

  useEffect(() => {
    // The client's own detectSessionInUrl (on by default) already parses
    // the OAuth redirect — whether it comes back as a #access_token hash
    // (implicit flow) or a ?code= query param (PKCE) — exchanges it, fires
    // SIGNED_IN below, and strips it from the URL. A second manual parser
    // used to live here, reading only the hash form and calling setSession
    // itself: redundant with the SDK's own handling, blind to the PKCE
    // form entirely, and a race against it for the hash form (whichever
    // strips the URL first leaves the other with nothing to read) — the
    // likely cause of Google sign-in occasionally never reaching this
    // listener at all, leaving the user stuck without a redirect to
    // onboarding or the dashboard.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
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

    // Trigger AI welcome call + WhatsApp + notification email (fire & forget)
    if (!error && data.user) {
      const country = await fetch("https://ipapi.co/country/")
        .then(r => r.text())
        .catch(() => "");

      // Trigger welcome automation
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

      // Send notification email to admin
      fetch("https://ywrpxptnmdmjljvbkwyt.supabase.co/functions/v1/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ""}`,
        },
        body: JSON.stringify({
          type: "custom",
          to: "oben.rockman@gmail.com",
          subject: `New signup: ${fullName || email}`,
          html: `
            <p><strong>New user registration on AutoPilot Geo</strong></p>
            <p><strong>Name:</strong> ${fullName || "Not provided"}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone || "Not provided"}</p>
            <p><strong>Country:</strong> ${country || "Not detected"}</p>
            <p><strong>Signup time:</strong> ${new Date().toISOString()}</p>
          `,
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
