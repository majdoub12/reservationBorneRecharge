import React from 'react';
import './styles/StationList.css';
import {
    getStationAverageDuration,
    getStationCapacity,
    getStationChargingSpeed,
    getStationTariff
} from '../utils/stationBorne';

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
