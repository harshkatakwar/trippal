import { getModel } from './geminiClient.js';
import { TravelSlots } from '../types/travel.js';
import { searchPlaces, getDirections, getForecast } from './mapsService.js';
import { FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { extractJsonFromMarkdown } from '../utils/pureLogic.js';
import { PROMPT_INJECTION_GUARD, MAX_FUNCTION_CALLS } from '../utils/constants.js';
import { LRUCache } from 'lru-cache';

const itineraryCache = new LRUCache<string, any[]>({
  max: 500,
  ttl: 1000 * 60 * 60 * 24 // 24 hours
});

export interface Constraints {
  budgetTotal: number;
  departure: string;
  return: string;
}

export interface Preferences {
  [key: string]: boolean | string;
}

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
    "accommodationCostInr": 4500,
    "estimatedCostInr": 8000,
    "transitNotes": "Taxi from airport to hotel: ~45 mins"
  }
]`;

/**
 * Handles LLM function calls iteratively up to the max limit
 */
async function processFunctionCalls(chat: any, initialResponse: any) {
  let response = initialResponse;
  let callCount = 0;

  while (response.response.functionCalls() && callCount < MAX_FUNCTION_CALLS) {
    callCount++;
    const calls = response.response.functionCalls();
    if (!calls) break;

    const functionResponses = [];
    for (const call of calls) {
      let apiResponse;
      try {
        const args = call.args as Record<string, string>;
        if (call.name === 'search_places') {
          apiResponse = await searchPlaces(args.query, args.location, args.type);
        } else if (call.name === 'get_directions') {
          apiResponse = await getDirections(args.origin, args.destination, args.mode);
        } else if (call.name === 'get_weather_forecast') {
          apiResponse = await getForecast(args.location, args.date);
        } else {
          throw new Error("Unknown function " + call.name);
        }
        
        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: { result: apiResponse }
          }
        });
      } catch (error: unknown) {
        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: { error: error instanceof Error ? error.message : String(error) }
          }
        });
      }
    }

    response = await chat.sendMessage(functionResponses);
  }

  return response;
}

/**
 * Normalizes the parsed itinerary to ensure strict schema conformance
 */
function normalizeItinerary(parsedJson: any) {
  const itineraryArray = Array.isArray(parsedJson) ? parsedJson : (parsedJson.itinerary || parsedJson.days || [parsedJson]);
  
  return itineraryArray.map((dayPlan: Record<string, any>, index: number) => {
    const isLastDay = index === itineraryArray.length - 1;
    let accommodation = dayPlan.accommodation || "To be decided";
    if (isLastDay) {
      accommodation = "In your comfort zone";
    }

    const morning = Array.isArray(dayPlan.morning) ? dayPlan.morning : [];
    const afternoon = Array.isArray(dayPlan.afternoon) ? dayPlan.afternoon : [];
    const evening = Array.isArray(dayPlan.evening) ? dayPlan.evening : [];
    
    const allActivities = [...morning, ...afternoon, ...evening];
    const activitiesCost = allActivities.reduce((acc, curr) => acc + (curr.costInr || 0), 0);
    const accommodationCostInr = dayPlan.accommodationCostInr || 0;

    return {
      day: dayPlan.day || index + 1,
      date: dayPlan.date || new Date(Date.now() + index * 86400000).toISOString().split('T')[0],
      theme: dayPlan.theme || "Exploration",
      morning,
      afternoon,
      evening,
      accommodation,
      accommodationCostInr,
      estimatedCostInr: activitiesCost + accommodationCostInr,
      transitNotes: dayPlan.transitNotes || dayPlan.transit_notes || ""
    };
  });
}

export async function generateItinerary(slots: TravelSlots, constraints: Constraints, preferences: Preferences) {
  const cacheKey = JSON.stringify({ slots, constraints, preferences });
  const cachedItinerary = itineraryCache.get(cacheKey);
  if (cachedItinerary) {
    console.debug('[itineraryCache] Cache hit for destination:', slots.destination);
    return cachedItinerary;
  }

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
    "- Include accommodationCostInr (number) in the DayPlan to represent the cost of the hotel for that night.",
    "- estimatedCostInr for each day MUST EXACTLY equal the sum of all activity costs plus accommodationCostInr.",
    "- Return ONLY a valid JSON array of DayPlan objects. No markdown, no prose, no explanation.",
    PROMPT_INJECTION_GUARD,
    "",
    "EXACT OUTPUT SCHEMA (follow this structure precisely):",
    DAYPLAN_SCHEMA
  ].join("\n");

  const model = getModel(systemInstruction);
  const chat = model.startChat({ tools });

  const prefString = preferences && Object.keys(preferences).length > 0 
    ? JSON.stringify(preferences) 
    : (slots.preferences?.join(", ") || "general sightseeing");

  const originPrompt = slots.origin 
    ? `\n- CRITICAL: The very first activity on Day 1 MUST be the journey from ${slots.origin} to ${slots.destination}. The very last activity on the final day MUST be the journey from ${slots.destination} back to ${slots.origin}. Include realistic transit times (flights/trains) and costs in these activities.` 
    : "";

  const prompt = "Generate a detailed day-by-day itinerary. Return ONLY a JSON array.\n\nTrip details:\n- Destination: " + (slots.destination || "Unknown") + "\n- Origin: " + (slots.origin || "Unknown") + "\n- Dates: " + (slots.travelDate || "today") + " to " + (slots.returnDate || "3 days from now") + "\n- Travelers: " + (slots.numTravelers || 2) + "\n- Budget: ₹" + (slots.budgetInr || 50000) + "\n- Preferences: " + prefString + originPrompt;

  const initialResponse = await chat.sendMessage(prompt);
  const finalResponse = await processFunctionCalls(chat, initialResponse);

  const text = finalResponse.response.text();
  const cleanedText = extractJsonFromMarkdown(text);
  
  try {
    const parsedJson = JSON.parse(cleanedText);
    if (!parsedJson) {
       throw new Error("Parsed JSON is null");
    }
    const finalItinerary = normalizeItinerary(parsedJson);
    itineraryCache.set(cacheKey, finalItinerary);
    return finalItinerary;
  } catch (error) {
    throw new Error("Failed to parse LLM itinerary response: " + String(error));
  }
}
