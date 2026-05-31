import type { TravelSlots, DayPlan } from '../types/travel';
import { API_BASE, DEFAULT_BUDGET } from '../utils/constants';

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
    throw new Error('Failed to classify intent');
  }
  
  return res.json();
};

export const generateItinerary = async (
  slots: TravelSlots,
  signal?: AbortSignal
): Promise<DayPlan[]> => {
  // Pass some dummy constraints for now until we build the constraint UI
  const dummyConstraints = {
    budgetTotal: slots.budgetInr || DEFAULT_BUDGET,
    departure: slots.travelDate || new Date().toISOString(),
    return: slots.returnDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  };
  
  const res = await fetch(`${API_BASE}/itinerary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slots, constraints: dummyConstraints, preferences: {} }),
    signal
  });
  
  if (!res.ok) {
    throw new Error('Failed to generate itinerary');
  }
  
  return res.json();
};
