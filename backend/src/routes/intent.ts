import { Router, Request, Response } from 'express';
import { classifyAndExtract } from '../services/intentPipeline.js';
import { z } from 'zod';
import { sanitizeInput } from '../utils/pureLogic.js';

const router = Router();

const IntentRequestSchema = z.object({
  userMessage: z.string().min(1).max(500),
  conversationHistory: z.array(z.string().max(500)).max(20).default([])
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const validatedBody = IntentRequestSchema.parse(req.body);
    
    const sanitizedUserMessage = sanitizeInput(validatedBody.userMessage);
    const sanitizedHistory = validatedBody.conversationHistory.map(h => sanitizeInput(h));

    // Check for obvious prompt injections
    const lowerMessage = sanitizedUserMessage.toLowerCase();
    if (lowerMessage.includes('ignore previous') || lowerMessage.includes('you are now') || lowerMessage.includes('system prompt')) {
       res.status(400).json({ error: 'Invalid input detected' });
       return;
    }

    const slots = await classifyAndExtract(sanitizedUserMessage, sanitizedHistory);
    res.json(slots);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
       res.status(400).json({ error: 'Validation Error', details: (error as any).errors });
       return;
    }
    console.error('Intent extraction error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
