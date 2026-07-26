import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { BookOpen, Bot, HelpCircle, Send, Sparkles, X, Zap } from "lucide-react";
import { Markdown } from "./Markdown";
import { AnimalSprite } from "./PixelSprite";
import { moodFor, type PetState } from "../lib/petState";
import type { Course } from "../types";

/**
 * The Socratic partner: free-form conversation alongside the structured
 * lessons. Three modes, because being questioned, having something explained,
 * and being tested are different things.
 *
 * Multi-turn on purpose — the last few messages go back to the model, so a
 * one-word follow-up like "why?" still means something.
 */

export type ChatMode = "socratic" | "explain" | "test";

interface ChatMessage {
  id: string;
  sender: "user" | "gemma" | "pet";
  text: string;
  timestamp: string;
}

const MODES: Array<{ id: ChatMode; label: string; icon: React.ElementType }> = [
  { id: "socratic", label: "Socratic tutor", icon: HelpCircle },
  { id: "explain", label: "Explain simply", icon: BookOpen },
  { id: "test", label: "Active recall", icon: Zap },
];

interface Props {
  pet: PetState;
  course: Course | null;
  onClose: () => void;
}

export const SocraticModal: React.FC<Props> = ({ pet, course, onClose }) => {
  const topic = course?.subject || "your course";
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      sender: "gemma",
      text: `I'm Gemma 4, running on this machine. I've read your ${topic} material — ask me anything about it, or pick a mode below and I'll question you instead.`,
      timestamp: "now",
    },
  ]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<ChatMode>("socratic");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string, askPet = false) {
    const body = text.trim();
    if (!body || loading) return;

    const history = messages.filter((m) => m.id !== "intro");
    const userMsg: ChatMessage = { id: `u${Date.now()}`, sender: "user", text: body, timestamp: clock() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/socratic-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          userMessage: body,
          mode,
          askPet,
          petName: pet.name,
          notes: course?.notes,
          history: [...history, userMsg].map((m) => ({ sender: m.sender, text: m.text })),
          pet: {
            species: pet.species,
            stage: pet.stage,
            mood: moodFor(pet.health),
            health: pet.health,
            streak: pet.streak,
            daysSinceStudy: 0,
            isComeback: false,
          },
        }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          id: `a${Date.now()}`,
          sender: data.sender === "pet" ? "pet" : "gemma",
          text: data.reply || "…",
          timestamp: clock(),
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `e${Date.now()}`,
          sender: "gemma",
          text: "I couldn't reach the model just then. Try that again?",
          timestamp: clock(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2D362E]/60 p-4 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex h-[640px] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#E5E2D9] pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-[#E5E2D9] bg-[#F5F2EA] p-2.5 text-[#5E7161]">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold">Socratic partner</h3>
              <p className="text-xs text-[#7A837C]">
                {topic} · taught from your own notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-[#7A837C] transition-colors hover:bg-[#F5F2EA] hover:text-[#2D362E]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-[#E5E2D9] py-3">
          <span className="text-xs font-bold text-[#7A837C]">Mode</span>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                mode === m.id
                  ? "border-[#5E7161] bg-[#5E7161] text-white"
                  : "border-[#E5E2D9] bg-[#F5F2EA] text-[#7A837C] hover:text-[#2D362E]"
              }`}
            >
              <m.icon className="h-3.5 w-3.5" /> {m.label}
            </button>
          ))}
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto py-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[82%] rounded-2xl border px-4 py-3 text-[13px] leading-relaxed ${
                  msg.sender === "user"
                    ? "rounded-tr-none border-[#5E7161] bg-[#5E7161] text-white"
                    : msg.sender === "pet"
                    ? "rounded-tl-none border-[#E8C5B0] bg-[#FFF5F5] text-[#2D362E]"
                    : "rounded-tl-none border-[#E5E2D9] bg-[#F5F2EA] text-[#2D362E]"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-80">
                    {msg.sender === "user" ? (
                      "You"
                    ) : msg.sender === "pet" ? (
                      <>
                        <AnimalSprite
                          species={pet.species}
                          stage={pet.stage === "adult" ? "adult" : "baby"}
                          size={16}
                          animate={false}
                        />
                        {pet.name}
                      </>
                    ) : (
                      "Gemma 4"
                    )}
                  </span>
                  <span className="text-[9px] opacity-60">{msg.timestamp}</span>
                </div>
                {msg.sender === "user" ? <p>{msg.text}</p> : <Markdown content={msg.text} className="text-[13px]" />}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl border border-[#E5E2D9] bg-[#F5F2EA] px-4 py-3 text-xs text-[#5E7161]">
                <Sparkles className="h-4 w-4 animate-spin text-[#D97706]" /> Gemma 4 is thinking…
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto py-2">
          <Chip onClick={() => send(`Test me on ${topic}.`)} disabled={loading}>
            ⚡ Test my recall
          </Chip>
          <Chip onClick={() => send(`What do students most often get wrong about ${topic}?`)} disabled={loading}>
            💡 Common misconception
          </Chip>
          <Chip onClick={() => send(`How's the studying going?`, true)} disabled={loading}>
            🐾 Ask {pet.name}
          </Chip>
        </div>

        <div className="flex items-center gap-2 border-t border-[#E5E2D9] pt-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ask a question, or answer the one you were just asked…"
            className="flex-1 rounded-2xl border border-[#E5E2D9] bg-[#FDFCF8] px-4 py-2.5 text-xs outline-none focus:border-[#5E7161]"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            aria-label="Send"
            className="shrink-0 rounded-2xl bg-[#5E7161] p-2.5 text-white transition-colors hover:bg-[#4E5F51] disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Chip: React.FC<{ onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({
  onClick,
  disabled,
  children,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="shrink-0 whitespace-nowrap rounded-xl border border-[#E5E2D9] bg-[#FDFCF8] px-3 py-1 text-[11px] font-bold text-[#5E7161] transition-colors hover:bg-[#F5F2EA] disabled:opacity-50"
  >
    {children}
  </button>
);

function clock(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
