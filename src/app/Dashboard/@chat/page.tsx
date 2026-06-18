"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, BrainCircuit, Send, Trophy } from "lucide-react";
import { useMetaPronostic } from "@/contexts/metapronostic-context";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

const promptSuggestions = [
  "Donne le classement de la Ligue 1 2025",
  "Quels signaux pour PSG vs OM ?",
  "Quels joueurs blessés pour le prochain match ?",
];

export default function ChatSlotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { setIsThinking } = useMetaPronostic();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setIsThinking(true);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      let fullContent = "";
      
      // Prepare conversation history (last 10 messages for context, excluding empty streaming messages)
      const conversationHistory = [...messages, userMessage]
        .filter((msg) => msg.content.trim().length > 0) // Exclude empty streaming messages
        .slice(-10)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          namespace: "uploads",
          conversationHistory: conversationHistory,
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No reader available");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullContent += chunk;
        
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: fullContent, isStreaming: true }
              : msg
          )
        );
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, isStreaming: false }
            : msg
        )
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to get response";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: errorMessage, isStreaming: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setIsThinking(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Minimalist Header */}
      <div className="border-b border-white/10 px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-lime-400/15 text-lime-300">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">
              Match Prediction AI
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Interroge fixtures, cotes, classement, joueurs et blessures
            </p>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-xl bg-lime-400/15">
                <Trophy className="h-10 w-10 text-lime-300" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">
                MetaPronostic est prêt
              </h3>
              <p className="text-sm text-slate-400 max-w-md">
                Pose une question sur un match, un classement, une cote, une
                blessure ou une tendance de forme.
              </p>
              <div className="mt-6 grid w-full max-w-md gap-2">
                {promptSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setInput(suggestion)}
                    className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:border-lime-300/40 hover:bg-lime-300/10"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-3.5 ${
                    message.role === "user"
                      ? "bg-lime-400 text-white shadow-lg shadow-lime-500/20"
                      : "bg-white/5 border border-white/10 text-slate-100"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {message.content}
                    {message.isStreaming && (
                      <motion.span
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="ml-1 inline-block h-4 w-1 bg-current"
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-slate-400"
            >
              <div className="flex gap-1">
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  className="h-2 w-2 rounded-full bg-lime-300"
                />
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                  className="h-2 w-2 rounded-full bg-lime-300"
                />
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                  className="h-2 w-2 rounded-full bg-lime-300"
                />
              </div>
              <span className="text-xs">Analyse du match...</span>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Minimalist Input Bar */}
      <div className="border-t border-white/10 px-8 py-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
          <div className="flex gap-3">
           
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ex: Donne les signaux forts pour PSG vs OM..."
              disabled={isLoading}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-slate-500 transition-all focus:border-lime-300/50 focus:outline-none focus:ring-2 focus:ring-lime-300/20 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-lime-400 text-white transition-all hover:scale-105 hover:bg-lime-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <BarChart3 className="h-4 w-4 text-cyan-300" />
            MongoDB football data + Gemini response engine
          </div>
        </form>
      </div>
    </div>
  );
}
