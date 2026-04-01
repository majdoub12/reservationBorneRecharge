/**
 * Service API Frontend pour les réservations
 * Contient uniquement les appels HTTP au backend
 */

import { getAuthHeaders, getReservationApiBaseUrl } from '../utils/auth';

const API_BASE_URL = getReservationApiBaseUrl();

const formatDateForApi = (date) => {
    if (typeof date === 'string') {
        return date;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

/**
 * Récupère toutes les stations
 */
export const getStations = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/stations`, {
            headers: getAuthHeaders(),
        });
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
        const response = await fetch(`${API_BASE_URL}/stations/${stationId}`, {
            headers: getAuthHeaders(),
        });
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
        const formattedDate = formatDateForApi(date);
        const response = await fetch(
            `${API_BASE_URL}/stations/${stationId}/slots?date=${formattedDate}`,
            { headers: getAuthHeaders() }
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
            headers: getAuthHeaders(),
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
            headers: getAuthHeaders(),
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
        const response = await fetch(`${API_BASE_URL}/my-reservations/${carId}`, {
            headers: getAuthHeaders(),
        });
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
        const response = await fetch(`${API_BASE_URL}/${reservationId}`, {
            headers: getAuthHeaders(),
        });
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
            method: 'DELETE',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
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
            method: 'DELETE',
            headers: getAuthHeaders(),
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

/**
 * Récupère les factures d'une voiture
 */
export const getInvoicesByCarId = async (carId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/invoices/${carId}`, {
            headers: getAuthHeaders(),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching invoices:', error);
        throw error;
    }
};

/**
 * Marque une réservation comme payée
 */
export const payReservation = async (reservationId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/${reservationId}/pay`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error paying reservation:', error);
        throw error;
    }
};

/**
 * Met à jour le statut d'une réservation
 */
export const updateReservationStatus = async (reservationId, status) => {
    try {
        const response = await fetch(`${API_BASE_URL}/${reservationId}/status`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error updating reservation status:', error);
        throw error;
    }
};
