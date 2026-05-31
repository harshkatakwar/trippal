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

  it('shows a redirect message for find_flights intent', async () => {
    vi.mocked(api.classifyIntent).mockResolvedValueOnce({
      intent: 'find_flights',
      confidence: 0.95,
      destination: 'Mumbai',
      origin: 'Delhi',
      travelDate: '2026-08-01',
      returnDate: null,
      numTravelers: 1,
      budgetInr: null,
      preferences: [],
      missingSlots: [],
      reasoning: 'User wants flights only'
    });

    render(<App />);
    const input = screen.getByPlaceholderText(/Where do you want to go\?/i);
    fireEvent.change(input, { target: { value: 'Find me flights to Mumbai' } });
    fireEvent.submit(input);

    await waitFor(() => {
      expect(screen.getByText(/find flights/i)).toBeInTheDocument();
    });
  });

  it('renders itinerary after successful generation', async () => {
    const mockSlots = {
      intent: 'plan_trip' as const,
      confidence: 1,
      destination: 'Goa',
      origin: 'Delhi',
      travelDate: '2026-06-01',
      returnDate: '2026-06-04',
      numTravelers: 2,
      budgetInr: 50000,
      preferences: ['beach'],
      missingSlots: [],
      reasoning: 'All slots filled'
    };

    const mockItinerary = [
      {
        day: 1,
        date: '2026-06-01',
        theme: 'Arrival & Beach',
        morning: [{
          name: 'Calangute Beach',
          description: 'Sandy beach',
          durationMinutes: 120,
          location: 'North Goa',
          placeId: 'place_1',
          costInr: 0,
          category: 'beach',
          accessibilityNotes: 'Sandy terrain',
          rating: 4.3
        }],
        afternoon: [],
        evening: [],
        accommodation: 'Hotel Goa',
        accommodationCostInr: 3000,
        estimatedCostInr: 3000,
        transitNotes: 'Taxi from airport'
      }
    ];

    vi.mocked(api.classifyIntent).mockResolvedValueOnce(mockSlots);
    vi.mocked(api.generateItinerary).mockResolvedValueOnce(mockItinerary);

    render(<App />);
    const input = screen.getByPlaceholderText(/Where do you want to go\?/i);
    fireEvent.change(input, { target: { value: 'Plan a 3 day trip to Goa from Delhi, 2 people, budget 50000' } });
    fireEvent.submit(input);

    await waitFor(() => {
      expect(screen.getByText(/Your itinerary is ready/i)).toBeInTheDocument();
    });

    expect(screen.getByText('Calangute Beach')).toBeInTheDocument();
    expect(screen.getByText('Arrival & Beach')).toBeInTheDocument();
  });

  it('does not send message when input is empty', () => {
    render(<App />);
    const input = screen.getByPlaceholderText(/Where do you want to go\?/i);
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input);
    expect(api.classifyIntent).not.toHaveBeenCalled();
  });
});
