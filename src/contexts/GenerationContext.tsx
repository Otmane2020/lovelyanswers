import React, { createContext, useContext, useState, ReactNode } from "react";

interface GenerationContextType {
  isGenerating: boolean;
  generationProgress: number;
  generationMessage: string;
  setIsGenerating: (value: boolean) => void;
  setGenerationProgress: (value: number | ((prev: number) => number)) => void;
  setGenerationMessage: (value: string) => void;
  startGeneration: (message?: string) => void;
  stopGeneration: () => void;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationMessage, setGenerationMessage] = useState("");

  const startGeneration = (message = "Generating content...") => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationMessage(message);
  };

  const stopGeneration = () => {
    setGenerationProgress(100);
    setTimeout(() => {
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationMessage("");
    }, 1500);
  };

  return (
    <GenerationContext.Provider
      value={{
        isGenerating,
        generationProgress,
        generationMessage,
        setIsGenerating,
        setGenerationProgress,
        setGenerationMessage,
        startGeneration,
        stopGeneration,
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
}

export function useGeneration() {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error("useGeneration must be used within GenerationProvider");
  }
  return context;
}
