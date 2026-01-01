import React, { createContext, useContext, ReactNode } from 'react';

interface TranslationContextType {
  language: 'en';
  setLanguage: (lang: 'en') => void;
}

const TranslationContext = createContext<TranslationContextType>({ 
  language: 'en', 
  setLanguage: () => {} 
});

interface TranslationProviderProps {
  children: ReactNode;
}

export function TranslationProvider({ children }: TranslationProviderProps) {
  return (
    <TranslationContext.Provider value={{ language: 'en', setLanguage: () => {} }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}