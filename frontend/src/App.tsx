import { useState } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { ItineraryBuilder } from './components/ItineraryBuilder';
import type { ChatMessage, DayPlan } from './types/travel';
import { classifyIntent, generateItinerary } from './services/api';

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1',
    sender: 'trippal',
    text: 'Hi! I am TripPal, your personal travel planner. Where would you like to go?',
    timestamp: new Date().toISOString()
  }]);
  
  const [itinerary, setItinerary] = useState<DayPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async (text: string) => {
    // 1. Add user message to chat
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 2. Classify Intent and Extract Slots
      const history = messages.map(m => `${m.sender}: ${m.text}`);
      const slots = await classifyIntent(text, history);

      if (slots.intent === 'plan_trip') {
        if (slots.missingSlots && slots.missingSlots.length > 0) {
          // Ask for missing info
          const replyText = `I can help with that! However, I still need to know: ${slots.missingSlots.join(', ')}.`;
          const replyMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'trippal',
            text: replyText,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, replyMsg]);
        } else {
          // 3. Generate Itinerary
          const statusMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'trippal',
            text: 'I have all the details! Generating your personalized itinerary now...',
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, statusMsg]);
          
          const newItinerary = await generateItinerary(slots);
          setItinerary(newItinerary);
          
          const doneMsg: ChatMessage = {
            id: (Date.now() + 2).toString(),
            sender: 'trippal',
            text: 'Your itinerary is ready! You can review it on the right panel.',
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, doneMsg]);
        }
      } else {
         const replyMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'trippal',
            text: `I understood your intent as: ${slots.intent}. Currently I am only fully equipped to plan new trips. Let's plan a trip!`,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, replyMsg]);
      }
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'trippal',
        text: 'Sorry, I encountered an error while processing your request. Please ensure the backend is running and the API key is valid.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="border-b bg-card px-6 py-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">TripPal</h1>
          <p className="text-sm text-muted-foreground">Intelligent Travel Experience Engine</p>
        </div>
      </header>
      
      <main className="flex-1 flex overflow-hidden p-6 gap-6 max-w-[1600px] w-full mx-auto">
        <div className="w-[400px] flex-shrink-0 flex flex-col">
          <ChatPanel 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading} 
          />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-card rounded-lg border shadow-sm h-full flex flex-col p-6 overflow-hidden">
            <h2 className="text-2xl font-semibold mb-6 flex-shrink-0">Your Itinerary</h2>
            <ItineraryBuilder itinerary={itinerary} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
