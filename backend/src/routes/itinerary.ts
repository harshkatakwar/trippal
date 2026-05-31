import { Router, Request, Response } from 'express';
import { generateItinerary } from '../services/itineraryEngine.js';
import { z } from 'zod';
import { TravelSlotsSchema } from '../types/travel.js';

const router = Router();

// Replaced z.any() with concrete schemas
const ConstraintsSchema = z.object({
  budgetTotal: z.number().positive(),
  departure: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid ISO date string" }),
  return: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid ISO date string" })
});

const PreferencesSchema = z.record(z.string(), z.union([z.boolean(), z.string()]));

const ItineraryRequestSchema = z.object({
  slots: TravelSlotsSchema,
  constraints: ConstraintsSchema,
  preferences: PreferencesSchema
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedBody = ItineraryRequestSchema.parse(req.body);
    const itinerary = await generateItinerary(
      validatedBody.slots, 
      validatedBody.constraints, 
      validatedBody.preferences as Record<string, string | boolean>
    );
    res.json(itinerary);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation Error', details: error.issues });
      return;
    }
    console.error('[itinerary] Unexpected error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error instanceof Error ? error.message : "Unknown error" });
  }
});

export default router;
