import React, { useEffect, useState } from 'react';
import './styles/Stationchargingtable.css';
import BatteryVisualizer from './Batteryvisualizer';
import * as chargingService from '../services/Chargingservice';

const StationChargingTable = ({ stationId = null, autoRefresh = true, refreshInterval = 5000 }) => {
    const [chargings, setChargings] = useState({});
    const [stations, setStations] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedStations, setExpandedStations] = useState({});

    useEffect(() => {
        fetchAllChargings();
    }, []);

    useEffect(() => {
        if (!autoRefresh) {
            return undefined;
        }

        const interval = setInterval(() => {
            fetchAllChargings();
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval]);

    const fetchAllChargings = async () => {
        try {
            setError(null);
            const data = await chargingService.getAllCharging();
            const grouped = {};
            const stationMap = {};

            data.forEach((charging) => {
                if (!grouped[charging.station_id]) {
                    grouped[charging.station_id] = [];
                    stationMap[charging.station_id] = charging.station_name || `Station ${charging.station_id}`;
                }

                grouped[charging.station_id].push(charging);
            });

            setChargings(grouped);
            setStations(stationMap);
        } catch (err) {
            setError('Unable to load charging sessions.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleStationExpand = (nextStationId) => {
        setExpandedStations((prev) => ({
            ...prev,
            [nextStationId]: !prev[nextStationId]
        }));
    };

    const getVehiclesCount = (nextStationId) => chargings[nextStationId]?.length || 0;

    const getAverageProgress = (nextStationId) => {
        const vehicles = chargings[nextStationId] || [];

        if (vehicles.length === 0) {
            return 0;
        }

        const total = vehicles.reduce((sum, vehicle) => sum + Number(vehicle.charging_progress || 0), 0);
        return Math.round(total / vehicles.length);
    };

    const getProgressDistribution = (nextStationId) => {
        const vehicles = chargings[nextStationId] || [];

        return {
            25: vehicles.filter((vehicle) => vehicle.charging_progress === 25).length,
            50: vehicles.filter((vehicle) => vehicle.charging_progress === 50).length,
            75: vehicles.filter((vehicle) => vehicle.charging_progress === 75).length,
            100: vehicles.filter((vehicle) => vehicle.charging_progress === 100).length
        };
    };

    if (loading) {
        return <div className="loading-state">Loading charging stations...</div>;
    }

    if (error) {
        return <div className="error-state">{error}</div>;
    }

    const stationIds = stationId
        ? Object.keys(chargings).filter((id) => id === stationId)
        : Object.keys(chargings);

    if (stationIds.length === 0) {
        return (
            <div className="empty-state">
                <p>No vehicles are currently charging.</p>
            </div>
        );
    }

    return (
        <div className="station-charging-table">
            <h2>Vehicles Charging by Station</h2>

            <div className="stations-container">
                {stationIds.map((nextStationId) => {
                    const isExpanded = expandedStations[nextStationId];
                    const vehicles = chargings[nextStationId] || [];
                    const distribution = getProgressDistribution(nextStationId);
                    const avgProgress = getAverageProgress(nextStationId);

                    return (
                        <div key={nextStationId} className="station-section">
                            <div
                                className="station-header"
                                onClick={() => toggleStationExpand(nextStationId)}
                            >
                                <div className="header-left">
                                    <h3>{stations[nextStationId]}</h3>
                                    <span className="vehicle-count">
                                        {getVehiclesCount(nextStationId)} vehicle(s)
                                    </span>
                                </div>

                                <div className="header-right">
                                    <div className="avg-progress">
                                        <span className="progress-label">Average:</span>
                                        <span className="progress-value">{avgProgress}%</span>
                                    </div>
                                    <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
                                        v
                                    </span>
                                </div>
                            </div>

                            <div className="progress-distribution">
                                <div className="distribution-item">
                                    <span className="dist-label">25%:</span>
                                    <span className="dist-count">{distribution[25]}</span>
                                </div>
                                <div className="distribution-item">
                                    <span className="dist-label">50%:</span>
                                    <span className="dist-count">{distribution[50]}</span>
                                </div>
                                <div className="distribution-item">
                                    <span className="dist-label">75%:</span>
                                    <span className="dist-count">{distribution[75]}</span>
                                </div>
                                <div className="distribution-item">
                                    <span className="dist-label">100%:</span>
                                    <span className="dist-count">{distribution[100]}</span>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="station-vehicles">
                                    <div className="vehicles-grid">
                                        {vehicles.map((vehicle) => (
                                            <BatteryVisualizer
                                                key={vehicle.id}
                                                progress={vehicle.charging_progress}
                                                vehicleMatricule={vehicle.immatricul}
                                                stationName={stations[nextStationId]}
                                                chargingTime={vehicle.charging_time_minutes}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="table-footer">
                <div className="footer-stat">
                    <span className="stat-label">Active stations:</span>
                    <span className="stat-value">{stationIds.length}</span>
                </div>
                <div className="footer-stat">
                    <span className="stat-label">Total vehicles:</span>
                    <span className="stat-value">
                        {stationIds.reduce((sum, nextStationId) => sum + (chargings[nextStationId]?.length || 0), 0)}
                    </span>
                </div>
                <button className="btn-refresh" onClick={fetchAllChargings}>
                    Refresh
                </button>
            </div>
        </div>
    );
};

export default StationChargingTable;
