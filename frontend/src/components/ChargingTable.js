import React, { useEffect, useMemo, useState } from 'react';
import './styles/Stationchargingtable.css';
import * as chargingService from '../services/Chargingservice';

const BUCKETS = [25, 50, 75, 100];

const getBucketForSession = (session) => {
    if (session.status === 'completed') {
        return 50;
    }

    const progress = Number(session.charging_progress || 0);
    if (progress >= 75) return 75;
    if (progress >= 50) return 50;
    return 25;
};

const getBucketLabel = (bucket) => `${bucket}%`;

const StationChargingTable = ({
    stationId = null,
    autoRefresh = true,
    refreshInterval = 5000,
    vehicleMatricule = null
}) => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stationName, setStationName] = useState('Charging station');

    const fetchSessions = async () => {
        try {
            setError(null);
            const data = await chargingService.getAllCharging();
            const filtered = stationId ? data.filter((session) => session.station_id === stationId) : data;
            setSessions(filtered);
            setStationName(filtered[0]?.station_name || 'Charging station');
        } catch (err) {
            setError('Unable to load charging sessions.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, [stationId]);

    useEffect(() => {
        if (!autoRefresh) {
            return undefined;
        }

        const interval = setInterval(() => {
            fetchSessions();
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, stationId]);

    const bucketedSessions = useMemo(() => {
        const grouped = {
            25: [],
            50: [],
            75: [],
            100: []
        };

        sessions.forEach((session) => {
            const bucket = getBucketForSession(session);
            if (grouped[bucket]) {
                grouped[bucket].push(session);
            }
        });

        return grouped;
    }, [sessions]);

    const visibleSessions = sessions.filter((session) => session.status !== 'paid');

    if (loading) {
        return <div className="loading-state">Loading charging station summary...</div>;
    }

    if (error) {
        return <div className="error-state">{error}</div>;
    }

    if (visibleSessions.length === 0) {
        return (
            <div className="empty-state">
                <p>
                    {stationId
                        ? 'No vehicles are being served by this station yet.'
                        : 'No vehicles are currently charging.'}
                </p>
            </div>
        );
    }

    const totalVehicles = visibleSessions.length;
    const currentVehicleCount = vehicleMatricule
        ? visibleSessions.filter((session) => session.immatricul === vehicleMatricule).length
        : 0;

    return (
        <div className="station-charging-table">
            <div className="station-summary-header">
                <div>
                    <span className="table-kicker">Station summary</span>
                    <h2>{stationName}</h2>
                </div>

                <div className="station-summary-stats">
                    <div className="summary-chip">
                        <span className="summary-label">Vehicles</span>
                        <strong>{totalVehicles}</strong>
                    </div>
                    {vehicleMatricule && (
                        <div className="summary-chip highlight">
                            <span className="summary-label">Your car</span>
                            <strong>{currentVehicleCount > 0 ? 'In progress' : 'Waiting'}</strong>
                        </div>
                    )}
                </div>
            </div>

            <div className="stage-table-wrap">
                <table className="stage-table">
                    <thead>
                        <tr>
                            {BUCKETS.map((bucket) => (
                                <th key={bucket}>{getBucketLabel(bucket)}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            {BUCKETS.map((bucket) => (
                                <td key={bucket}>
                                    <div className="bucket-list">
                                        {bucketedSessions[bucket].length > 0 ? (
                                            bucketedSessions[bucket].map((session) => (
                                                <span
                                                    key={session.id}
                                                    className={`matricule-chip ${
                                                        session.immatricul === vehicleMatricule ? 'is-self' : ''
                                                    }`}
                                                >
                                                    {session.immatricul}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="bucket-empty">—</span>
                                        )}
                                    </div>
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="table-footer">
                <div className="footer-stat">
                    <span className="stat-label">Stage 25%</span>
                    <span className="stat-value">{bucketedSessions[25].length}</span>
                </div>
                <div className="footer-stat">
                    <span className="stat-label">Stage 50%</span>
                    <span className="stat-value">{bucketedSessions[50].length}</span>
                </div>
                <div className="footer-stat">
                    <span className="stat-label">Stage 75%</span>
                    <span className="stat-value">{bucketedSessions[75].length}</span>
                </div>
                <div className="footer-stat">
                    <span className="stat-label">Stage 100%</span>
                    <span className="stat-value">{bucketedSessions[100].length}</span>
                </div>
                <button className="btn-refresh" onClick={fetchSessions}>
                    Refresh
                </button>
            </div>
        </div>
    );
};

export default StationChargingTable;
