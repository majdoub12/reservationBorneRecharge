import React from 'react';
import './styles/StationList.css';

const StationList = ({ stations, selectedStation, onSelectStation }) => {
    return (
        <div className="station-list-container">
            <h2 className="station-list-title">Available stations</h2>
            <div className="station-list">
                {stations && stations.length > 0 ? (
                    stations.map((station) => (
                        <button
                            key={station.id}
                            type="button"
                            className={`station-item ${selectedStation?.id === station.id ? 'active' : ''}`}
                            onClick={() => onSelectStation(station)}
                        >
                            <div className="station-item-header">
                                <h3 className="station-name">{station.name}</h3>
                                {selectedStation?.id === station.id && (
                                    <span className="check-icon">Selected</span>
                                )}
                            </div>

                            <div className="station-info">
                                <div className="info-row">
                                    <span className="info-label">Speed</span>
                                    <span className="info-value">{station.charging_speed_kw} kW</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Average time</span>
                                    <span className="info-value">{station.average_duration_hours} h</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Tariff</span>
                                    <span className="info-value">{Number(station.tariff).toFixed(2)} TND</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Capacity</span>
                                    <span className="info-value">{station.capacity} spaces</span>
                                </div>
                            </div>

                            <div className="station-location">
                                <span className="location-icon">Location</span>
                                <span className="coordinates">
                                    {Number(station.latitude).toFixed(4)}, {Number(station.longitude).toFixed(4)}
                                </span>
                            </div>
                        </button>
                    ))
                ) : (
                    <div className="no-stations">
                        <p>No stations available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StationList;
