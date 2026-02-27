"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ChatContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  mensagensNaoLidas: number;
  setMensagensNaoLidas: (count: number) => void;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);

  return (
    <ChatContext.Provider value={{ isOpen, setIsOpen, mensagensNaoLidas, setMensagensNaoLidas }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat deve ser usado dentro de um ChatProvider");
  }
  return context;
}
