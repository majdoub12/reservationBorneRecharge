const reservationService = require('../utils/reservationService');
const CHARGING_STATUSES = ['charging_25', 'charging_50', 'charging_75', 'completed'];

// =====================================================
// STATIONS
// =====================================================

/**
 * GET /api/reservations/stations
 * Récupère toutes les stations
 */
const getAllStations = async (req, res) => {
    try {
        const stations = await reservationService.getAllStations();
        res.status(200).json({
            success: true,
            message: 'Stations retrieved successfully',
            data: stations
        });
    } catch (error) {
        console.error('Error in getAllStations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve stations',
            error: error.message
        });
    }
};

/**
 * GET /api/reservations/stations/:stationId
 * Récupère une station par ID
 */
const getStationById = async (req, res) => {
    try {
        const { stationId } = req.params;
        const station = await reservationService.getStationById(stationId);

        if (!station) {
            return res.status(404).json({
                success: false,
                message: 'Station not found'
            });
        }

        res.status(200).json({
            success: true,
            data: station
        });
    } catch (error) {
        console.error('Error in getStationById:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve station',
            error: error.message
        });
    }
};

// =====================================================
// SLOTS (Créneaux)
// =====================================================

/**
 * GET /api/reservations/stations/:stationId/slots?date=YYYY-MM-DD
 * Récupère les créneaux disponibles pour une station à une date donnée
 */
const getSlotsByStation = async (req, res) => {
    try {
        const { stationId } = req.params;
        const { date } = req.query;

        // DEBUG
        console.log('DEBUG getSlotsByStation:', { stationId, date, params: req.params, query: req.query });

        // Valider que stationId est un UUID valide
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(stationId)) {
            return res.status(400).json({
                success: false,
                message: `Invalid stationId format. Expected UUID, got: ${stationId}`
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date query parameter is required (format: YYYY-MM-DD)'
            });
        }

        // Valider le format de la date
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        let slots = await reservationService.getSlotsByStationAndDate(stationId, date);

        res.status(200).json({
            success: true,
            message: 'Slots retrieved successfully',
            data: slots
        });
    } catch (error) {
        console.error('Error in getSlotsByStation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve slots',
            error: error.message
        });
    }
};

// =====================================================
// RESERVATIONS
// =====================================================

/**
 * POST /api/reservations/check-conflict
 * Vérifie s'il y a un conflit pour une voiture à un créneau donné
 */
const checkConflict = async (req, res) => {
    try {
        const { carId, date_reserve, heur_reserve } = req.body;

        if (!carId || !date_reserve || !heur_reserve) {
            return res.status(400).json({
                success: false,
                message: 'carId, date_reserve, and heur_reserve are required'
            });
        }

        const hasConflict = await reservationService.hasConflict(carId, date_reserve, heur_reserve);

        res.status(200).json({
            success: true,
            hasConflict,
            message: hasConflict ? 'Conflict detected' : 'No conflict'
        });
    } catch (error) {
        console.error('Error in checkConflict:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check conflict',
            error: error.message
        });
    }
};

/**
 * POST /api/reservations/create
 * Crée une nouvelle réservation
 * Body: { carId, stationId, slotId, startDateTime, durationMinutes }
 */
const createReservation = async (req, res) => {
    try {
        const { carId, stationId, date_reserve, heur_reserve } = req.body;

        if (!carId || !stationId || !date_reserve || !heur_reserve) {
            return res.status(400).json({
                success: false,
                message: 'carId, stationId, date_reserve, and heur_reserve are required'
            });
        }

        // Récupérer les infos de la station pour le tarif
        const station = await reservationService.getStationById(stationId);
        if (!station) {
            return res.status(404).json({
                success: false,
                message: 'Station not found'
            });
        }

        // Créer la réservation
        const reservation = await reservationService.createReservation(
            carId,
            stationId,
            date_reserve,
            heur_reserve,
            station.tariff
        );

        // Récupérer les infos de la voiture
        const pool = require('../config/db');
        const carResult = await pool.query('SELECT immatricul FROM vehicles WHERE id = $1', [carId]);
        const vehicleMatricule = carResult.rows[0]?.immatricul || 'Unknown';

        const startDateTime = `${date_reserve}T${heur_reserve}`;
        
        // Générer le QR Code
        const qrCode = await reservationService.generateQRCodeForReservation(
            reservation.id,
            station.name,
            vehicleMatricule,
            startDateTime
        );

        res.status(201).json({
            success: true,
            message: 'Reservation created successfully',
            data: {
                id: reservation.id,
                carId: reservation.car_id,
                stationId: reservation.station_id,
                createdAt: reservation.created_at,
                status: reservation.status,
                tariff: reservation.tariff,
                qrCode: qrCode,
                stationName: station.name,
                vehicleMatricule: vehicleMatricule,
                dateTime: startDateTime
            }
        });
    } catch (error) {
        console.error('Error in createReservation:', error);

        if (error.message.includes('CONFLICT')) {
            return res.status(409).json({
                success: false,
                message: 'Conflict: Vehicle already has an active reservation at this time',
                error: error.message
            });
        }

        if (error.message.includes('SLOT_FULL')) {
            return res.status(409).json({
                success: false,
                message: 'Conflict: No available slots',
                error: error.message
            });
        }

        if (error.message.includes('PAST_SLOT')) {
            return res.status(409).json({
                success: false,
                message: 'Conflict: Cannot create a reservation in the past',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create reservation',
            error: error.message
        });
    }
};

/**
 * GET /api/reservations/my-reservations/:carId
 * Récupère les réservations futures d'une voiture
 */
const getMyReservations = async (req, res) => {
    try {
        const { carId } = req.params;

        if (!carId) {
            return res.status(400).json({
                success: false,
                message: 'carId is required'
            });
        }

        const reservations = await reservationService.getReservationsByCarId(carId);

        res.status(200).json({
            success: true,
            message: 'Reservations retrieved successfully',
            data: reservations
        });
    } catch (error) {
        console.error('Error in getMyReservations:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve reservations',
            error: error.message
        });
    }
};

const getAllChargingSessions = async (req, res) => {
    try {
        const chargingSessions = await reservationService.getAllChargingSessions();

        res.status(200).json({
            success: true,
            message: 'Charging sessions retrieved successfully',
            data: chargingSessions
        });
    } catch (error) {
        console.error('Error in getAllChargingSessions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve charging sessions',
            error: error.message
        });
    }
};

/**
 * GET /api/reservations/invoices/:carId
 * Récupère l'historique des factures d'une voiture
 */
const getInvoicesByCarId = async (req, res) => {
    try {
        const { carId } = req.params;

        if (!carId) {
            return res.status(400).json({
                success: false,
                message: 'carId is required'
            });
        }

        const invoices = await reservationService.getInvoicesByCarId(carId);

        res.status(200).json({
            success: true,
            message: 'Invoices retrieved successfully',
            data: invoices
        });
    } catch (error) {
        console.error('Error in getInvoicesByCarId:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve invoices',
            error: error.message
        });
    }
};

/**
 * GET /api/reservations/:reservationId
 * Récupère une réservation par ID
 */
const getReservationById = async (req, res) => {
    try {
        const { reservationId } = req.params;

        const reservation = await reservationService.getReservationById(reservationId);

        if (!reservation) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found'
            });
        }

        res.status(200).json({
            success: true,
            data: reservation
        });
    } catch (error) {
        console.error('Error in getReservationById:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve reservation',
            error: error.message
        });
    }
};

/**
 * DELETE /api/reservations/:reservationId/cancel
 * Annule une réservation
 */
const cancelReservation = async (req, res) => {
    try {
        const { reservationId } = req.params;

        const reservation = await reservationService.cancelReservation(reservationId);

        res.status(200).json({
            success: true,
            message: 'Reservation cancelled successfully',
            data: reservation
        });
    } catch (error) {
        console.error('Error in cancelReservation:', error);

        if (error.message.includes('NOT_FOUND')) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found',
                error: error.message
            });
        }

        if (error.message.includes('INVALID_STATUS')) {
            return res.status(409).json({
                success: false,
                message: 'Only pending reservations can be cancelled',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to cancel reservation',
            error: error.message
        });
    }
};

/**
 * PATCH /api/reservations/:reservationId/status
 * Met à jour le statut de chargement d'une réservation
 */
const updateReservationStatus = async (req, res) => {
    try {
        const { reservationId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'status is required'
            });
        }

        if (!CHARGING_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed values: ${CHARGING_STATUSES.join(', ')}`
            });
        }

        const reservation = await reservationService.updateReservationStatus(reservationId, status);

        res.status(200).json({
            success: true,
            message: 'Reservation status updated successfully',
            data: reservation
        });
    } catch (error) {
        console.error('Error in updateReservationStatus:', error);

        if (error.message.includes('NOT_FOUND')) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found',
                error: error.message
            });
        }

        if (error.message.includes('INVALID_STATUS')) {
            return res.status(409).json({
                success: false,
                message: 'Invalid reservation status transition',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update reservation status',
            error: error.message
        });
    }
};

/**
 * PATCH /api/reservations/:reservationId/pay
 * Marque une réservation comme payée
 */
const payReservation = async (req, res) => {
    try {
        const { reservationId } = req.params;

        const reservation = await reservationService.markReservationAsPaid(reservationId);

        res.status(200).json({
            success: true,
            message: 'Reservation paid successfully',
            data: reservation
        });
    } catch (error) {
        console.error('Error in payReservation:', error);

        if (error.message.includes('NOT_FOUND')) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found',
                error: error.message
            });
        }

        if (error.message.includes('INVALID_STATUS')) {
            return res.status(409).json({
                success: false,
                message: 'Only completed reservations can be paid',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to pay reservation',
            error: error.message
        });
    }
};

/**
 * DELETE /api/reservations/:reservationId
 * Supprime une réservation (après paiement)
 */
const deleteReservation = async (req, res) => {
    try {
        const { reservationId } = req.params;

        await reservationService.deleteReservation(reservationId);

        res.status(200).json({
            success: true,
            message: 'Reservation deleted successfully'
        });
    } catch (error) {
        console.error('Error in deleteReservation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete reservation',
            error: error.message
        });
    }
};

module.exports = {
    getAllStations,
    getStationById,
    getSlotsByStation,
    checkConflict,
    createReservation,
    getMyReservations,
    getAllChargingSessions,
    getInvoicesByCarId,
    getReservationById,
    updateReservationStatus,
    payReservation,
    cancelReservation,
    deleteReservation
};
