import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import intentRouter from './intent.js';
import itineraryRouter from './itinerary.js';
import * as intentPipeline from '../services/intentPipeline.js';
import * as itineraryEngine from '../services/itineraryEngine.js';

// Setup basic Express app for testing
const app = express();
app.use(express.json());
app.use('/api/intent', intentRouter);
app.use('/api/itinerary', itineraryRouter);

// Mock the core logic services
vi.mock('../services/intentPipeline.js', () => ({
  classifyAndExtract: vi.fn(),
}));

vi.mock('../services/itineraryEngine.js', () => ({
  generateItinerary: vi.fn(),
}));

describe('Backend Routes Integration', () => {
  describe('POST /api/intent', () => {
    it('validates missing fields', async () => {
      const response = await request(app).post('/api/intent').send({});
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
    });

    it('returns classified intent successfully', async () => {
      const mockSlots = { intent: 'plan_trip', confidence: 0.9 };
      vi.mocked(intentPipeline.classifyAndExtract).mockResolvedValueOnce(mockSlots as any);

      const response = await request(app)
        .post('/api/intent')
        .send({ userMessage: 'Plan a trip to Goa' });
        
      expect(response.status).toBe(200);
      expect(response.body.intent).toBe('plan_trip');
    });
  });

  describe('POST /api/itinerary', () => {
    it('rejects invalid slots payload', async () => {
      const response = await request(app).post('/api/itinerary').send({ destination: 'Goa' });
      expect(response.status).toBe(400);
    });

    it('returns generated itinerary successfully', async () => {
      const mockItinerary = [{ day: 1, theme: 'Beach' }];
      vi.mocked(itineraryEngine.generateItinerary).mockResolvedValueOnce(mockItinerary as any);

      const payload = {
        slots: {
          intent: 'plan_trip',
          confidence: 1,
          destination: 'Goa',
          origin: 'Delhi',
          travelDate: '2026-06-01',
          returnDate: '2026-06-05',
          numTravelers: 2,
          budgetInr: 50000,
          preferences: [],
          missingSlots: [],
          reasoning: ''
        },
        constraints: {
          budgetTotal: 50000,
          departure: '2026-06-01',
          return: '2026-06-05'
        },
        preferences: {}
      };

      const response = await request(app).post('/api/itinerary').send(payload);
      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockItinerary);
    });
  });
});
