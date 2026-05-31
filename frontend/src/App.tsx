import { useState, useCallback, useRef, useEffect } from 'react';
import { ChatPanel } from './components/ChatPanel';
import type { ChatMessage, TravelSlots } from './types/travel';
import { classifyIntent, generateItinerary } from './services/api';
import { Plane, Globe } from 'lucide-react';
import { INITIAL_GREETING, INITIAL_SUGGESTIONS, MAX_HISTORY_TURNS, DEFAULT_BUDGET } from './utils/constants';
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
  const processItinerary = async (slots: TravelSlots, signal: AbortSignal, budgetDefaulted: boolean) => {
    const isModify = slots.intent === 'modify_trip';

    const budgetNote = budgetDefaulted
      ? `\n\n_(No budget mentioned — I'll plan a comfortable ₹${DEFAULT_BUDGET.toLocaleString('en-IN')} trip. Tell me a budget if you'd like to adjust it!)_`
      : '';

    const statusMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      sender: 'trippal',
      text: isModify
        ? 'Got it! 🛠️ Recrafting your itinerary with those updates...\n\nThis usually takes few seconds.'
        : `🎉 I have everything I need! Crafting your perfect itinerary now...\n\nThis usually takes few seconds.${budgetNote}`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, statusMsg]);

    const newItinerary = await generateItinerary(slots, signal);

    const lastItineraryMsg = isModify
      ? [...messages].reverse().find(m => m.itinerary)
      : undefined;

    const doneMsg: ChatMessage = {
      id: (Date.now() + 2).toString(),
      sender: 'trippal',
      text: isModify
        ? '✅ Your updated itinerary is ready!\n\nHappy travels! 🌍✈️'
        : '✅ Your itinerary is ready!\n\nHappy travels! 🌍✈️',
      timestamp: new Date().toISOString(),
      itinerary: newItinerary,
      previousItinerary: lastItineraryMsg?.itinerary,
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
          // Budget is optional — fall back to DEFAULT_BUDGET if not provided
          const budgetDefaulted = !mergedSlots.budgetInr;
          if (budgetDefaulted) mergedSlots.budgetInr = DEFAULT_BUDGET;
          mergedSlots.missingSlots = missing;
        }

        setCurrentSlots(mergedSlots);
        const finalSlots = mergedSlots as TravelSlots;

        if (finalSlots.intent === 'plan_trip' || finalSlots.intent === 'modify_trip') {
          if (finalSlots.missingSlots && finalSlots.missingSlots.length > 0) {
            processMissingSlots(finalSlots);
          } else {
            const budgetDefaulted = finalSlots.budgetInr === DEFAULT_BUDGET && !slots.budgetInr;
            await processItinerary(finalSlots, signal, budgetDefaulted);
          }
        } else {
          processOtherIntent(finalSlots.intent || slots.intent);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        const isWarmingUp = error instanceof Error && error.name === 'WarmingUpError';
        const errorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'trippal',
          text: isWarmingUp
            ? `⏳ ${error.message}\n\nJust send your message again in a moment — it'll be instant after that!`
            : `⚠️ Oops! Something went wrong on my end.\n\nError details: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again in a moment.`,
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
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #020d1a 0%, #051828 35%, #03111f 70%, #020a14 100%)' }}>

      {/* Ambient floating orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="orb-1 absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, #0ea5e9 0%, #0284c7 40%, transparent 70%)' }} />
        <div className="orb-2 absolute top-1/3 -right-40 w-80 h-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, #0891b2 40%, transparent 70%)' }} />
        <div className="orb-3 absolute -bottom-24 left-1/3 w-72 h-72 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #38bdf8 0%, #0ea5e9 40%, transparent 70%)' }} />
      </div>

      {/* Header — glassmorphism */}
      <header
        className="relative z-10 px-6 py-4 flex items-center justify-between border-b"
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', boxShadow: '0 0 20px rgba(14,165,233,0.45)' }}>
            <Plane size={20} className="text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">TripPal</h1>
            <p className="text-xs font-medium opacity-60" style={{ color: '#7dd3fc' }}>Intelligent Travel Experience Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
          style={{ background: 'rgba(14,165,233,0.12)', borderColor: 'rgba(14,165,233,0.28)' }}>
          <Globe size={14} style={{ color: '#38bdf8' }} aria-hidden="true" />
          <span className="text-xs font-medium" style={{ color: '#38bdf8' }}>Powered by Gemini</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex overflow-hidden p-4 gap-4 w-full max-w-4xl mx-auto flex-col">
        <div className="flex-1 flex flex-col h-full w-full">
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
