import { z } from 'zod';

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
  numTravelers: z.number().nullable(),
  budgetInr: z.number().nullable(),
  preferences: z.array(z.string()),
  missingSlots: z.array(z.string()),
  reasoning: z.string(),
});

export type TravelSlots = z.infer<typeof TravelSlotsSchema>;
