import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles/StationMap.css';

// Custom marker icons
const createMarkerIcon = (isSelected = false, isUserLocation = false) => {
    if (isUserLocation) {
        return L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSI4IiBmaWxsPSIjMDA3YmZmIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIvPjxjaXJjbGUgY3g9IjE2IiBjeT0iMTYiIHI9IjQiIGZpbGw9IiNmZmYiLz48L3N2Zz4=',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16],
        });
    }

    return L.icon({
        iconUrl: `data:image/svg+xml;base64,${btoa(`
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 0C9.4 0 4 5.4 4 12C4 20 16 40 16 40S28 20 28 12C28 5.4 22.6 0 16 0Z" 
                      fill="${isSelected ? '#007bff' : '#4caf50'}" 
                      stroke="${isSelected ? '#0056b3' : '#2e7d32'}" 
                      stroke-width="2"/>
                <circle cx="16" cy="13" r="4" fill="white"/>
            </svg>
        `)}`,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40],
    });
};

const StationMap = ({ stations, selectedStation, onSelectStation }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef({});
    const [userLocation, setUserLocation] = useState(null);
    const [closestStation, setClosestStation] = useState(null);
    const [userMarker, setUserMarker] = useState(null);
    const [closestDistance, setClosestDistance] = useState(null);

    // Calculate distance between two coordinates using Haversine formula
    const calculateDistance = (lat1, lng1, lat2, lng2) => {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLng = (lng2 - lng1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    // Find closest station to a given position
    const findClosestStation = (lat, lng, stationList) => {
        if (!stationList || stationList.length === 0) return null;

        let closest = null;
        let minDistance = Infinity;

        stationList.forEach(station => {
            const distance = calculateDistance(lat, lng, station.latitude, station.longitude);
            if (distance < minDistance) {
                minDistance = distance;
                closest = station;
            }
        });

        setClosestDistance(minDistance.toFixed(2));
        return closest;
    };

    // Get user's current location
    const getUserLocation = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ lat: latitude, lng: longitude });

                    // Find closest station
                    const closest = findClosestStation(latitude, longitude, stations);
                    setClosestStation(closest);

                    // Add user location marker
                    if (mapInstanceRef.current) {
                        // Remove old user marker if exists
                        if (userMarker) {
                            mapInstanceRef.current.removeLayer(userMarker);
                        }

                        const marker = L.marker([latitude, longitude], {
                            icon: createMarkerIcon(false, true),
                        })
                            .bindPopup('📍 Votre position')
                            .addTo(mapInstanceRef.current);

                        setUserMarker(marker);

                        // Center map on user
                        mapInstanceRef.current.setView([latitude, longitude], 13);
                    }
                },
                (error) => {
                    console.log('Géolocalisation non disponible:', error);
                }
            );
        }
    };

    // Initialize map
    useEffect(() => {
        if (!mapRef.current || !stations || stations.length === 0) return;

        // Create map instance
        if (!mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapRef.current).setView([35.2975, 9.8744], 10); // Default Tunisia view

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(mapInstanceRef.current);
        }

        // Add station markers
        stations.forEach(station => {
            if (!markersRef.current[station.id]) {
                const isSelected = selectedStation?.id === station.id;
                const marker = L.marker(
                    [station.latitude, station.longitude],
                    { icon: createMarkerIcon(isSelected, false) }
                )
                    .bindPopup(`
                        <div class="station-popup">
                            <strong>${station.name}</strong><br/>
                            <small>${station.address || 'Adresse non disponible'}</small>
                        </div>
                    `)
                    .on('click', () => {
                        onSelectStation(station);
                    })
                    .addTo(mapInstanceRef.current);

                markersRef.current[station.id] = marker;
            } else {
                // Update marker icon if selection changed
                const isSelected = selectedStation?.id === station.id;
                markersRef.current[station.id].setIcon(createMarkerIcon(isSelected, false));
            }
        });

        // Fit bounds to show all stations
        const bounds = L.latLngBounds(stations.map(s => [s.latitude, s.longitude]));
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });

    }, [stations, selectedStation, onSelectStation]);

    // Handle map click to find closest station
    const handleMapClick = (e) => {
        if (!mapInstanceRef.current || !stations) return;

        const { lat, lng } = e.latlng;

        // Add temporary marker for clicked position
        const tempMarker = L.marker([lat, lng], {
            icon: L.icon({
                iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiNmZmM3MDAiIHJ4PSI0Ii8+PC9zdmc+',
                iconSize: [20, 20],
                iconAnchor: [10, 10],
            }),
        })
            .bindPopup(`📍 Position cliquée<br/>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`)
            .addTo(mapInstanceRef.current)
            .openPopup();

        // Find closest station
        const closest = findClosestStation(lat, lng, stations);
        if (closest) {
            onSelectStation(closest);
        }

        // Remove temporary marker after 5 seconds
        setTimeout(() => {
            mapInstanceRef.current.removeLayer(tempMarker);
        }, 5000);
    };

    // Add map click listener
    useEffect(() => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.on('click', handleMapClick);

            return () => {
                mapInstanceRef.current.off('click', handleMapClick);
            };
        }
    }, [stations]);

    return (
        <div className="station-map-container">
            <div className="station-map-header">
                <h2 className="station-map-title">Carte Interactive des Stations</h2>
                <div className="map-controls">
                    <button
                        className="control-btn locate-btn"
                        onClick={getUserLocation}
                        title="Afficher ma position"
                    >
                        📍 Ma Position
                    </button>
                </div>
            </div>

            <div ref={mapRef} className="station-canvas" style={{ height: '500px', width: '100%' }} />

            {userLocation && closestStation && closestDistance && (
                <div className="location-info">
                    <div className="info-item">
                        <span className="info-label">Position actuelle:</span>
                        <span className="info-value">
                            {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                        </span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Station la plus proche:</span>
                        <span className="info-value">{closestStation.name}</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">Distance:</span>
                        <span className="info-value">{closestDistance} km</span>
                    </div>
                </div>
            )}

            <div className="map-legend">
                <div className="legend-item">
                    <div className="legend-dot selected"></div>
                    <span>Station sélectionnée</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot available"></div>
                    <span>Station disponible</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot user-location"></div>
                    <span>Ma position</span>
                </div>
            </div>
        </div>
    );
};

export default StationMap;