/**
 * Geographic Utility Functions
 * 
 * Collection of utility functions for distance calculations,
 * coordinate validation, and location-based operations.
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * This is the most accurate formula for calculating great-circle distances
 * 
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in kilometers
 * 
 * @example
 * const distance = calculateDistance(35.2975, 9.8744, 35.3010, 9.8800);
 * console.log(distance); // ~0.65 km
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth radius in kilometers
    
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    
    return distance;
};

/**
 * Calculate distance in miles instead of kilometers
 * 
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in miles
 */
export const calculateDistanceInMiles = (lat1, lng1, lat2, lng2) => {
    const kmDistance = calculateDistance(lat1, lng1, lat2, lng2);
    return kmDistance * 0.621371; // Convert km to miles
};

/**
 * Find the closest station to a given coordinate
 * 
 * @param {number} userLat - User's latitude
 * @param {number} userLng - User's longitude
 * @param {Array} stations - Array of station objects with latitude/longitude
 * @returns {Object} Object with closest station and distance
 * 
 * @example
 * const result = findClosestStation(35.2975, 9.8744, stations);
 * console.log(result);
 * // { station: { id: 1, name: 'Station A', ... }, distance: 0.65 }
 */
export const findClosestStation = (userLat, userLng, stations) => {
    if (!stations || stations.length === 0) {
        return { station: null, distance: null };
    }

    let closest = null;
    let minDistance = Infinity;

    stations.forEach(station => {
        if (station.latitude && station.longitude) {
            const distance = calculateDistance(
                userLat,
                userLng,
                station.latitude,
                station.longitude
            );

            if (distance < minDistance) {
                minDistance = distance;
                closest = station;
            }
        }
    });

    return {
        station: closest,
        distance: minDistance === Infinity ? null : minDistance
    };
};

/**
 * Find the N closest stations
 * 
 * @param {number} userLat - User's latitude
 * @param {number} userLng - User's longitude
 * @param {Array} stations - Array of station objects
 * @param {number} count - Number of closest stations to return (default: 5)
 * @returns {Array} Array of stations with distances, sorted by distance
 * 
 * @example
 * const closest5 = findNClosestStations(35.2975, 9.8744, stations, 5);
 */
export const findNClosestStations = (userLat, userLng, stations, count = 5) => {
    if (!stations || stations.length === 0) {
        return [];
    }

    const stationsWithDistance = stations
        .map(station => ({
            ...station,
            distance: station.latitude && station.longitude
                ? calculateDistance(userLat, userLng, station.latitude, station.longitude)
                : Infinity
        }))
        .filter(s => s.distance !== Infinity)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, count);

    return stationsWithDistance;
};

/**
 * Filter stations within a specified radius
 * 
 * @param {number} centerLat - Center latitude
 * @param {number} centerLng - Center longitude
 * @param {Array} stations - Array of station objects
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Array} Array of stations within radius, sorted by distance
 * 
 * @example
 * const nearby = filterStationsByRadius(35.2975, 9.8744, stations, 5);
 * // Get all stations within 5km
 */
export const filterStationsByRadius = (centerLat, centerLng, stations, radiusKm) => {
    if (!stations || stations.length === 0) {
        return [];
    }

    return stations
        .map(station => ({
            ...station,
            distance: station.latitude && station.longitude
                ? calculateDistance(centerLat, centerLng, station.latitude, station.longitude)
                : Infinity
        }))
        .filter(s => s.distance <= radiusKm && s.distance !== Infinity)
        .sort((a, b) => a.distance - b.distance);
};

/**
 * Validate if coordinates are in valid range
 * 
 * @param {number} latitude - Latitude to validate
 * @param {number} longitude - Longitude to validate
 * @returns {boolean} True if coordinates are valid
 * 
 * @example
 * if (isValidCoordinates(35.2975, 9.8744)) {
 *     console.log('Valid coordinates');
 * }
 */
export const isValidCoordinates = (latitude, longitude) => {
    return (
        typeof latitude === 'number' &&
        typeof longitude === 'number' &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
};

/**
 * Format distance for display
 * 
 * @param {number} distance - Distance in kilometers
 * @param {string} unit - 'km' or 'mi' (default: 'km')
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted distance string
 * 
 * @example
 * formatDistance(0.652, 'km', 1); // "0.7 km"
 * formatDistance(0.652, 'mi', 2); // "0.41 mi"
 */
export const formatDistance = (distance, unit = 'km', decimals = 2) => {
    if (distance === null || distance === undefined) {
        return 'N/A';
    }

    let displayDistance = distance;
    let displayUnit = unit;

    if (unit === 'mi') {
        displayDistance = distance * 0.621371;
    }

    return `${displayDistance.toFixed(decimals)} ${displayUnit}`;
};

/**
 * Get bearing (direction) from one point to another
 * Returns compass direction (N, NE, E, SE, S, SW, W, NW)
 * 
 * @param {number} lat1 - Starting latitude
 * @param {number} lng1 - Starting longitude
 * @param {number} lat2 - Destination latitude
 * @param {number} lng2 - Destination longitude
 * @returns {Object} Object with bearing in degrees and cardinal direction
 * 
 * @example
 * const direction = getBearing(35.2975, 9.8744, 35.3010, 9.8800);
 * console.log(direction); // { degrees: 45, cardinal: 'NE' }
 */
export const getBearing = (lat1, lng1, lat2, lng2) => {
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const lat1Rad = lat1 * (Math.PI / 180);
    const lat2Rad = lat2 * (Math.PI / 180);

    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x =
        Math.cos(lat1Rad) * Math.sin(lat2Rad) -
        Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

    let bearing = Math.atan2(y, x) * (180 / Math.PI);
    bearing = (bearing + 360) % 360; // Normalize to 0-360

    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(bearing / 22.5) % 16;

    return {
        degrees: bearing.toFixed(1),
        cardinal: directions[index]
    };
};

/**
 * Calculate the center point (centroid) of multiple coordinates
 * Useful for auto-centering map to all stations
 * 
 * @param {Array} coordinates - Array of [lat, lng] pairs or objects with latitude/longitude
 * @returns {Object} Center point as { latitude, longitude }
 * 
 * @example
 * const center = getCenterPoint(stations);
 * map.setView([center.latitude, center.longitude], 12);
 */
export const getCenterPoint = (coordinates) => {
    if (!coordinates || coordinates.length === 0) {
        return { latitude: 0, longitude: 0 };
    }

    let totalLat = 0;
    let totalLng = 0;

    coordinates.forEach(coord => {
        if (Array.isArray(coord)) {
            totalLat += coord[0];
            totalLng += coord[1];
        } else if (coord.latitude && coord.longitude) {
            totalLat += coord.latitude;
            totalLng += coord.longitude;
        }
    });

    return {
        latitude: totalLat / coordinates.length,
        longitude: totalLng / coordinates.length
    };
};

/**
 * Format coordinates for display
 * 
 * @param {number} latitude - Latitude value
 * @param {number} longitude - Longitude value
 * @param {number} decimals - Number of decimal places (default: 4)
 * @returns {string} Formatted coordinates
 * 
 * @example
 * formatCoordinates(35.2975, 9.8744, 4); // "35.2975, 9.8744"
 */
export const formatCoordinates = (latitude, longitude, decimals = 4) => {
    return `${latitude.toFixed(decimals)}, ${longitude.toFixed(decimals)}`;
};

/**
 * Convert degrees to radians
 */
export const toRadians = (degrees) => degrees * (Math.PI / 180);

/**
 * Convert radians to degrees
 */
export const toDegrees = (radians) => radians * (180 / Math.PI);

export default {
    calculateDistance,
    calculateDistanceInMiles,
    findClosestStation,
    findNClosestStations,
    filterStationsByRadius,
    isValidCoordinates,
    formatDistance,
    getBearing,
    getCenterPoint,
    formatCoordinates,
    toRadians,
    toDegrees
};