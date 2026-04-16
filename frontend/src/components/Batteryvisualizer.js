import React, { useId } from 'react';
import './styles/Batteryvisualizer.css';

const BatteryVisualizer = ({ progress, vehicleMatricule, stationName, chargingTime, statusLabel }) => {
    const gradientId = useId().replace(/:/g, '');
    const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));
    const normalizedProgress = Math.round(safeProgress);
    const ringSize = 220;
    const ringStroke = 12; // Thinner, more professional stroke
    const ringRadius = (ringSize - ringStroke) / 2;
    const ringCircumference = 2 * Math.PI * ringRadius;
    const ringOffset = ringCircumference * (1 - safeProgress / 100);
    const activeTicks = Math.max(0, Math.min(12, Math.ceil((safeProgress / 100) * 12)));

    const getBatteryColor = (value, label) => {
        if (label && /payment|required|complete/i.test(label)) return 'hsl(var(--primary))';
        if (value === 0) return 'hsl(var(--muted-foreground))';
        if (value <= 25) return 'hsl(var(--destructive))';
        if (value <= 75) return 'hsl(var(--primary))';
        return 'hsl(var(--primary))';
    };

    const getProgressText = (value) => {
        if (statusLabel) return statusLabel;
        if (value === 0) return 'Preparing charge';
        if (value >= 100) return 'Charge complete';
        return `Charging - ${Math.round(value)}%`;
    };

    const estimatedTimeRemaining = (value, totalTime) => {
        return Math.max(0, Math.round(totalTime * ((100 - value) / 100)));
    };

    return (
        <div className={`battery-visualizer status-${(statusLabel || '').toLowerCase().replace(/\s+/g, '-')}`}>
            <div className="vehicle-info">
                <div className="info-main">
                    <span className="matricule">{vehicleMatricule}</span>
                    <span className="station">{stationName}</span>
                </div>
            </div>

            <div className="circular-battery-stage">
                <div className="battery-orbit">
                    <svg className="battery-ring" viewBox={`0 0 ${ringSize} ${ringSize}`} aria-hidden="true">
                        <defs>
                            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="hsl(var(--primary) / 0.8)" />
                                <stop offset="50%" stopColor="hsl(var(--primary))" />
                                <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
                            </linearGradient>
                            <filter id="glow">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                        <circle
                            className="battery-ring-track"
                            cx={ringSize / 2}
                            cy={ringSize / 2}
                            r={ringRadius}
                            strokeWidth={ringStroke}
                        />
                        <circle
                            className="battery-ring-progress"
                            cx={ringSize / 2}
                            cy={ringSize / 2}
                            r={ringRadius}
                            strokeWidth={ringStroke}
                            stroke={`url(#${gradientId})`}
                            strokeDasharray={ringCircumference}
                            strokeDashoffset={ringOffset}
                            filter="url(#glow)"
                        />
                    </svg>

                    <div className="battery-ring-center">
                        <div className="center-content">
                            <span className="battery-percentage">{normalizedProgress}<small>%</small></span>
                            <div className="status-badge">
                                <span className="status-dot"></span>
                                <span className="battery-status">{getProgressText(safeProgress)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="progress-footer">
                <div className="footer-metric">
                    <span className="metric-label">Remaining</span>
                    <span className="metric-value">~{estimatedTimeRemaining(safeProgress, chargingTime)} min</span>
                </div>
                <div className="mini-progress-track">
                    <div className="track-fill" style={{ width: `${safeProgress}%` }}></div>
                </div>
            </div>
        </div>
    );
};

export default BatteryVisualizer;
