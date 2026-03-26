import React, { useEffect, useRef } from 'react';
import './styles/StationMap.css';

const StationMap = ({ stations, selectedStation, onSelectStation }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !stations) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        // Clear canvas
        ctx.fillStyle = '#f5f7fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid background
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < canvas.width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }

        // Find min/max coordinates to scale
        let minLat = Math.min(...stations.map(s => s.latitude));
        let maxLat = Math.max(...stations.map(s => s.latitude));
        let minLng = Math.min(...stations.map(s => s.longitude));
        let maxLng = Math.max(...stations.map(s => s.longitude));

        const padding = 50;
        const width = canvas.width - 2 * padding;
        const height = canvas.height - 2 * padding;

        // Scale function
        const scaleX = (lng) => padding + ((lng - minLng) / (maxLng - minLng)) * width;
        const scaleY = (lat) => canvas.height - padding - ((lat - minLat) / (maxLat - minLat)) * height;

        // Draw stations
        stations.forEach(station => {
            const x = scaleX(station.longitude);
            const y = scaleY(station.latitude);

            const isSelected = selectedStation && selectedStation.id === station.id;

            // Draw circle
            ctx.fillStyle = isSelected ? '#007bff' : '#4caf50';
            ctx.beginPath();
            ctx.arc(x, y, isSelected ? 12 : 8, 0, 2 * Math.PI);
            ctx.fill();

            // Draw border
            ctx.strokeStyle = isSelected ? '#0056b3' : '#2e7d32';
            ctx.lineWidth = isSelected ? 3 : 2;
            ctx.stroke();

            // Draw label
            ctx.fillStyle = '#333';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(station.name, x, y + 18);
        });

        // Draw title
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Carte des Stations', 10, 10);

    }, [stations, selectedStation]);

    const handleCanvasClick = (e) => {
        if (!canvasRef.current || !stations) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Find min/max coordinates to scale
        let minLat = Math.min(...stations.map(s => s.latitude));
        let maxLat = Math.max(...stations.map(s => s.latitude));
        let minLng = Math.min(...stations.map(s => s.longitude));
        let maxLng = Math.max(...stations.map(s => s.longitude));

        const padding = 50;
        const width = canvas.width - 2 * padding;
        const height = canvas.height - 2 * padding;

        // Scale function
        const scaleX = (lng) => padding + ((lng - minLng) / (maxLng - minLng)) * width;
        const scaleY = (lat) => canvas.height - padding - ((lat - minLat) / (maxLat - minLat)) * height;

        // Check if click is on a station
        stations.forEach(station => {
            const x = scaleX(station.longitude);
            const y = scaleY(station.latitude);
            const distance = Math.sqrt((clickX - x) ** 2 + (clickY - y) ** 2);

            if (distance < 15) {
                onSelectStation(station);
            }
        });
    };

    return (
        <div className="station-map-container">
            <h2 className="station-map-title">Carte Interactive</h2>
            <canvas
                ref={canvasRef}
                className="station-canvas"
                onClick={handleCanvasClick}
            />
            <div className="map-legend">
                <div className="legend-item">
                    <span className="legend-dot selected"></span>
                    <span>Station sélectionnée</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot available"></span>
                    <span>Station disponible</span>
                </div>
            </div>
        </div>
    );
};

export default StationMap;