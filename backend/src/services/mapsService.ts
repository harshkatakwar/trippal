export async function searchPlaces(query: string, location: string, type?: string) {
  // MOCK IMPLEMENTATION since Maps API key is not yet provided.
  return [
    {
      name: "Mock " + query,
      rating: 4.5,
      address: "123 Main St, " + location,
      placeId: "mock_place_" + Date.now()
    }
  ];
}

export async function getDirections(origin: string, destination: string, mode: string) {
  // MOCK IMPLEMENTATION
  return {
    durationText: '30 mins',
    distanceText: '10 km'
  };
}

export async function getForecast(location: string, date: string) {
  // MOCK IMPLEMENTATION
  return {
    condition: 'Sunny',
    temperatureCelsius: 28
  };
}
