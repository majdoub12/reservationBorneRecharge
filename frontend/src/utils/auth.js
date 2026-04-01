/**
 * Authentication utilities for frontend services
 */

/**
 * Returns headers including the Authorization JWT token if present in localStorage
 * @returns {Object} Headers object with Content-Type and Authorization if token exists
 */
export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

/**
 * Returns the base API URL for reservations
 * @returns {string} The base URL for reservation API calls
 */
export const getReservationApiBaseUrl = () => {
    return process.env.REACT_APP_API_URL
        ? `${process.env.REACT_APP_API_URL}/api/reservations`
        : 'http://localhost:5000/api/reservations';
};
