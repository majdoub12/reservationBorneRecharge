export const getStationBornes = (station) =>
  Array.isArray(station?.bornes) ? station.bornes : [];

export const getPrimaryBorne = (station) => {
  const bornes = getStationBornes(station);
  return bornes[0] || station?.primaryBorne || null;
};

export const getStationTariff = (station) => {
  const borne = getPrimaryBorne(station);
  const value = borne?.tarif ?? borne?.tariff ?? station?.tarif ?? station?.tariff;
  return Number(value);
};

export const getStationChargingSpeed = (station) => {
  const borne = getPrimaryBorne(station);
  const value = borne?.charging_speed_kw ?? station?.charging_speed_kw;
  return Number(value);
};

export const getStationAverageDuration = (station) => {
  const borne = getPrimaryBorne(station);
  const value = borne?.average_duration_hours ?? station?.average_duration_hours;
  return Number(value);
};

export const getStationCapacity = (station) => {
  const bornes = getStationBornes(station);
  if (bornes.length > 0) {
    return bornes.length;
  }

  const fallback = station?.capacity ?? station?.totalSlots ?? station?.total_bornes;
  return Number(fallback);
};
