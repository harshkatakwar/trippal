import { getModel } from './geminiClient.js';
import { TravelSlotsSchema, TravelSlots } from '../types/travel.js';

function sanitizeInput(input: string): string {
  // Strip HTML and truncate to 500 characters
  return input.replace(/<[^>]*>?/gm, '').substring(0, 500);
}

const getSystemInstruction = () => `
You are a slot extractor for a travel planning app. 
TODAY'S DATE: ${new Date().toISOString()}

Your task is to classify the user's intent and extract travel slots into a valid JSON object.
Convert relative dates to ISO 8601 using today's date.
Convert shorthand budgets (e.g., "30k" to 30000, "1 lakh" to 100000).
Use null for unstated values.

Return ONLY a valid JSON object matching this structure:
{
  "intent": "plan_trip" | "find_flights" | "find_hotels" | "modify_trip" | "cancel_booking" | "get_itinerary" | "out_of_scope",
  "confidence": number (0-1),
  "destination": string | null,
  "origin": string | null,
  "travelDate": string | null (ISO format),
  "returnDate": string | null (ISO format),
  "numTravelers": number | null,
  "budgetInr": number | null,
  "preferences": string[],
  "missingSlots": string[],
  "reasoning": string
}
`;

export async function classifyAndExtract(userMessage: string, conversationHistory: string[]): Promise<TravelSlots> {
  const sanitizedMessage = sanitizeInput(userMessage);
  
  // Pass the last four conversation history items
  const recentHistory = conversationHistory.slice(-4);
  const prompt = "History:\n" + recentHistory.join("\n") + "\n\nUser: " + sanitizedMessage;

  const model = getModel(getSystemInstruction());
  
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  // Strip markdown fences
  const cleanedText = text.replace(/^```json/m, '').replace(/^```/m, '').trim();
  
  try {
    const parsed = JSON.parse(cleanedText);
    return TravelSlotsSchema.parse(parsed);
  } catch (error) {
    throw new Error("ValidationError: Failed to parse or validate slots. " + String(error));
  }
}
