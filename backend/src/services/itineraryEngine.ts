import { getModel } from './geminiClient.js';
import { TravelSlots } from '../types/travel.js';
import { searchPlaces, getDirections, getForecast } from './mapsService.js';
import { FunctionDeclaration, SchemaType } from '@google/generative-ai';

const searchPlacesTool: FunctionDeclaration = {
  name: 'search_places',
  description: 'Search for places, venues, or activities in a specific location',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: 'The search query (e.g., "vegetarian restaurant", "museum")' },
      location: { type: SchemaType.STRING, description: 'The city or area to search in' },
      type: { type: SchemaType.STRING, description: 'Optional place type' }
    },
    required: ['query', 'location']
  }
};

const getDirectionsTool: FunctionDeclaration = {
  name: 'get_directions',
  description: 'Get travel time and distance between two locations',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      origin: { type: SchemaType.STRING, description: 'Starting location or place ID' },
      destination: { type: SchemaType.STRING, description: 'Ending location or place ID' },
      mode: { type: SchemaType.STRING, description: 'Travel mode: driving, walking, bicycling, transit' }
    },
    required: ['origin', 'destination', 'mode']
  }
};

const getWeatherForecastTool: FunctionDeclaration = {
  name: 'get_weather_forecast',
  description: 'Get weather forecast for a location and date',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      location: { type: SchemaType.STRING, description: 'City or area' },
      date: { type: SchemaType.STRING, description: 'ISO date string' }
    },
    required: ['location', 'date']
  }
};

const tools = [
  {
    functionDeclarations: [searchPlacesTool, getDirectionsTool, getWeatherForecastTool]
  }
];

const DAYPLAN_SCHEMA = `
[
  {
    "day": 1,
    "date": "2026-06-01",
    "theme": "Arrival & Beach Vibes",
    "morning": [
      {
        "name": "Calangute Beach",
        "description": "Start your trip with a relaxing visit to one of Goa's most popular beaches.",
        "durationMinutes": 120,
        "location": "Calangute, North Goa",
        "placeId": "place_calangute",
        "costInr": 0,
        "category": "beach",
        "accessibilityNotes": "Sandy terrain",
        "rating": 4.3
      }
    ],
    "afternoon": [
      {
        "name": "Lunch at Britto's",
        "description": "Enjoy seafood and Goan cuisine at this iconic beachside restaurant.",
        "durationMinutes": 90,
        "location": "Baga Beach Road",
        "placeId": "place_brittos",
        "costInr": 1500,
        "category": "food",
        "accessibilityNotes": "Wheelchair accessible",
        "rating": 4.1
      }
    ],
    "evening": [
      {
        "name": "Tito's Lane",
        "description": "Experience Goa's famous nightlife at Tito's Lane.",
        "durationMinutes": 180,
        "location": "Baga, North Goa",
        "placeId": "place_titos",
        "costInr": 2000,
        "category": "nightlife",
        "accessibilityNotes": "Crowded area",
        "rating": 4.0
      }
    ],
    "accommodation": "Hotel Fidalgo, Panaji",
    "estimatedCostInr": 8000,
    "transitNotes": "Taxi from airport to hotel: ~45 mins"
  }
]`;

export async function generateItinerary(slots: TravelSlots, constraints: any, preferences: any) {
  const systemInstruction = [
    "You are TripPal, an expert Indian travel planner with deep local knowledge.",
    "TODAY: " + new Date().toISOString(),
    "",
    "HARD CONSTRAINTS:",
    "Total budget: ₹" + constraints.budgetTotal,
    "Travel dates: " + constraints.departure + " to " + constraints.return,
    "",
    "PLANNING RULES:",
    "- Never exceed total budget.",
    "- Each day MUST have at least 1 activity in morning, afternoon, and evening arrays.",
    "- Every activity MUST have ALL these fields: name, description, durationMinutes (number), location (string), placeId (string), costInr (number), category (string), accessibilityNotes (string), rating (number 0-5).",
    "- estimatedCostInr for each day should be the sum of all activity costs plus accommodation.",
    "- Return ONLY a valid JSON array of DayPlan objects. No markdown, no prose, no explanation.",
    "",
    "EXACT OUTPUT SCHEMA (follow this structure precisely):",
    DAYPLAN_SCHEMA
  ].join("\n");

  const model = getModel(systemInstruction);
  const chat = model.startChat({ tools });

  const prompt = "Generate a detailed day-by-day itinerary. Return ONLY a JSON array.\n\nTrip details:\n- Destination: " + (slots.destination || "Unknown") + "\n- Origin: " + (slots.origin || "Unknown") + "\n- Dates: " + (slots.travelDate || "today") + " to " + (slots.returnDate || "3 days from now") + "\n- Travelers: " + (slots.numTravelers || 2) + "\n- Budget: ₹" + (slots.budgetInr || 50000) + "\n- Preferences: " + (slots.preferences?.join(", ") || "general sightseeing");

  let response = await chat.sendMessage(prompt);
  let callCount = 0;

  // Function calling loop
  while (response.response.functionCalls() && callCount < 10) {
    callCount++;
    const calls = response.response.functionCalls();
    if (!calls) break;

    const functionResponses = [];
    for (const call of calls) {
      let apiResponse;
      try {
        const args = call.args as Record<string, any>;
        if (call.name === 'search_places') {
          apiResponse = await searchPlaces(args.query as string, args.location as string, args.type as string);
        } else if (call.name === 'get_directions') {
          apiResponse = await getDirections(args.origin as string, args.destination as string, args.mode as string);
        } else if (call.name === 'get_weather_forecast') {
          apiResponse = await getForecast(args.location as string, args.date as string);
        } else {
          throw new Error("Unknown function " + call.name);
        }
        
        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: { result: apiResponse }
          }
        });
      } catch (error: any) {
        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: { error: error.message }
          }
        });
      }
    }

    // Send function responses back to the model
    response = await chat.sendMessage(functionResponses);
  }

  const text = response.response.text();
  // Strip markdown code fences if present
  const cleanedText = text.replace(/^```json\s*/m, '').replace(/```\s*$/m, '').trim();
  
  const parsed = JSON.parse(cleanedText);
  
  // Ensure we always return an array
  const itinerary = Array.isArray(parsed) ? parsed : (parsed.itinerary || parsed.days || [parsed]);
  
  // Ensure each day has the required arrays
  return itinerary.map((day: any, index: number) => ({
    day: day.day || index + 1,
    date: day.date || new Date(Date.now() + index * 86400000).toISOString().split('T')[0],
    theme: day.theme || "Exploration",
    morning: Array.isArray(day.morning) ? day.morning : [],
    afternoon: Array.isArray(day.afternoon) ? day.afternoon : [],
    evening: Array.isArray(day.evening) ? day.evening : [],
    accommodation: day.accommodation || "To be decided",
    estimatedCostInr: day.estimatedCostInr || day.estimated_cost_inr || 0,
    transitNotes: day.transitNotes || day.transit_notes || ""
  }));
}
