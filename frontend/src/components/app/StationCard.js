import React from "react";
import "../styles/StationList.css";
import {
  getStationAverageDuration,
  getStationCapacity,
  getStationChargingSpeed,
  getStationTariff,
} from "../../utils/stationBorne";

const formatNumber = (value, fallback = "-") => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const StationCard = ({ station, selectedStation, isSelected, onClick }) => {
  const active = Boolean(isSelected || selectedStation?.id === station?.id);

  return (
    <button type="button" className={`station-item ${active ? "active" : ""}`} onClick={onClick}>
      <div className="station-item-header">
        <h3 className="station-name">{station.name}</h3>
        {active && <span className="check-icon">Selected</span>}
      </div>

      <div className="station-info">
        <div className="info-row">
          <span className="info-label">Speed</span>
          <span className="info-value">{formatNumber(getStationChargingSpeed(station))} kW</span>
        </div>
        <div className="info-row">
          <span className="info-label">Average time</span>
          <span className="info-value">{formatNumber(getStationAverageDuration(station))} h</span>
        </div>
        <div className="info-row">
          <span className="info-label">Tariff</span>
          <span className="info-value">{formatNumber(getStationTariff(station), 0).toFixed(2)} TND</span>
        </div>
        <div className="info-row">
          <span className="info-label">Capacity</span>
          <span className="info-value">
            {formatNumber(getStationCapacity(station), 0)} places
          </span>
        </div>
      </div>

      <div className="station-location">
        <span className="location-icon">PIN</span>
        <span className="coordinates">
          {formatNumber(station.latitude).toFixed(4)}, {formatNumber(station.longitude).toFixed(4)}
        </span>
      </div>
    </button>
  );
};

export default StationCard;
