import React, { useId } from 'react';
import './styles/Batteryvisualizer.css';

const BatteryVisualizer = ({ progress, vehicleMatricule, stationName, chargingTime, statusLabel }) => {
    const gradientId = useId().replace(/:/g, '');
    const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));
    const normalizedProgress = Math.round(safeProgress);
    const ringSize = 220;
    const ringStroke = 18;
    const ringRadius = (ringSize - ringStroke) / 2;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference * (1 - safeProgress / 100);
    const activeTicks = Math.max(0, Math.min(12, Math.ceil((safeProgress / 100) * 12)));

    const getBatteryColor = (value, label) => {
        if (label && /payment|required|complete/i.test(label)) return '#4caf50';
        if (value === 0) return '#6b7280';
        if (value <= 25) return '#fb7185';
        if (value <= 50) return '#f59e0b';
        if (value <= 75) return '#facc15';
        return '#4caf50';
    };

    const getProgressText = (value) => {
        if (statusLabel) {
            return statusLabel;
        }

        const texts = {
            0: 'Preparing charge',
            25: 'Charging - 25%',
            50: 'Charging - 50%',
            75: 'Charging - 75%',
            100: 'Charge complete'
        };
        return texts[Math.round(value)] || 'Charging in progress';
    };

    const estimatedTimeRemaining = (value, totalTime) => {
        const remaining = Math.max(0, Math.round(totalTime * ((100 - value) / 100)));
        return remaining;
    };

    return (
        <div className="battery-visualizer">
            <div className="vehicle-info">
                <span className="matricule">EV {vehicleMatricule}</span>
                <span className="station">{stationName}</span>
            </div>

            <div className="circular-battery-stage">
                <div className="battery-orbit">
                    <svg className="battery-ring" viewBox={`0 0 ${ringSize} ${ringSize}`} aria-hidden="true">
                        <defs>
                            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#14b8a6" />
                                <stop offset="55%" stopColor={getBatteryColor(safeProgress, statusLabel)} />
                                <stop offset="100%" stopColor="#0f766e" />
                            </linearGradient>
                        </defs>
                        <circle
                            className="battery-ring-track"
                            cx={ringSize / 2}
                            cy={ringSize / 2}
                            r={ringRadius}
                        />
                        <circle
                            className="battery-ring-progress"
                            cx={ringSize / 2}
                            cy={ringSize / 2}
                            r={ringRadius}
                            stroke={`url(#${gradientId})`}
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringOffset}
                        />
                    </svg>

                    <div className="battery-ring-ticks" aria-hidden="true">
                        {Array.from({ length: 12 }).map((_, index) => (
                            <span
                                key={index}
                                className={`battery-tick ${index < activeTicks ? 'active' : ''}`}
                            />
                        ))}
                    </div>

                    <div className="battery-ring-knob" aria-hidden="true">
                        <span className="battery-ring-knob-dot" />
                    </div>

                    <div className="battery-ring-center">
                        <span className="battery-percentage">{normalizedProgress}%</span>
                        <span className="battery-status">{getProgressText(safeProgress)}</span>
                        <span className="battery-time">~{estimatedTimeRemaining(safeProgress, chargingTime)} min left</span>
                    </div>
                </div>
            </div>

            <div className="progress-status">
                <p className="status-text">{statusLabel || getProgressText(safeProgress)}</p>
                <p className="time-remaining">Time remaining: ~{estimatedTimeRemaining(safeProgress, chargingTime)} min</p>
            </div>

            <div className="progress-steps-mini">
                {[0, 25, 50, 75, 100].map(step => (
                    <div
                        key={step}
                        className={`step-indicator ${safeProgress >= step ? 'completed' : ''}`}
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
