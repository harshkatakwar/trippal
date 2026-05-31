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

export async function generateItinerary(slots: TravelSlots, constraints: any, preferences: any) {
  const systemInstruction = "You are TripPal, an expert travel planner.\nTODAY: " + new Date().toISOString() + "\n\nHARD CONSTRAINTS:\nTotal budget: ₹" + constraints.budgetTotal + "\nTravel dates: " + constraints.departure + " to " + constraints.return + "\n\nPLANNING RULES:\nNever exceed total budget.\nAlways verify venues via search_places before recommending.\nReturn ONLY JSON matching the DayPlan array schema. No prose.";

  const model = getModel(systemInstruction);
  const chat = model.startChat({ tools });

  const prompt = "Generate an itinerary based on:\nSlots: " + JSON.stringify(slots) + "\nPreferences: " + JSON.stringify(preferences);

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
  const cleanedText = text.replace(/^```json/m, '').replace(/^```/m, '').trim();
  
  return JSON.parse(cleanedText);
}
