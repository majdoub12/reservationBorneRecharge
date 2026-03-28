import React from 'react';
import './styles/Batteryvisualizer.css';

const BatteryVisualizer = ({ progress, vehicleMatricule, stationName, chargingTime }) => {
    /**
     * Visualize charging progress as a battery
     * progress: 0, 25, 50, 75, 100
     * vehicleMatricule: ex "TN123ABC"
     * stationName: ex "Station Centre Tunis"
     * chargingTime: estimated time in minutes
     */

    const getBatteryColor = (progress) => {
        if (progress === 0) return '#ccc';
        if (progress <= 25) return '#ff6b6b'; // Red
        if (progress <= 50) return '#ffa500'; // Orange
        if (progress <= 75) return '#ffc107'; // Yellow
        return '#4caf50'; // Green
    };

    const getProgressText = (progress) => {
        const texts = {
            0: '⏳ Préparation',
            25: '🔋 25% - En cours',
            50: '⚡ 50% - Mi-chemin',
            75: '💳 75% - Bientôt prêt',
            100: '✅ 100% - Prêt!'
        };
        return texts[progress] || 'En cours de chargement...';
    };

    const estimatedTimeRemaining = (progress, totalTime) => {
        const remaining = Math.max(0, Math.round(totalTime * ((100 - progress) / 100)));
        return remaining;
    };

    return (
        <div className="battery-visualizer">
            {/* Vehicle Info */}
            <div className="vehicle-info">
                <span className="matricule">🚗 {vehicleMatricule}</span>
                <span className="station">{stationName}</span>
            </div>

            {/* Battery Visual */}
            <div className="battery-container">
                {/* Battery Body */}
                <div className="battery-body">
                    <div
                        className="battery-fill"
                        style={{
                            width: `${progress}%`,
                            backgroundColor: getBatteryColor(progress)
                        }}
                    >
                        <span className="battery-text">{progress}%</span>
                    </div>
                    <div className="battery-background"></div>
                </div>

                {/* Battery Terminal (petit rectangle à droite) */}
                <div className="battery-terminal"></div>
            </div>

            {/* Progress Status */}
            <div className="progress-status">
                <p className="status-text">{getProgressText(progress)}</p>
                <p className="time-remaining">
                    ⏱️ Temps estimé: ~{estimatedTimeRemaining(progress, chargingTime)} min
                </p>
            </div>

            {/* Progress Steps Indicators */}
            <div className="progress-steps-mini">
                {[0, 25, 50, 75, 100].map(step => (
                    <div
                        key={step}
                        className={`step-indicator ${progress >= step ? 'completed' : ''}`}
                        title={`${step}%`}
                    >
                        {step}%
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BatteryVisualizer;