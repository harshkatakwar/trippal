import React, { useState, useRef, useEffect } from 'react';
import { Send, Plane, Palmtree, MapPin, Sparkles, Compass } from 'lucide-react';
import type { ChatMessage } from '../../types/travel';

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
    const iconProps = { size: 18, className: "text-indigo-400 animate-pulse" };
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
          <div className="flex gap-1">
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

export function ChatPanel({ messages, onSendMessage, isLoading }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e as any);
    }
  };

  return (
    <div className="flex flex-col h-full rounded-2xl border shadow-lg overflow-hidden" style={{ background: 'linear-gradient(180deg, #fafbff 0%, #f5f3ff 100%)' }}>
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        }}
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <Plane size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white tracking-tight">TripPal</h2>
          <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>Your AI Travel Buddy</p>
        </div>
        {isLoading && (
          <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
            Thinking...
          </span>
        )}
      </div>
      
      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        role="log" 
        aria-live="polite"
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{ animation: 'fadeSlideIn 0.3s ease-out' }}
          >
            {msg.sender !== 'user' && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2 mt-1 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                <Sparkles size={14} className="text-white" />
              </div>
            )}
            <div 
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm ${
                msg.sender === 'user' 
                  ? '' 
                  : 'border'
              }`}
              style={msg.sender === 'user' ? {
                background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: 'white',
                borderRadius: '20px 20px 4px 20px',
              } : {
                background: 'white',
                color: '#1e1b4b',
                borderColor: '#e0e7ff',
                borderRadius: '20px 20px 20px 4px',
              }}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              <span className="text-[10px] mt-1 block" style={{ opacity: 0.5 }}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && <ThinkingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid #e0e7ff' }}>
        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? "TripPal is thinking..." : "Where do you want to go? ✈️"}
            className="flex-1 rounded-xl px-4 py-2.5 text-sm border focus:outline-none transition-all"
            style={{
              background: 'white',
              borderColor: isLoading ? '#c7d2fe' : '#e0e7ff',
              color: '#1e1b4b',
            }}
            disabled={isLoading}
            aria-label="Type your message"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl transition-all duration-200 disabled:opacity-40"
            style={{
              background: !input.trim() || isLoading ? '#c7d2fe' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: 'white',
            }}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </form>
        <p className="text-[10px] text-center mt-2" style={{ color: '#a5b4fc' }}>
          Powered by Gemini AI • Press ⌘+Enter to send
        </p>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
