"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ActiveDocument = {
  id: string;
  source: string;
  text: string;
  chunkIndex?: number;
} | null;

type MetaPronosticContextType = {
  activeDocument: ActiveDocument;
  setActiveDocument: (document: ActiveDocument) => void;
  isThinking: boolean;
  setIsThinking: (thinking: boolean) => void;
};

const MetaPronosticContext = createContext<
  MetaPronosticContextType | undefined
>(undefined);

export function MetaPronosticProvider({ children }: { children: ReactNode }) {
  const [activeDocument, setActiveDocument] = useState<ActiveDocument>(null);
  const [isThinking, setIsThinking] = useState(false);

  return (
    <MetaPronosticContext.Provider
      value={{
        activeDocument,
        setActiveDocument,
        isThinking,
        setIsThinking,
      }}
    >
      {children}
    </MetaPronosticContext.Provider>
  );
}

export function useMetaPronostic() {
  const context = useContext(MetaPronosticContext);
  if (context === undefined) {
    throw new Error(
      "useMetaPronostic must be used within a MetaPronosticProvider"
    );
  }
  return context;
}

