/**
 * Service API Frontend pour les réservations
 * Contient uniquement les appels HTTP au backend
 */

const API_BASE_URL = 'http://localhost:5000/api/reservations';

/**
 * Récupère toutes les stations
 */
export const getStations = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/stations`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching stations:', error);
        throw error;
    }
};

/**
 * Récupère une station par ID
 */
export const getStationById = async (stationId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/stations/${stationId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching station:', error);
        throw error;
    }
};

/**
 * Récupère les créneaux disponibles pour une station à une date donnée
 */
export const getSlotsByStation = async (stationId, date) => {
    try {
        const formattedDate = date.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
        const response = await fetch(
            `${API_BASE_URL}/stations/${stationId}/slots?date=${formattedDate}`
        );
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching slots:', error);
        throw error;
    }
};

/**
 * Vérifie s'il y a un conflit pour une voiture à un créneau donné
 */
export const checkConflict = async (carId, date_reserve, heur_reserve) => {
    try {
        const response = await fetch(`${API_BASE_URL}/check-conflict`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                carId,
                date_reserve,
                heur_reserve
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.hasConflict;
    } catch (error) {
        console.error('Error checking conflict:', error);
        throw error;
    }
};

/**
 * Crée une nouvelle réservation
 */
export const createReservation = async (carId, stationId, date_reserve, heur_reserve) => {
    try {
        const response = await fetch(`${API_BASE_URL}/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                carId,
                stationId,
                date_reserve,
                heur_reserve
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create reservation');
        }

        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error creating reservation:', error);
        throw error;
    }
};

/**
 * Récupère les réservations d'une voiture
 */
export const getMyReservations = async (carId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/my-reservations/${carId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching reservations:', error);
        throw error;
    }
};

/**
 * Récupère une réservation par ID
 */
export const getReservationById = async (reservationId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/${reservationId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching reservation:', error);
        throw error;
    }
};

/**
 * Annule une réservation
 */
export const cancelReservation = async (reservationId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/${reservationId}/cancel`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        throw error;
    }
};

/**
 * Supprime une réservation
 */
export const deleteReservation = async (reservationId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/${reservationId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error deleting reservation:', error);
        throw error;
    }
};