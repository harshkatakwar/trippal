import { getModel } from './geminiClient.js';
import { TravelSlotsSchema, TravelSlots } from '../types/travel.js';
import { sanitizeInput, extractJsonFromMarkdown } from '../utils/pureLogic.js';
import { PROMPT_INJECTION_GUARD } from '../utils/constants.js';
import { LRUCache } from 'lru-cache';

const intentCache = new LRUCache<string, TravelSlots>({
  max: 500,
  ttl: 1000 * 60 * 60 * 24 // 24 hours
});

const getSystemInstruction = () => `
You are a slot extractor for a travel planning app. 
TODAY'S DATE: ${new Date().toISOString()}

Your task is to classify the user's intent and extract travel slots into a valid JSON object.
Extract all travel slots mentioned ANYWHERE in the conversation history or the latest user message. Do not forget slots that were provided earlier.
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
${PROMPT_INJECTION_GUARD}
`;

export async function classifyAndExtract(userMessage: string, conversationHistory: string[]): Promise<TravelSlots> {
  const sanitizedMessage = sanitizeInput(userMessage);
  
  // Pass the full conversation history (capped at MAX_HISTORY_TURNS by frontend)
  const prompt = "History:\n" + conversationHistory.join("\n") + "\n\nUser: " + sanitizedMessage;

  const cacheKey = prompt;
  const cachedSlots = intentCache.get(cacheKey);
  if (cachedSlots) {
    console.log("Serving intent from cache");
    return cachedSlots;
  }

  const model = getModel(getSystemInstruction());
  
  const result = await model.generateContent(prompt);
  const responseText = result.response.text();
  const cleanedJsonText = extractJsonFromMarkdown(responseText);
  
  try {
    const parsedSlots = JSON.parse(cleanedJsonText);
    
    // Explicit key check before schema parse to ensure no silent swallowing of missing roots
    if (!parsedSlots || typeof parsedSlots !== 'object' || !('intent' in parsedSlots)) {
        throw new Error("Missing required 'intent' key in parsed JSON");
    }

    const finalSlots = TravelSlotsSchema.parse(parsedSlots);
    intentCache.set(cacheKey, finalSlots);
    return finalSlots;
  } catch (error) {
    throw new Error("ValidationError: Failed to parse or validate slots. " + String(error));
  }
}
