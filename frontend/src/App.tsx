import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatPanel } from './components/ChatPanel';
import type { ChatMessage, TravelSlots } from './types/travel';
import { classifyIntent, generateItinerary } from './services/api';
import { Plane, Globe } from 'lucide-react';
import { INITIAL_GREETING, INITIAL_SUGGESTIONS, MAX_HISTORY_TURNS } from './utils/constants';
import { sanitizeInput } from './utils/pureLogic';

/**
 * The main application component for TripPal.
 * Manages chat state, user intents, and the itinerary generation lifecycle.
 * @returns {JSX.Element} The rendered application layout.
 */
function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1',
    sender: 'trippal',
    text: INITIAL_GREETING,
    timestamp: new Date().toISOString(),
    suggestions: INITIAL_SUGGESTIONS
  }]);

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

  /**
   * Prompts the user for missing required travel slots.
   * @param {TravelSlots} slots - The current travel slots containing missing properties.
   */
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

  /**
   * Handles the itinerary generation process by calling the backend API.
   * Updates chat messages with loading states and the final itinerary result.
   * @param {TravelSlots} slots - The fully populated travel slots for the trip.
   * @param {AbortSignal} signal - Signal to abort the network request if needed.
   */
  const processItinerary = async (slots: TravelSlots, signal: AbortSignal) => {
    const isModify = slots.intent === 'modify_trip';

    const statusMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'trippal',
      text: isModify
        ? 'Got it! 🛠️ Recrafting your itinerary with those updates...\n\nThis usually takes few seconds.'
        : '🎉 I have everything I need! Crafting your perfect itinerary now...\n\nThis usually takes few seconds.',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, statusMsg]);

    const newItinerary = await generateItinerary(slots, signal);

    const doneMsg: ChatMessage = {
      id: (Date.now() + 2).toString(),
      sender: 'trippal',
      text: isModify
        ? '✅ Your updated itinerary is ready!\n\nHappy travels! 🌍✈️'
        : '✅ Your itinerary is ready!\n\nHappy travels! 🌍✈️',
      timestamp: new Date().toISOString(),
      itinerary: newItinerary,
      suggestions: [
        "Make it cheaper",
        "Add more relaxing activities",
        "Change to 3 days instead",
        "Add some local food places"
      ]
    };
    setMessages(prev => [...prev, doneMsg]);
  };

  /**
   * Handles non-trip planning intents by prompting the user to ask something relevant.
   * @param {string} intent - The out-of-scope intent identified by the LLM.
   */
  const processOtherIntent = (intent: string) => {
    let text: string;
    if (intent === 'out_of_scope') {
      text = "I'm sorry, I don't quite understand that. 🤔 Right now, my specialty is planning amazing trips and vacations! 🗺️\n\nTry asking me something like \"Plan a 3-day trip to Goa\" and I'll make it happen!";
    } else {
      const intentName = intent.replace(/_/g, ' ');
      text = `I see you're looking to ${intentName}, but right now my specialty is planning brand new trips! 🗺️\n\nTry asking me something like "Plan a 3-day trip to Goa" and I'll make it happen!`;
    }

    const replyMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'trippal',
      text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, replyMsg]);
  };

  /**
   * Main chat submission handler.
   * Sanitizes input, debounces requests, processes intent via the AI backend, 
   * and deterministically merges travel slots before continuing.
   * @param {string} rawText - The raw string input from the user.
   */
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

        // Ensure strictly required fields aren't undefined to prevent Zod Validation Error
        mergedSlots.confidence = slots.confidence || 1;
        // Accumulate preferences instead of overwriting
        const existingPrefs = currentSlots.preferences || [];
        const newPrefs = slots.preferences || [];
        mergedSlots.preferences = Array.from(new Set([...existingPrefs, ...newPrefs]));

        mergedSlots.reasoning = slots.reasoning || "Merged";

        // Ensure nullable fields are null, not undefined
        mergedSlots.destination = mergedSlots.destination || null;
        mergedSlots.origin = mergedSlots.origin || null;
        mergedSlots.travelDate = mergedSlots.travelDate || null;
        mergedSlots.returnDate = mergedSlots.returnDate || null;
        mergedSlots.numTravelers = mergedSlots.numTravelers || null;
        mergedSlots.budgetInr = mergedSlots.budgetInr || null;

        if (mergedSlots.intent === 'plan_trip' || mergedSlots.intent === 'modify_trip') {
          const missing = [];
          if (!mergedSlots.destination) missing.push('destination');
          if (!mergedSlots.origin) missing.push('origin');
          if (!mergedSlots.travelDate) missing.push('travelDate');
          if (!mergedSlots.numTravelers) missing.push('numTravelers');
          if (!mergedSlots.budgetInr) missing.push('budgetInr');
          mergedSlots.missingSlots = missing;
        }

        setCurrentSlots(mergedSlots);
        const finalSlots = mergedSlots as TravelSlots;

        if (finalSlots.intent === 'plan_trip' || finalSlots.intent === 'modify_trip') {
          if (finalSlots.missingSlots && finalSlots.missingSlots.length > 0) {
            processMissingSlots(finalSlots);
          } else {
            await processItinerary(finalSlots, signal);
          }
        } else {
          processOtherIntent(finalSlots.intent || slots.intent);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Don't show error state on intentional abort
        }

        // TEST T4 — network/API error: user-friendly message shown, no crash
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'trippal',
          text: `⚠️ Oops! Something went wrong on my end.\n\nError details: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease make sure the backend server is running and try again in a moment.`,
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
      <main className="flex-1 flex overflow-hidden p-4 gap-4 w-full max-w-4xl mx-auto flex-col">
        <div className="flex-1 flex flex-col h-full w-full transition-all duration-300">
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </main>
      <footer className="sr-only">TripPal Application Footer</footer>
    </div>
  );
}

export default App;
