export function distanceToRadiusKm(distance: string, transportType: string): number {
  const baseDistances: Record<string, number> = {
    'less than 30 min': 10,
    'less than 1 hour': 25,
    'less than 2 hours': 50,
    'between 1 and 2 hours': 50,
    'between 2 and 3 hours': 100,
    'between 4 and 5 hours': 150,
  }

  let baseRadius = baseDistances[distance] || 50

  if (transportType === 'foot') {
    baseRadius = baseRadius * 0.15
  } else if (transportType === 'bike') {
    baseRadius = baseRadius * 0.4
  } else if (transportType === 'public_transport') {
    baseRadius = baseRadius * 0.7
  }

  return baseRadius
}
