import { Router, Request, Response } from 'express';
import { generateItinerary } from '../services/itineraryEngine.js';
import { z } from 'zod';
import { TravelSlotsSchema } from '../types/travel.js';

const router = Router();

const ItineraryRequestSchema = z.object({
  slots: TravelSlotsSchema,
  constraints: z.any(), // Add specific constraint schema later
  preferences: z.any()  // Add specific preference schema later
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedBody = ItineraryRequestSchema.parse(req.body);
    const itinerary = await generateItinerary(validatedBody.slots, validatedBody.constraints, validatedBody.preferences);
    res.json(itinerary);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation Error', details: (error as any).errors });
      return;
    }
    console.error('Itinerary generation error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

export default router;
