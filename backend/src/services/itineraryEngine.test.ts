import { describe, it, expect } from 'vitest';
import { normalizeItinerary } from './itineraryEngine.js';

const makeActivity = (overrides = {}) => ({
  name: 'Test Activity',
  description: 'A test activity',
  durationMinutes: 60,
  location: 'Test City',
  placeId: 'test_place_1',
  costInr: 500,
  category: 'sightseeing',
  accessibilityNotes: 'None',
  rating: 4.0,
  ...overrides,
});

describe('normalizeItinerary', () => {
  it('normalizes a valid array of day plans', () => {
    const input = [
      {
        day: 1,
        date: '2026-06-01',
        theme: 'Beach Day',
        morning: [makeActivity({ costInr: 0 })],
        afternoon: [makeActivity({ costInr: 1500 })],
        evening: [makeActivity({ costInr: 500 })],
        accommodation: 'Hotel Seaside',
        accommodationCostInr: 3000,
        transitNotes: 'Taxi from airport',
      },
    ];

    const result = normalizeItinerary(input);

    expect(result).toHaveLength(1);
    expect(result[0].day).toBe(1);
    expect(result[0].theme).toBe('Beach Day');
    expect(result[0].estimatedCostInr).toBe(5000); // 0+1500+500+3000
    expect(result[0].transitNotes).toBe('Taxi from airport');
  });

  it('sets accommodation to "In your comfort zone" on the last day', () => {
    const input = [
      { day: 1, accommodation: 'Hotel A', morning: [], afternoon: [], evening: [] },
      { day: 2, accommodation: 'Hotel B', morning: [], afternoon: [], evening: [] },
    ];
    const result = normalizeItinerary(input);
    expect(result[0].accommodation).toBe('Hotel A');
    expect(result[1].accommodation).toBe('In your comfort zone');
  });

  it('falls back to defaults for missing fields', () => {
    const result = normalizeItinerary([{}]);
    expect(result[0].day).toBe(1);
    expect(result[0].theme).toBe('Exploration');
    expect(result[0].accommodation).toBe('In your comfort zone'); // last day
    expect(result[0].morning).toEqual([]);
    expect(result[0].estimatedCostInr).toBe(0);
    expect(result[0].transitNotes).toBe('');
  });

  it('handles an object with itinerary key', () => {
    const input = {
      itinerary: [
        { day: 1, morning: [], afternoon: [], evening: [], accommodation: 'Hotel X' },
      ],
    };
    const result = normalizeItinerary(input);
    expect(result).toHaveLength(1);
    expect(result[0].day).toBe(1);
  });

  it('handles an object with days key', () => {
    const input = {
      days: [
        { day: 1, morning: [], afternoon: [], evening: [] },
      ],
    };
    const result = normalizeItinerary(input);
    expect(result).toHaveLength(1);
  });

  it('handles snake_case transitNotes', () => {
    const input = [{ morning: [], afternoon: [], evening: [], transit_notes: 'Drive 2hrs' }];
    const result = normalizeItinerary(input);
    expect(result[0].transitNotes).toBe('Drive 2hrs');
  });

  it('calculates estimatedCostInr as sum of all activity costs plus accommodation', () => {
    const input = [
      {
        morning: [makeActivity({ costInr: 200 }), makeActivity({ costInr: 300 })],
        afternoon: [makeActivity({ costInr: 1000 })],
        evening: [makeActivity({ costInr: 500 })],
        accommodationCostInr: 2000,
      },
    ];
    const result = normalizeItinerary(input);
    expect(result[0].estimatedCostInr).toBe(4000);
  });

  it('handles missing accommodationCostInr as 0', () => {
    const input = [{ morning: [makeActivity({ costInr: 100 })], afternoon: [], evening: [] }];
    const result = normalizeItinerary(input);
    expect(result[0].accommodationCostInr).toBe(0);
    expect(result[0].estimatedCostInr).toBe(100);
  });
});
