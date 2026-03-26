import React from 'react';
import './styles/StationList.css';

const StationList = ({ stations, selectedStation, onSelectStation }) => {
    return (
        <div className="station-list-container">
            <h2 className="station-list-title">Stations Disponibles</h2>
            <div className="station-list">
                {stations && stations.length > 0 ? (
                    stations.map(station => (
                        <div
                            key={station.id}
                            className={`station-item ${selectedStation?.id === station.id ? 'active' : ''}`}
                            onClick={() => onSelectStation(station)}
                        >
                            <div className="station-item-header">
                                <h3 className="station-name">{station.name}</h3>
                                {selectedStation?.id === station.id && (
                                    <span className="check-icon">✓</span>
                                )}
                            </div>

                            <div className="station-info">
                                <div className="info-row">
                                    <span className="info-label">Rapidité:</span>
                                    <span className="info-value">{station.charging_speed_kw} kW</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Durée moyenne:</span>
                                    <span className="info-value">{station.average_duration_hours}h</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Tarif:</span>
                                    <span className="info-value">{Number(station.tariff).toFixed(2)} TND</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Capacité:</span>
                                    <span className="info-value">{station.capacity} places</span>
                                </div>
                            </div>

                            <div className="station-location">
                                <span className="location-icon">📍</span>
                                <span className="coordinates">
                                    {Number(station.latitude).toFixed(4)}, {Number(station.longitude).toFixed(4)}
                                </span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-stations">
                        <p>Aucune station disponible</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StationList;