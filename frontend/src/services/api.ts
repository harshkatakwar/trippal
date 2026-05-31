import type { TravelSlots, DayPlan } from '../types/travel';
import { API_BASE, DEFAULT_BUDGET } from '../utils/constants';

/**
 * Calls the backend intent pipeline to extract travel slots from the user's message.
 * @param {string} userMessage - The raw string input from the user.
 * @param {string[]} conversationHistory - Array of recent chat messages for context.
 * @param {AbortSignal} signal - Signal to abort the network request.
 * @returns {Promise<TravelSlots>} The extracted travel slots.
 * @throws {Error} If the backend request fails.
 */
export const classifyIntent = async (
  userMessage: string, 
  conversationHistory: string[] = [],
  signal?: AbortSignal
): Promise<TravelSlots> => {
  const res = await fetch(`${API_BASE}/intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userMessage, conversationHistory }),
    signal
  });
  
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.message || errData?.error || 'Failed to classify intent');
  }
  
  return res.json();
};

/**
 * Calls the backend itinerary engine to generate a detailed day-by-day plan.
 * @param {TravelSlots} slots - The finalized travel slots for the trip.
 * @param {AbortSignal} signal - Signal to abort the network request.
 * @returns {Promise<DayPlan[]>} An array of day plans comprising the itinerary.
 * @throws {Error} If the backend request fails or validation errors occur.
 */
export const generateItinerary = async (
  slots: TravelSlots,
  signal?: AbortSignal
): Promise<DayPlan[]> => {
  // Pass some dummy constraints for now until we build the constraint UI
  const isValidDate = (d: string | null | undefined) => d && !isNaN(Date.parse(d));
  
  const dummyConstraints = {
    budgetTotal: slots.budgetInr || DEFAULT_BUDGET,
    departure: isValidDate(slots.travelDate) ? new Date(slots.travelDate as string).toISOString() : new Date().toISOString(),
    return: isValidDate(slots.returnDate) ? new Date(slots.returnDate as string).toISOString() : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  };
  
  const res = await fetch(`${API_BASE}/itinerary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slots, constraints: dummyConstraints, preferences: {} }),
    signal
  });
  
  if (!res.ok) {
    const errData = await res.json().catch(() => null);
    throw new Error(errData?.message || errData?.error || 'Failed to generate itinerary');
  }
  
  return res.json();
};
