import { useState } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { ItineraryBuilder } from './components/ItineraryBuilder';
import type { ChatMessage, DayPlan } from './types/travel';
import { classifyIntent, generateItinerary } from './services/api';
import { Plane, Globe } from 'lucide-react';

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1',
    sender: 'trippal',
    text: "Hey there! 👋 I'm TripPal, your AI travel buddy.\n\nTell me where you'd like to go, and I'll craft the perfect itinerary for you. Just say something like:\n\n🏖️ \"Plan a 5-day trip to Goa\"\n🏔️ \"I want to visit Manali next week\"\n🕌 \"Weekend getaway to Jaipur under 20k\"",
    timestamp: new Date().toISOString()
  }]);
  
  const [itinerary, setItinerary] = useState<DayPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages.map(m => `${m.sender}: ${m.text}`);
      const slots = await classifyIntent(text, history);

      if (slots.intent === 'plan_trip') {
        if (slots.missingSlots && slots.missingSlots.length > 0) {
          const replyText = `Almost there! 🎯 I just need a few more details:\n\n${slots.missingSlots.map(s => `• ${s}`).join('\n')}\n\nFeel free to tell me everything at once!`;
          const replyMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'trippal',
            text: replyText,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, replyMsg]);
        } else {
          const statusMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'trippal',
            text: '🎉 I have everything I need! Crafting your perfect itinerary now...\n\nThis usually takes 10-20 seconds.',
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, statusMsg]);
          
          const newItinerary = await generateItinerary(slots);
          setItinerary(newItinerary);
          
          const doneMsg: ChatMessage = {
            id: (Date.now() + 2).toString(),
            sender: 'trippal',
            text: '✅ Your itinerary is ready!\n\nCheck out the detailed day-by-day plan on the right panel. You can scroll through each day to see activities, costs, and recommendations.\n\nHappy travels! 🌍✈️',
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, doneMsg]);
        }
      } else {
         const replyMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'trippal',
            text: `I understood your intent as "${slots.intent}". Right now I'm best at planning new trips! 🗺️\n\nTry something like "Plan a trip to Goa" and I'll make it happen!`,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, replyMsg]);
      }
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'trippal',
        text: '⚠️ Oops! Something went wrong on my end.\n\nPlease make sure the backend server is running and try again in a moment.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #0f0a2e 0%, #1a1145 30%, #0d1b3e 70%, #0a0f24 100%)' }}>
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <Plane size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">TripPal</h1>
            <p className="text-xs font-medium" style={{ color: 'rgba(165,180,252,0.8)' }}>Intelligent Travel Experience Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Globe size={14} style={{ color: '#a5b4fc' }} />
          <span className="text-xs font-medium" style={{ color: '#a5b4fc' }}>Powered by Gemini 3.5 Flash</span>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4 max-w-[1600px] w-full mx-auto">
        <div className="w-[420px] flex-shrink-0 flex flex-col">
          <ChatPanel 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading} 
          />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          <div className="rounded-2xl shadow-lg h-full flex flex-col p-6 overflow-hidden border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <h2 className="text-xl font-bold mb-5 flex-shrink-0 flex items-center gap-2" style={{ color: 'white' }}>
              <span style={{ background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Your Itinerary</span>
              {itinerary.length > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(79,70,229,0.2)', color: '#a5b4fc' }}>
                  {itinerary.length} days
                </span>
              )}
            </h2>
            <ItineraryBuilder itinerary={itinerary} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
