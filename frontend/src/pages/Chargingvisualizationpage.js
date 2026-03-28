import React, { useState } from 'react';
import './Chargingvisualizationpage.css';
import StationChargingTable from '../components/ChargingTable';

const ChargingVisualizationPage = () => {
    const [viewMode, setViewMode] = useState('table');
    const [autoRefresh, setAutoRefresh] = useState(true);

    return (
        <div className="charging-visualization-page">
            <header className="page-header">
                <h1>Charging Status Overview</h1>
                <p className="subtitle">Track charging progress for every vehicle by station.</p>
            </header>

            <div className="page-controls">
                <div className="control-group">
                    <label className="toggle-label">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(event) => setAutoRefresh(event.target.checked)}
                        />
                        Auto refresh every 5 seconds
                    </label>
                </div>

                <div className="view-mode-buttons">
                    <button
                        className={`mode-btn ${viewMode === 'table' ? 'active' : ''}`}
                        onClick={() => setViewMode('table')}
                    >
                        Table view
                    </button>
                    <button
                        className={`mode-btn ${viewMode === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setViewMode('dashboard')}
                    >
                        Dashboard view
                    </button>
                </div>
            </div>

            <div className="page-content">
                {viewMode === 'table' ? (
                    <StationChargingTable autoRefresh={autoRefresh} refreshInterval={5000} />
                ) : (
                    <div className="dashboard-view">
                        <StationChargingTable autoRefresh={autoRefresh} refreshInterval={5000} />
                    </div>
                )}
            </div>

            <div className="info-panel">
                <h3>Usage Guide</h3>
                <div className="info-grid">
                    <div className="info-item">
                        <span className="info-title">Battery</span>
                        <p>The filled bar shows the current charging percentage.</p>
                    </div>
                    <div className="info-item">
                        <span className="info-title">Vehicle</span>
                        <p>Each card shows the registration of the vehicle being charged.</p>
                    </div>
                    <div className="info-item">
                        <span className="info-title">Station</span>
                        <p>Sessions are grouped by charging station for quick scanning.</p>
                    </div>
                    <div className="info-item">
                        <span className="info-title">Time</span>
                        <p>Remaining time uses the station average duration from the backend.</p>
                    </div>
                    <div className="info-item">
                        <span className="info-title">Table</span>
                        <p>The table groups vehicles by station and charging stage.</p>
                    </div>
                    <div className="info-item">
                        <span className="info-title">75%</span>
                        <p>At 75%, the payment flow can be surfaced to the driver.</p>
                    </div>
                </div>
            </div>

            <div className="legend-panel">
                <h3>Color Legend</h3>
                <div className="legend-grid">
                    <div className="legend-item">
                        <div className="color-box" style={{ backgroundColor: '#ff6b6b' }}></div>
                        <span>0-25% (Red)</span>
                    </div>
                    <div className="legend-item">
                        <div className="color-box" style={{ backgroundColor: '#ffa500' }}></div>
                        <span>25-50% (Orange)</span>
                    </div>
                    <div className="legend-item">
                        <div className="color-box" style={{ backgroundColor: '#ffc107' }}></div>
                        <span>50-75% (Yellow)</span>
                    </div>
                    <div className="legend-item">
                        <div className="color-box" style={{ backgroundColor: '#4caf50' }}></div>
                        <span>75-100% (Green)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChargingVisualizationPage;
