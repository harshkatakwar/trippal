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
    const iconProps = { size: 18, className: "text-indigo-400 animate-pulse", 'aria-hidden': true };
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
        className="max-w-[85%] rounded-2xl px-4 py-3 shadow-md border"
        style={{
          background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #f0e6ff 100%)',
          borderColor: '#c7d2fe',
        }}
      >
        <div className="flex items-center gap-3 mb-2">
          {renderIcon()}
          <div className="flex gap-1" aria-hidden="true">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.8s' }} />
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.8s' }} />
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.8s' }} />
          </div>
        </div>
        <p
          className="text-sm font-medium"
          style={{
            color: '#4338ca',
            transition: 'opacity 0.3s ease-in-out',
            opacity: fade ? 1 : 0,
          }}
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
      className="flex flex-col h-full rounded-2xl border shadow-lg overflow-hidden" 
      style={{ background: 'linear-gradient(180deg, #fafbff 0%, #f5f3ff 100%)' }}
    >
      {/* Live Region for Screen Readers */}
      <div role="status" aria-live="polite" className="sr-only">
        {isLoading ? "Loading response, please wait…" : ""}
      </div>

      {/* Header */}
      <header
        className="px-5 py-4 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        }}
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }} aria-hidden="true">
          <Plane size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">TripPal</h2>
          <p className="text-xs font-medium text-white/75">Your AI Travel Buddy</p>
        </div>
        {isLoading && (
          <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-white/20 text-white" aria-hidden="true">
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
      >
        {messages.map((msg) => (
        <React.Fragment key={msg.id}>
          <div 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{ animation: 'fadeSlideIn 0.3s ease-out' }}
          >
            {msg.sender !== 'user' && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0 bg-gradient-to-br from-indigo-600 to-purple-600" aria-hidden="true">
                <Sparkles size={14} className="text-white" />
              </div>
            )}
            <div 
              role={msg.text.includes('⚠️') ? 'alert' : undefined}
              className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-gradient-to-br from-indigo-600 to-indigo-500 text-white rounded-br-sm max-w-[78%]' 
                  : msg.itinerary 
                    ? 'bg-white text-indigo-950 border border-indigo-100 rounded-bl-sm w-full max-w-[95%] sm:max-w-[85%]' 
                    : 'bg-white text-indigo-950 border border-indigo-100 rounded-bl-sm max-w-[78%]'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              
              {msg.itinerary && (
                <div className="mt-4 pt-4 border-t border-indigo-100">
                  <div className="bg-slate-900 rounded-2xl p-4 overflow-hidden shadow-inner">
                    <ItineraryBuilder itinerary={msg.itinerary} />
                  </div>
                </div>
              )}

              <span className="text-[10px] mt-1 block opacity-50">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
          
          {msg.suggestions && msg.suggestions.length > 0 && msg.sender !== 'user' && !isLoading && (
            <div className="flex flex-wrap gap-2 ml-11 mt-1" style={{ animation: 'fadeSlideIn 0.4s ease-out' }}>
              {msg.suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(suggestion)}
                  aria-label={`Send suggested reply: ${suggestion}`}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-indigo-200 bg-white/70 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none transition-colors"
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
      <footer className="px-4 py-3 border-t border-indigo-100">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <label htmlFor="chat-input" className="sr-only">Type your message</label>
          <input
            id="chat-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? "TripPal is thinking..." : "Where do you want to go? ✈️"}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm border border-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 text-indigo-950 bg-white disabled:bg-indigo-50"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl transition-all duration-200 bg-gradient-to-br from-indigo-600 to-purple-600 text-white disabled:opacity-40 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            aria-label="Send message"
          >
            <Send size={18} aria-hidden="true" />
          </button>
        </form>
        <p className="text-[10px] text-center mt-2 text-indigo-300">
          Powered by Gemini AI • Press ⌘+Enter to send
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
