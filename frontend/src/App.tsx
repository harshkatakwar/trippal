import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { ItineraryBuilder } from './components/ItineraryBuilder';
import type { ChatMessage, DayPlan, TravelSlots } from './types/travel';
import { classifyIntent, generateItinerary } from './services/api';
import { Plane, Globe } from 'lucide-react';
import { INITIAL_GREETING, INITIAL_SUGGESTIONS, MAX_HISTORY_TURNS } from './utils/constants';
import { sanitizeInput } from './utils/pureLogic';

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1',
    sender: 'trippal',
    text: INITIAL_GREETING,
    timestamp: new Date().toISOString(),
    suggestions: INITIAL_SUGGESTIONS
  }]);
  
  const [itinerary, setItinerary] = useState<DayPlan[]>([]);
  const [currentSlots, setCurrentSlots] = useState<Partial<TravelSlots>>({});
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up side effects on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const processMissingSlots = (slots: TravelSlots) => {
    const slotNames: Record<string, string> = {
      destination: "Destination 🌍",
      origin: "Starting city 🛫",
      travelDate: "Travel date 📅",
      returnDate: "Return date (or number of days) 🗓️",
      numTravelers: "Number of travelers 👥",
      budgetInr: "Total budget 💰"
    };

    const missingList = slots.missingSlots.map(s => `• ${slotNames[s] || s}`).join('\n');
    const replyMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'trippal',
      text: `Almost there! 🎯 I just need a few more details:\n\n${missingList}\n\nFeel free to tell me everything at once!`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, replyMsg]);
  };

  const processItinerary = async (slots: TravelSlots, signal: AbortSignal) => {
    const statusMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'trippal',
      text: '🎉 I have everything I need! Crafting your perfect itinerary now...\n\nThis usually takes 10-20 seconds.',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, statusMsg]);
    
    const newItinerary = await generateItinerary(slots, signal);
    setItinerary(newItinerary);
    
    const doneMsg: ChatMessage = {
      id: (Date.now() + 2).toString(),
      sender: 'trippal',
      text: '✅ Your itinerary is ready!\n\nCheck out the detailed day-by-day plan on the right panel. You can scroll through each day to see activities, costs, and recommendations.\n\nHappy travels! 🌍✈️',
      timestamp: new Date().toISOString(),
      suggestions: [
        "Make it cheaper",
        "Add more relaxing activities",
        "Change to 3 days instead",
        "Add some local food places"
      ]
    };
    setMessages(prev => [...prev, doneMsg]);
  };

  const processOtherIntent = (intent: string) => {
    const replyMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'trippal',
      text: `I understood your intent as "${intent}". Right now I'm best at planning new trips! 🗺️\n\nTry something like "Plan a trip to Goa" and I'll make it happen!`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, replyMsg]);
  };

  const handleSendMessage = useCallback(async (rawText: string) => {
    // TEST T6 — malicious input (<script>): sanitized, safe output
    // TEST T3 — long input (2000+ chars): truncated gracefully
    const text = sanitizeInput(rawText);
    
    // TEST T2 — empty input: blocked early, no API call fired
    if (!text.trim()) return;

    // TEST T5 — rapid fire: AbortController cancels prior request
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const recentHistory = messages.slice(-MAX_HISTORY_TURNS).map(m => `${m.sender}: ${m.text}`);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        // TEST T1 — happy path: valid input → correct output rendered
        const slots = await classifyIntent(text, recentHistory, signal);

        // DETERMINISTIC SLOT MERGING
        // AI models frequently suffer from recency bias in long context windows and output null for past slots.
        // We merge extracted slots locally to ensure nothing is ever forgotten.
        const mergedSlots = { ...currentSlots };
        if (slots.intent && slots.intent !== 'out_of_scope') mergedSlots.intent = slots.intent;
        if (slots.destination) mergedSlots.destination = slots.destination;
        if (slots.origin) mergedSlots.origin = slots.origin;
        if (slots.travelDate) mergedSlots.travelDate = slots.travelDate;
        if (slots.returnDate) mergedSlots.returnDate = slots.returnDate;
        if (slots.numTravelers) mergedSlots.numTravelers = slots.numTravelers;
        if (slots.budgetInr) mergedSlots.budgetInr = slots.budgetInr;

        if (mergedSlots.intent === 'plan_trip') {
          const missing = [];
          if (!mergedSlots.destination) missing.push('destination');
          if (!mergedSlots.origin) missing.push('origin');
          if (!mergedSlots.travelDate) missing.push('travelDate');
          if (!mergedSlots.numTravelers) missing.push('numTravelers');
          mergedSlots.missingSlots = missing;
        }

        setCurrentSlots(mergedSlots);
        const finalSlots = mergedSlots as TravelSlots;

        if (finalSlots.intent === 'plan_trip') {
          if (finalSlots.missingSlots && finalSlots.missingSlots.length > 0) {
            processMissingSlots(finalSlots);
          } else {
            await processItinerary(finalSlots, signal);
          }
        } else {
          processOtherIntent(finalSlots.intent || slots.intent);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return; // Don't show error state on intentional abort
        }
        
        // TEST T4 — network/API error: user-friendly message shown, no crash
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'trippal',
          text: '⚠️ Oops! Something went wrong on my end.\n\nPlease make sure the backend server is running and try again in a moment.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMsg]);
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 500); // 500ms debounce
  }, [messages, currentSlots]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f0a2e 0%, #1a1145 30%, #0d1b3e 70%, #0a0f24 100%)' }}>
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-600">
            <Plane size={20} className="text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">TripPal</h1>
            <p className="text-xs font-medium text-indigo-200 opacity-80">Intelligent Travel Experience Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
          <Globe size={14} className="text-indigo-300" aria-hidden="true" />
          <span className="text-xs font-medium text-indigo-300">Powered by Gemini 3.5 Flash</span>
        </div>
      </header>
      
      {/* Main Content */}
      <main className={`flex-1 flex overflow-hidden p-4 gap-4 w-full mx-auto flex-wrap lg:flex-nowrap min-w-[320px] ${itinerary.length > 0 ? 'max-w-[1600px]' : 'max-w-[800px] justify-center'}`}>
        <div className={`flex-shrink-0 flex flex-col h-[600px] lg:h-auto transition-all duration-300 ${itinerary.length > 0 ? 'w-full lg:w-[420px]' : 'w-full'}`}>
          <ChatPanel 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading} 
          />
        </div>
        
        {itinerary.length > 0 && (
          <div className="flex-1 flex flex-col min-w-0 h-[600px] lg:h-auto mt-4 lg:mt-0 transition-all duration-300">
            <div className="rounded-2xl shadow-lg h-full flex flex-col p-6 overflow-hidden border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
              <h2 className="text-xl font-bold mb-5 flex-shrink-0 flex items-center gap-2 text-white">
                <span className="bg-clip-text text-transparent bg-gradient-to-br from-purple-400 to-indigo-400">Your Itinerary</span>
                {useMemo(() => (itinerary.length > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                    {itinerary.length} days
                  </span>
                )), [itinerary.length])}
              </h2>
              <ItineraryBuilder itinerary={itinerary} />
            </div>
          </div>
        )}
      </main>
      <footer className="sr-only">TripPal Application Footer</footer>
    </div>
  );
}

export default App;
