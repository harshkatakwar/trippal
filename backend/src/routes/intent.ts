import { Router, Request, Response } from 'express';
import { classifyAndExtract } from '../services/intentPipeline.js';
import { z } from 'zod';

const router = Router();

const IntentRequestSchema = z.object({
  userMessage: z.string().min(1).max(500),
  conversationHistory: z.array(z.string().max(500)).max(20).default([])
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedBody = IntentRequestSchema.parse(req.body);
    
    // Check for obvious prompt injections
    const lowerMessage = validatedBody.userMessage.toLowerCase();
    if (lowerMessage.includes('ignore previous') || lowerMessage.includes('you are now')) {
       res.status(400).json({ error: 'Invalid input detected' });
       return;
    }

    const slots = await classifyAndExtract(validatedBody.userMessage, validatedBody.conversationHistory);
    res.json(slots);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
       res.status(400).json({ error: 'Validation Error', details: (error as any).errors });
       return;
    }
    console.error('Intent extraction error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
