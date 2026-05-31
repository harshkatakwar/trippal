export async function searchPlaces(query: string, location: string, type?: string) {
  // MOCK IMPLEMENTATION since Maps API key is not yet provided.
  console.log("Mock searchPlaces called with query: " + query + ", location: " + location + ", type: " + type);
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
  console.log("Mock getDirections called from " + origin + " to " + destination + " via " + mode);
  return {
    durationText: '30 mins',
    distanceText: '10 km'
  };
}

export async function getForecast(location: string, date: string) {
  // MOCK IMPLEMENTATION
  console.log("Mock getForecast called for " + location + " on " + date);
  return {
    condition: 'Sunny',
    temperatureCelsius: 28
  };
}
