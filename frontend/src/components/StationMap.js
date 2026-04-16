import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles/StationMap.css';
import { calculateDistance, formatDistance, getBearing } from '../utils/Geoutils';

const DEFAULT_CENTER = [35.2975, 9.8744];
const DEFAULT_ZOOM = 10;
const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const ROUTE_MODES = {
    driving: 'driving',
    walking: 'walking',
};

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
                      fill="${isSelected ? '#14b8a6' : '#475569'}"
                      stroke="${isSelected ? '#115e59' : '#334155'}"
                      stroke-width="2"/>
                <circle cx="16" cy="13" r="4" fill="white"/>
            </svg>
        `)}`,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40],
    });
};

const createOriginMarkerIcon = () => L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgiIGhlaWdodD0iMjgiIHZpZXdCb3g9IjAgMCAyOCAyOCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNCIgY3k9IjE0IiByPSIxMCIgZmlsbD0iIzAwYThmZiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIzIi8+PGNpcmNsZSBjeD0iMTQiIGN5PSIxNCIgcj0iNCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
});

const createClickIcon = () => L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiNmZmM3MDAiIHJ4PSI0Ii8+PC9zdmc+',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const toStationPoint = (station) => {
    const latitude = toNumber(station?.latitude);
    const longitude = toNumber(station?.longitude);

    if (latitude === null || longitude === null) {
        return null;
    }

    return { latitude, longitude };
};

const getValidStationPoints = (stations) => (
    Array.isArray(stations)
        ? stations.map(toStationPoint).filter(Boolean)
        : []
);

const isValidPoint = (point) => (
    point
    && Number.isFinite(point.lat)
    && Number.isFinite(point.lng)
);

const formatRouteInstruction = (step) => {
    const name = step?.name?.trim();
    const modifier = step?.maneuver?.modifier;
    const type = step?.maneuver?.type;

    const primary = (() => {
        switch (type) {
            case 'depart':
                return 'Head';
            case 'arrive':
                return 'Arrive';
            case 'turn':
                return modifier ? `Turn ${modifier}` : 'Turn';
            case 'merge':
                return modifier ? `Merge ${modifier}` : 'Merge';
            case 'new name':
                return 'Continue';
            case 'roundabout':
                return 'Enter the roundabout';
            case 'rotary':
                return 'Take the rotary';
            case 'fork':
                return modifier ? `Keep ${modifier}` : 'Keep straight';
            case 'use lane':
                return 'Use the lane';
            case 'continue':
                return 'Continue';
            case 'off ramp':
                return 'Take the ramp';
            default:
                return 'Proceed';
        }
    })();

    const distance = step?.distance ? ` (${formatDistance(step.distance / 1000, 'km', 1)})` : '';
    return `${primary}${name ? ` onto ${name}` : ''}${distance}`;
};

const StationMap = ({ stations, selectedStation, onSelectStation }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef({});
    const routeLayerRef = useRef(null);
    const routeRequestIdRef = useRef(0);
    const originMarkerRef = useRef(null);
    const clickMarkerRef = useRef(null);
    const fitBoundsOnceRef = useRef(false);

    const [userLocation, setUserLocation] = useState(null);
    const [routeOrigin, setRouteOrigin] = useState(null);
    const [originLabel, setOriginLabel] = useState('');
    const [closestStation, setClosestStation] = useState(null);
    const [closestDistance, setClosestDistance] = useState(null);
    const [routeMode, setRouteMode] = useState(ROUTE_MODES.driving);
    const [routeSummary, setRouteSummary] = useState(null);
    const [routeDirections, setRouteDirections] = useState([]);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'dark');
    const tileLayerRef = useRef(null);

    useEffect(() => {
        const handleThemeChange = (e) => {
            const newTheme = e.detail;
            setTheme(newTheme);

            if (mapInstanceRef.current && tileLayerRef.current) {
                const newUrl = newTheme === 'light' ? LIGHT_TILE_URL : DARK_TILE_URL;
                tileLayerRef.current.setUrl(newUrl);
            }
        };

        window.addEventListener('theme-changed', handleThemeChange);
        return () => window.removeEventListener('theme-changed', handleThemeChange);
    }, []);

    const clearRouteLayer = useCallback(() => {
        if (routeLayerRef.current && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(routeLayerRef.current);
            routeLayerRef.current = null;
        }

        setRouteSummary(null);
        setRouteDirections([]);
        setRouteError(null);
    }, []);

    const clearTemporaryMarkers = useCallback(() => {
        if (originMarkerRef.current && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(originMarkerRef.current);
            originMarkerRef.current = null;
        }

        if (clickMarkerRef.current && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(clickMarkerRef.current);
            clickMarkerRef.current = null;
        }
    }, []);

    const findClosestStation = useCallback((lat, lng, stationList) => {
        if (!stationList || stationList.length === 0) return null;

        let closest = null;
        let minDistance = Infinity;

        stationList.forEach((station) => {
            const point = toStationPoint(station);
            if (!point) return;

            const distance = calculateDistance(lat, lng, point.latitude, point.longitude);
            if (distance < minDistance) {
                minDistance = distance;
                closest = station;
            }
        });

        setClosestDistance(Number.isFinite(minDistance) ? minDistance.toFixed(2) : null);
        return closest;
    }, []);

    const geocodeAddress = useCallback(async (address) => {
        setSearchLoading(true);
        setSearchError(null);

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
            );

            if (!response.ok) {
                throw new Error('Geocoding service error');
            }

            const results = await response.json();

            if (!results.length) {
                setSearchError('Address not found. Please try another search.');
                return null;
            }

            const { lat, lon, display_name } = results[0];
            return {
                lat: Number(lat),
                lng: Number(lon),
                displayName: display_name,
            };
        } catch (error) {
            console.error('Geocoding error:', error);
            setSearchError('Error finding address. Please try again.');
            return null;
        } finally {
            setSearchLoading(false);
        }
    }, []);

    const updateOriginMarker = useCallback((point, label, popupLabel) => {
        if (!mapInstanceRef.current || !isValidPoint(point)) {
            return;
        }

        if (originMarkerRef.current) {
            mapInstanceRef.current.removeLayer(originMarkerRef.current);
        }

        originMarkerRef.current = L.marker([point.lat, point.lng], {
            icon: createOriginMarkerIcon(),
        })
            .bindPopup(`
                <div class="station-popup">
                    <strong>${popupLabel}</strong><br/>
                    <small>${label}</small>
                </div>
            `)
            .addTo(mapInstanceRef.current);
    }, []);

    const buildRoute = useCallback(async (origin, destination, forcedMode = routeMode) => {
        if (!mapInstanceRef.current || !isValidPoint(origin) || !destination) {
            clearRouteLayer();
            return;
        }

        const destinationPoint = toStationPoint(destination);
        if (!destinationPoint) {
            clearRouteLayer();
            return;
        }

        const requestId = ++routeRequestIdRef.current;
        setRouteLoading(true);
        setRouteError(null);

        try {
            const url = `https://router.project-osrm.org/route/v1/${forcedMode}/${origin.lng},${origin.lat};${destinationPoint.longitude},${destinationPoint.latitude}?overview=full&geometries=geojson&steps=true`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Routing service error');
            }

            const payload = await response.json();

            if (routeRequestIdRef.current !== requestId) {
                return;
            }

            const route = payload?.routes?.[0];
            if (!route?.geometry?.coordinates?.length) {
                throw new Error('No route returned');
            }

            clearRouteLayer();

            const routeCoordinates = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
            routeLayerRef.current = L.polyline(routeCoordinates, {
                color: forcedMode === ROUTE_MODES.walking ? '#475569' : '#14b8a6',
                weight: 5,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
                dashArray: forcedMode === ROUTE_MODES.walking ? '8 8' : '10 8',
            }).addTo(mapInstanceRef.current);

            const routeBounds = routeLayerRef.current.getBounds();
            if (routeBounds?.isValid?.()) {
                mapInstanceRef.current.fitBounds(routeBounds, {
                    padding: [40, 40],
                    maxZoom: 15,
                });
            }

            const bearing = getBearing(
                origin.lat,
                origin.lng,
                destinationPoint.latitude,
                destinationPoint.longitude
            );

            const steps = route.legs?.flatMap((leg) => leg.steps || []) || [];
            const directions = steps
                .map((step, index) => {
                    const instruction = formatRouteInstruction(step);
                    return {
                        id: `${requestId}-${index}`,
                        instruction,
                        distanceKm: step?.distance ? step.distance / 1000 : null,
                        durationMin: step?.duration ? step.duration / 60 : null,
                    };
                })
                .filter((step) => step.instruction);

            setRouteDirections(directions);
            setRouteSummary({
                distanceKm: route.distance / 1000,
                durationMin: route.duration / 60,
                bearing: bearing.cardinal,
                routeType: forcedMode,
            });
        } catch (error) {
            console.warn('Routing failed, using straight line fallback:', error);

            if (routeRequestIdRef.current !== requestId) {
                return;
            }

            clearRouteLayer();

            routeLayerRef.current = L.polyline(
                [
                    [origin.lat, origin.lng],
                    [destinationPoint.latitude, destinationPoint.longitude],
                ],
                {
                    color: '#14b8a6',
                    weight: 4,
                    opacity: 0.8,
                    dashArray: '8 10',
                }
            ).addTo(mapInstanceRef.current);

            const routeBounds = routeLayerRef.current.getBounds();
            if (routeBounds?.isValid?.()) {
                mapInstanceRef.current.fitBounds(routeBounds, {
                    padding: [40, 40],
                    maxZoom: 15,
                });
            }

            const straightDistance = calculateDistance(
                origin.lat,
                origin.lng,
                destinationPoint.latitude,
                destinationPoint.longitude
            );
            const bearing = getBearing(
                origin.lat,
                origin.lng,
                destinationPoint.latitude,
                destinationPoint.longitude
            );

            setRouteDirections([
                {
                    id: `${requestId}-fallback`,
                    instruction: 'No live route available. Showing a direct connection instead.',
                    distanceKm: straightDistance,
                    durationMin: null,
                },
            ]);
            setRouteSummary({
                distanceKm: straightDistance,
                durationMin: null,
                bearing: bearing.cardinal,
                routeType: 'straight-line',
            });
            setRouteError('Live routing is unavailable right now. Showing a direct route preview instead.');
        } finally {
            if (routeRequestIdRef.current === requestId) {
                setRouteLoading(false);
            }
        }
    }, [clearRouteLayer, routeMode]);

    const syncOriginAndRoute = useCallback((location, label, popupLabel, autoSelectStation = false) => {
        setUserLocation(location);
        setRouteOrigin(location);
        setOriginLabel(label);
        updateOriginMarker(location, label, popupLabel);

        const closest = findClosestStation(location.lat, location.lng, stations);
        setClosestStation(closest);

        if (autoSelectStation && closest) {
            onSelectStation(closest);
        }

        if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([location.lat, location.lng], 13);
        }
    }, [findClosestStation, onSelectStation, stations, updateOriginMarker]);

    const getUserLocation = useCallback(() => {
        if (!('geolocation' in navigator)) {
            setRouteError('Geolocation is not available in this browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                syncOriginAndRoute(
                    { lat: latitude, lng: longitude },
                    'Your current location',
                    'Your position',
                    true
                );
            },
            (error) => {
                console.log('Geolocation unavailable:', error);
                setRouteError('Unable to access your location.');
            }
        );
    }, [syncOriginAndRoute]);

    const handleSearchAddress = useCallback(async (e) => {
        e.preventDefault();

        if (!searchQuery.trim()) {
            setSearchError('Please enter an address');
            return;
        }

        const location = await geocodeAddress(searchQuery);
        if (!location) {
            return;
        }

        syncOriginAndRoute(location, location.displayName, 'Search result', false);
        setSearchQuery('');
    }, [geocodeAddress, searchQuery, syncOriginAndRoute]);

    const handleClearRoute = useCallback(() => {
        setRouteOrigin(null);
        setOriginLabel('');
        setUserLocation(null);
        setClosestStation(null);
        setClosestDistance(null);
        setRouteDirections([]);
        clearRouteLayer();
        clearTemporaryMarkers();

        if (mapInstanceRef.current) {
            mapInstanceRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
        }
    }, [clearRouteLayer, clearTemporaryMarkers]);

    const handleFitStations = useCallback(() => {
        if (!mapInstanceRef.current || !stations?.length) return;

        const validStations = getValidStationPoints(stations);

        if (!validStations.length) return;

        if (validStations.length === 1) {
            const [singleStation] = validStations;
            mapInstanceRef.current.setView([singleStation.latitude, singleStation.longitude], 13);
            return;
        }

        const bounds = L.latLngBounds(validStations.map((station) => [station.latitude, station.longitude]));
        if (bounds.isValid()) {
            mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
    }, [stations]);

    const handleMapClick = useCallback((e) => {
        if (!mapInstanceRef.current || !stations) return;

        const { lat, lng } = e.latlng;
        const clickedPoint = { lat, lng };

        if (clickMarkerRef.current) {
            mapInstanceRef.current.removeLayer(clickMarkerRef.current);
        }

        clickMarkerRef.current = L.marker([lat, lng], { icon: createClickIcon() })
            .bindPopup(`Clicked point<br/>Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`)
            .addTo(mapInstanceRef.current)
            .openPopup();

        setRouteOrigin(clickedPoint);
        setOriginLabel('Selected point on the map');

        const closest = findClosestStation(lat, lng, stations);
        if (closest) {
            setClosestStation(closest);
            onSelectStation(closest);
        }
    }, [findClosestStation, onSelectStation, stations]);

    useEffect(() => {
        if (!mapRef.current || !stations || stations.length === 0) return;

        if (!mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapRef.current, {
                zoomControl: true,
            }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

            tileLayerRef.current = L.tileLayer(theme === 'light' ? LIGHT_TILE_URL : DARK_TILE_URL, {
                attribution: '&copy; OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(mapInstanceRef.current);

            L.control.scale({ imperial: false }).addTo(mapInstanceRef.current);
        }

        stations.forEach((station) => {
            const point = toStationPoint(station);
            if (!point) {
                return;
            }

            if (!markersRef.current[station.id]) {
                const isSelected = selectedStation?.id === station.id;
                const marker = L.marker([point.latitude, point.longitude], {
                    icon: createMarkerIcon(isSelected, false),
                })
                    .bindPopup(`
                        <div class="station-popup">
                            <strong>${station.name}</strong><br/>
                            <small>${station.address || 'Address not available'}</small>
                        </div>
                    `)
                    .on('click', () => {
                        onSelectStation(station);
                    })
                    .addTo(mapInstanceRef.current);

                markersRef.current[station.id] = marker;
            } else {
                const isSelected = selectedStation?.id === station.id;
                markersRef.current[station.id].setIcon(createMarkerIcon(isSelected, false));
            }
        });

        if (routeOrigin) {
            updateOriginMarker(routeOrigin, originLabel || 'Origin', originLabel || 'Origin');
        }

        if (!fitBoundsOnceRef.current) {
            const validStations = getValidStationPoints(stations);

            if (validStations.length) {
                if (validStations.length === 1) {
                    const [singleStation] = validStations;
                    mapInstanceRef.current.setView([singleStation.latitude, singleStation.longitude], 13);
                } else {
                    const bounds = L.latLngBounds(validStations.map((station) => [station.latitude, station.longitude]));
                    if (bounds.isValid()) {
                        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
                    }
                }
                fitBoundsOnceRef.current = true;
            }
        }
    }, [stations, selectedStation, onSelectStation, routeOrigin, originLabel, updateOriginMarker]);

    useEffect(() => {
        if (!mapInstanceRef.current || !selectedStation) return;

        const point = toStationPoint(selectedStation);
        if (!point) return;

        const marker = markersRef.current[selectedStation.id];
        if (marker) {
            marker.openPopup();
        }

        mapInstanceRef.current.flyTo([point.latitude, point.longitude], 14, {
            animate: true,
            duration: 0.7,
        });
    }, [selectedStation]);

    useEffect(() => {
        if (!routeOrigin || !selectedStation) {
            clearRouteLayer();
            return;
        }

        buildRoute(routeOrigin, selectedStation);
    }, [buildRoute, clearRouteLayer, routeMode, routeOrigin, selectedStation]);

    useEffect(() => () => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!mapInstanceRef.current) return;

        mapInstanceRef.current.on('click', handleMapClick);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.off('click', handleMapClick);
            }
        };
    }, [handleMapClick]);

    const selectedBearing = useMemo(() => {
        if (!closestStation || !routeOrigin) {
            return null;
        }

        const point = toStationPoint(closestStation);
        if (!point) return null;

        return getBearing(routeOrigin.lat, routeOrigin.lng, point.latitude, point.longitude);
    }, [closestStation, routeOrigin]);

    return (
        <div className="station-map-container">
            <div className="station-map-header">
                <div>
                    <h2 className="station-map-title">Interactive Station Map</h2>
                    <p className="station-map-subtitle">
                        Search an address, use your location, or click the map to preview the best route.
                    </p>
                </div>

                <div className="map-controls">
                    <div className="route-mode-toggle" role="group" aria-label="Route mode">
                        <button
                            type="button"
                            className={`toggle-chip ${routeMode === ROUTE_MODES.driving ? 'active' : ''}`}
                            onClick={() => setRouteMode(ROUTE_MODES.driving)}
                        >
                            Driving
                        </button>
                        <button
                            type="button"
                            className={`toggle-chip ${routeMode === ROUTE_MODES.walking ? 'active' : ''}`}
                            onClick={() => setRouteMode(ROUTE_MODES.walking)}
                        >
                            Walking
                        </button>
                    </div>
                    <button
                        className="control-btn secondary-btn"
                        onClick={handleFitStations}
                        title="Show all stations"
                    >
                        Show all
                    </button>
                    <button
                        className="control-btn secondary-btn"
                        onClick={handleClearRoute}
                        title="Clear route preview"
                        disabled={!routeOrigin && !closestStation}
                    >
                        Clear
                    </button>
                    <button
                        className="control-btn locate-btn"
                        onClick={getUserLocation}
                        title="Use my current location"
                    >
                        My location
                    </button>
                </div>
            </div>

            <div className="search-section">
                <form onSubmit={handleSearchAddress} className="search-form">
                    <div className="search-input-wrapper">
                        <input
                            type="text"
                            placeholder="Enter an address... (example: Rue de Paris, Tunis)"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                if (searchError) setSearchError(null);
                            }}
                            className="search-input"
                            disabled={searchLoading}
                        />
                        <button
                            type="submit"
                            className="search-btn"
                            disabled={searchLoading}
                            title="Search address"
                        >
                            {searchLoading ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                    {searchError && (
                        <div className="search-error">
                            <span className="error-icon">!</span>
                            <span>{searchError}</span>
                        </div>
                    )}
                </form>
            </div>

            <div className="map-preview-bar">
                <div className="preview-item">
                    <span className="preview-label">Origin</span>
                    <span className="preview-value">{originLabel || 'Not set yet'}</span>
                </div>
                <div className="preview-item">
                    <span className="preview-label">Closest station</span>
                    <span className="preview-value">{closestStation?.name || 'None selected'}</span>
                </div>
                <div className="preview-item">
                    <span className="preview-label">Mode</span>
                    <span className="preview-value">{routeMode === ROUTE_MODES.driving ? 'Driving' : 'Walking'}</span>
                </div>
                <div className="preview-item">
                    <span className="preview-label">Route</span>
                    <span className="preview-value">
                        {routeLoading ? 'Calculating...' : routeSummary ? 'Ready' : 'Waiting for origin'}
                    </span>
                </div>
            </div>

            <div ref={mapRef} className="station-canvas" />

            {(userLocation || selectedStation || routeSummary) && (
                <div className="location-info">
                    {userLocation && (
                        <div className="info-item">
                            <span className="info-label">Origin coordinates</span>
                            <span className="info-value">
                                {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
                            </span>
                        </div>
                    )}

                    {closestStation && (
                        <div className="info-item">
                            <span className="info-label">Closest station</span>
                            <span className="info-value">{closestStation.name}</span>
                        </div>
                    )}

                    {closestDistance && (
                        <div className="info-item">
                            <span className="info-label">Direct distance</span>
                            <span className="info-value">{closestDistance} km</span>
                        </div>
                    )}

                    {selectedBearing && (
                        <div className="info-item">
                            <span className="info-label">Direction</span>
                            <span className="info-value">{selectedBearing.cardinal}</span>
                        </div>
                    )}

                    {routeSummary && (
                        <div className="info-item route-item">
                            <span className="info-label">Route preview</span>
                            <span className="info-value">
                                {formatDistance(routeSummary.distanceKm, 'km', 1)}
                                {routeSummary.durationMin ? ` - ${Math.round(routeSummary.durationMin)} min` : ''}
                                {routeSummary.routeType === ROUTE_MODES.driving ? ' - driving' : routeSummary.routeType === ROUTE_MODES.walking ? ' - walking' : ' - direct line'}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {routeError && (
                <div className="route-notice route-notice-warning">
                    <span className="notice-icon">!</span>
                    <span>{routeError}</span>
                </div>
            )}

            {routeDirections.length > 0 && (
                <div className="directions-panel">
                    <div className="directions-header">
                        <h3>Directions</h3>
                        <span>
                            {routeDirections.length} step{routeDirections.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    <ol className="directions-list">
                        {routeDirections.slice(0, 10).map((step) => (
                            <li key={step.id} className="direction-step">
                                <span className="direction-instruction">{step.instruction}</span>
                                <span className="direction-meta">
                                    {step.distanceKm !== null ? `${formatDistance(step.distanceKm, 'km', 1)}` : ''}
                                    {step.durationMin !== null ? `${step.distanceKm !== null ? ' - ' : ''}${Math.round(step.durationMin)} min` : ''}
                                </span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}

            {closestStation && closestDistance && (
                <div className="route-actions">
                    <button
                        className="select-station-btn"
                        onClick={() => onSelectStation(closestStation)}
                        title="Select this station"
                    >
                        Select nearest station
                    </button>
                </div>
            )}

            <div className="map-legend">
                <div className="legend-item">
                    <div className="legend-dot selected"></div>
                    <span>Selected station</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot available"></div>
                    <span>Available station</span>
                </div>
                <div className="legend-item">
                    <div className="legend-dot user-location"></div>
                    <span>Origin</span>
                </div>
                <div className="legend-item">
                    <div className="legend-line"></div>
                    <span>Best route</span>
                </div>
            </div>
        </div>
    );
};

export default StationMap;
