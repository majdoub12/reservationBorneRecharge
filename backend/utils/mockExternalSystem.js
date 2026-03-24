const foreignCars = [
  { matricule: 'AB-123-CD', vin: 'WBA3A5C51CF256651', country: 'France' },
  { matricule: 'B-MW-2023', vin: 'WBS3R9C50FK334565', country: 'Germany' },
  { matricule: 'AA123BB',   vin: 'WVWZZZ1KZAM 156743', country: 'Italy' },
];

const queryExternalSystem = (matricule, vin) => {
  const car = foreignCars.find(
    (c) => c.matricule === matricule && c.vin === vin
  );
  return car || null;
};

module.exports = { queryExternalSystem };