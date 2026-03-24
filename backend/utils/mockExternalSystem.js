// Mock external system — simulates a foreign car database
// In production, this would be replaced by a real API call

const foreignCars = [
  { matricule: 'AB-123-CD', vin: 'WBA3A5C51CF256651', country: 'France' },
  { matricule: 'B-MW-2023', vin: 'WBS3R9C50FK334565', country: 'Germany' },
  { matricule: 'AA123BB',   vin: 'WVWZZZ1KZ4M156743', country: 'Italy'   },
  { matricule: 'LO-456-ND', vin: '1HGCM82633A123456', country: 'UK'      },
  { matricule: 'M-TEST-01', vin: 'TEST00000000000001', country: 'Spain'   },
];

/**
 * Simulates querying an external central car registry.
 * Returns the car object if found, or null if not found.
 */
const queryExternalSystem = (matricule, vin) => {
  const car = foreignCars.find(
    (c) =>
      c.matricule.toUpperCase() === matricule.toUpperCase() &&
      c.vin.toUpperCase() === vin.toUpperCase()
  );
  return car || null;
};

module.exports = { queryExternalSystem };