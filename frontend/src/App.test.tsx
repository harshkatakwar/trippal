import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import * as api from './services/api';

// Mock the API calls
vi.mock('./services/api', () => ({
  classifyIntent: vi.fn(),
  generateItinerary: vi.fn(),
}));

describe('App Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the initial greeting', () => {
    render(<App />);
    expect(screen.getByText(/I'm TripPal, your AI travel buddy/i)).toBeInTheDocument();
  });

  it('handles out of scope intent gracefully', async () => {
    vi.mocked(api.classifyIntent).mockResolvedValueOnce({
      intent: 'out_of_scope',
      confidence: 1,
      destination: null,
      origin: null,
      travelDate: null,
      returnDate: null,
      numTravelers: null,
      budgetInr: null,
      preferences: [],
      missingSlots: [],
      reasoning: 'Unrelated'
    });

    render(<App />);
    const input = screen.getByPlaceholderText(/Where do you want to go\?/i);
    fireEvent.change(input, { target: { value: 'How do I fix my car?' } });
    fireEvent.submit(input);

    await waitFor(() => {
      expect(screen.getByText(/I'm sorry, I don't quite understand that/i)).toBeInTheDocument();
    });
  });

  it('asks for missing slots when planning a trip', async () => {
    vi.mocked(api.classifyIntent).mockResolvedValueOnce({
      intent: 'plan_trip',
      confidence: 0.9,
      destination: 'Goa',
      origin: null,
      travelDate: null,
      returnDate: null,
      numTravelers: null,
      budgetInr: null,
      preferences: [],
      missingSlots: ['origin', 'travelDate', 'numTravelers', 'budgetInr'],
      reasoning: 'Need more info'
    });

    render(<App />);
    const input = screen.getByPlaceholderText(/Where do you want to go\?/i);
    fireEvent.change(input, { target: { value: 'Plan a trip to Goa' } });
    fireEvent.submit(input);

    await waitFor(() => {
      expect(screen.getByText(/Almost there! 🎯 I just need a few more details:/i)).toBeInTheDocument();
      expect(screen.getByText(/Starting city/i)).toBeInTheDocument();
    });
  });
});
