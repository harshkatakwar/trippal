import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Plane, Palmtree, MapPin, Sparkles, Compass } from 'lucide-react';
import type { ChatMessage } from '../../types/travel';
import { ItineraryBuilder } from '../ItineraryBuilder';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const TRAVEL_PHRASES = [
  { text: "Packing your dream itinerary...", icon: "plane" },
  { text: "Good days are coming! ✨", icon: "sparkles" },
  { text: "Planning the best OOO of your life...", icon: "palmtree" },
  { text: "Discovering hidden gems...", icon: "compass" },
  { text: "Sunshine & adventures await! 🌅", icon: "sparkles" },
  { text: "Curating unforgettable moments...", icon: "plane" },
  { text: "Your happiness journey starts here...", icon: "palmtree" },
  { text: "Finding the perfect spots just for you...", icon: "mappin" },
  { text: "Out of office mode: activated 🏖️", icon: "sparkles" },
  { text: "Making memories before you even leave...", icon: "compass" },
];

function ThinkingIndicator() {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % TRAVEL_PHRASES.length);
        setFade(true);
      }, 300);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const phrase = TRAVEL_PHRASES[phraseIndex];

  const renderIcon = () => {
    const iconProps = { size: 18, className: "text-sky-400 animate-pulse", 'aria-hidden': true };
    switch (phrase.icon) {
      case "plane": return <Plane {...iconProps} />;
      case "palmtree": return <Palmtree {...iconProps} />;
      case "mappin": return <MapPin {...iconProps} />;
      case "sparkles": return <Sparkles {...iconProps} />;
      case "compass": return <Compass {...iconProps} />;
      default: return <Plane {...iconProps} />;
    }
  };

  return (
    <div className="flex justify-start" aria-busy="true" aria-label="TripPal is thinking">
      <div
        className="max-w-[85%] rounded-2xl px-4 py-3 shadow-lg border"
        style={{
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(14,165,233,0.2)',
          boxShadow: '0 4px 24px rgba(14,165,233,0.12)',
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          {renderIcon()}
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#0ea5e9', animationDelay: '0ms', animationDuration: '0.7s' }} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#06b6d4', animationDelay: '140ms', animationDuration: '0.7s' }} />
            <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#67e8f9', animationDelay: '280ms', animationDuration: '0.7s' }} />
          </div>
        </div>
        <p
          className="text-sm font-semibold shimmer-text"
          style={{ transition: 'opacity 0.3s ease-in-out', opacity: fade ? 1 : 0 }}
        >
          {phrase.text}
        </p>
      </div>
    </div>
  );
}

/**
 * Displays the chat interface including message history and input field.
 * Wrapped in React.memo to prevent unnecessary re-renders when parent state changes.
 */
export const ChatPanel = React.memo(function ChatPanel({ messages, onSendMessage, isLoading }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  }, [input, isLoading, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e);
    }
  }, [handleSubmit]);

  return (
    <section
      aria-label="Chat interface"
      className="flex flex-col h-full rounded-2xl overflow-hidden border"
      style={{
        background: 'rgba(255,255,255,0.97)',
        borderColor: 'rgba(14,165,233,0.15)',
        boxShadow: '0 8px 48px rgba(14,165,233,0.12), 0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Live Region for Screen Readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {isLoading ? "Loading response, please wait…" : ""}
      </div>

      {/* Header */}
      <header
        className="px-5 py-4 flex items-center gap-3"
        style={{ background: 'linear-gradient(135deg, #0369a1 0%, #0891b2 100%)' }}
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.18)', boxShadow: '0 0 12px rgba(255,255,255,0.15)' }}
          aria-hidden="true">
          <Plane size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">TripPal</h2>
          <p className="text-xs font-medium text-white/60">Your AI Travel Buddy</p>
        </div>
        {isLoading && (
          <span className="ml-auto text-xs font-semibold px-3 py-1 rounded-full text-sky-200 fade-up"
            style={{ background: 'rgba(255,255,255,0.12)' }}
            aria-hidden="true">
            Thinking...
          </span>
        )}
      </header>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-12 space-y-3"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        style={{ background: 'linear-gradient(180deg, #f8fbff 0%, #f0f8ff 100%)' }}
      >
        {messages.map((msg) => (
          <React.Fragment key={msg.id}>
            <div className={`flex ${msg.sender === 'user' ? 'justify-end msg-user' : 'justify-start msg-bot'}`}>
              {msg.sender !== 'user' && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', boxShadow: '0 2px 8px rgba(14,165,233,0.35)' }}
                  aria-hidden="true">
                  <Sparkles size={13} className="text-white" />
                </div>
              )}
              <div
                role={msg.text.includes('⚠️') || msg.text.includes('⏳') ? 'alert' : undefined}
                className={`rounded-2xl px-4 py-2.5 ${
                  msg.sender === 'user'
                    ? 'text-white rounded-br-sm max-w-[78%]'
                    : msg.itinerary
                      ? 'text-slate-900 rounded-bl-sm w-full max-w-[95%] sm:max-w-[88%]'
                      : 'text-slate-900 rounded-bl-sm max-w-[78%]'
                }`}
                style={msg.sender === 'user' ? {
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
                  boxShadow: '0 3px 16px rgba(14,165,233,0.35)',
                } : {
                  background: 'white',
                  border: '1px solid rgba(14,165,233,0.12)',
                  boxShadow: '0 2px 12px rgba(14,165,233,0.07)',
                }}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                {msg.itinerary && (
                  <div className="mt-4 pt-4 border-t border-sky-100">
                    <div className="rounded-2xl p-4 overflow-hidden"
                      style={{ background: 'linear-gradient(160deg, #0f0720 0%, #1a103a 100%)', boxShadow: 'inset 0 2px 16px rgba(0,0,0,0.3)' }}>
                      <ItineraryBuilder itinerary={msg.itinerary} previousItinerary={msg.previousItinerary} />
                    </div>
                  </div>
                )}

                <span className="text-[10px] mt-1 block opacity-40">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {msg.suggestions && msg.suggestions.length > 0 && msg.sender !== 'user' && !isLoading && (
              <div className="flex flex-wrap gap-2 ml-11 mt-1 fade-up">
                {msg.suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSendMessage(suggestion)}
                    aria-label={`Send suggested reply: ${suggestion}`}
                    className="chip-hover text-xs font-medium px-3 py-1.5 rounded-full border text-sky-600 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none"
                    style={{ background: 'rgba(14,165,233,0.06)', borderColor: 'rgba(14,165,233,0.2)' }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
        {isLoading && <ThinkingIndicator />}
        <div className="h-8 flex-shrink-0" aria-hidden="true" />
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <footer className="px-4 py-3 border-t" style={{ borderColor: 'rgba(14,165,233,0.1)', background: 'white' }}>
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <label htmlFor="chat-input" className="sr-only">Type your message</label>
          <input
            id="chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? "TripPal is thinking..." : "Where do you want to go? ✈️"}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus-visible:outline-none transition-all duration-200 disabled:opacity-50"
            style={{ background: '#f5f3ff', border: '1.5px solid rgba(14,165,233,0.2)' }}
            onFocus={e => (e.target.style.borderColor = 'rgba(14,165,233,0.6)', e.target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.12)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(14,165,233,0.2)', e.target.style.boxShadow = 'none')}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn-press p-2.5 rounded-xl text-white disabled:opacity-35 focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:outline-none transition-all duration-150"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', boxShadow: input.trim() ? '0 4px 16px rgba(14,165,233,0.45)' : 'none' }}
            aria-label="Send message"
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </form>
        <p className="text-[10px] text-center mt-2" style={{ color: '#7dd3fc' }}>
          Powered by Gemini AI · Press ⌘+Enter to send
        </p>
      </footer>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
});
