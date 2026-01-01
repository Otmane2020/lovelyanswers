import { createContext, useContext, useState, ReactNode } from "react";

type Language = "fr" | "en";

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem("app_language");
    return (stored as Language) || "fr";
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("app_language", lang);
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage: handleSetLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    // Fallback for components outside provider
    return { language: "fr" as Language, setLanguage: () => {} };
  }
  return context;
}
