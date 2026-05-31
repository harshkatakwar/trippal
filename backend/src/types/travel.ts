import { z } from 'zod';

const flexibleNumber = z.preprocess(
  (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
       const parsed = parseFloat(val.replace(/[^0-9.]/g, ''));
       return isNaN(parsed) ? null : parsed;
    }
    return null;
  },
  z.number().nullable()
);

export const TravelSlotsSchema = z.object({
  intent: z.enum([
    'plan_trip',
    'find_flights',
    'find_hotels',
    'modify_trip',
    'cancel_booking',
    'get_itinerary',
    'out_of_scope'
  ]),
  confidence: z.number(),
  destination: z.string().nullable(),
  origin: z.string().nullable(),
  travelDate: z.string().nullable(), // ISO string
  returnDate: z.string().nullable(), // ISO string
  numTravelers: flexibleNumber,
  budgetInr: flexibleNumber,
  preferences: z.array(z.string()),
  missingSlots: z.array(z.string()),
  reasoning: z.string(),
});

export type TravelSlots = z.infer<typeof TravelSlotsSchema>;

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
  accommodationCostInr: number;
  estimatedCostInr: number;
  transitNotes: string;
}
