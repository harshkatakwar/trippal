export interface TravelSlots {
  intent: 'plan_trip' | 'find_flights' | 'find_hotels' | 'modify_trip' | 'cancel_booking' | 'get_itinerary' | 'out_of_scope';
  confidence: number;
  destination: string | null;
  origin: string | null;
  travelDate: string | null;
  returnDate: string | null;
  numTravelers: number | null;
  budgetInr: number | null;
  preferences: string[];
  missingSlots: string[];
  reasoning: string;
}

export interface Activity {
  name: string;
  description: string;
  durationMinutes: number;
  location: string;
  placeId: string;
  costInr: number;
  category: string;
  accessibilityNotes: string;
  rating: number;
}

export interface DayPlan {
  day: number;
  date: string;
  theme: string;
  morning: Activity[];
  afternoon: Activity[];
  evening: Activity[];
  accommodation: string;
  estimatedCostInr: number;
  transitNotes: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'trippal';
  text: string;
  timestamp: string;
  suggestions?: string[];
  itinerary?: DayPlan[];
}
