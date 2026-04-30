const reservationService = require('../utils/reservationService');
const CHARGING_STATUSES = ['charging_0', 'charging_25', 'charging_50', 'charging_75'];

// =====================================================
// STATIONS
// =====================================================

/**
 * GET /api/reservations/stations
 * RÃ©cupÃ¨re toutes les stations
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
 * RÃ©cupÃ¨re une station par ID
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
// SLOTS (CrÃ©neaux)
// =====================================================

/**
 * GET /api/reservations/stations/:stationId/slots?date=YYYY-MM-DD
 * RÃ©cupÃ¨re les crÃ©neaux disponibles pour une station Ã  une date donnÃ©e
 */
const getSlotsByStation = async (req, res) => {
    try {
        const { stationId } = req.params;
        const { date } = req.query;


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

/**
 * GET /api/reservations/stations/:stationId/available-bornes?date=YYYY-MM-DD&time=HH:MM:SS
 * Récupère les bornes disponibles pour une station à une date et heure données
 */
const getAvailableBornes = async (req, res) => {
    try {
        const { stationId } = req.params;
        const { date, time } = req.query;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(stationId)) {
            return res.status(400).json({
                success: false,
                message: `Invalid stationId format. Expected UUID, got: ${stationId}`
            });
        }

        if (!date || !time) {
            return res.status(400).json({
                success: false,
                message: 'Date and time query parameters are required'
            });
        }

        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Use YYYY-MM-DD'
            });
        }

        const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
        if (!timeRegex.test(time)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid time format. Use HH:MM or HH:MM:SS'
            });
        }

        const availableBornes = await reservationService.getAvailableBornesByStationAndDateTime(
            stationId,
            date,
            time
        );

        res.status(200).json({
            success: true,
            message: availableBornes.length
                ? 'Available bornes retrieved successfully'
                : 'No available borne for the selected time',
            data: availableBornes
        });
    } catch (error) {
        console.error('Error in getAvailableBornes:', error);

        if (error.code === 'OUT_OF_OPENING_HOURS' || error.message.includes('OUT_OF_OPENING_HOURS')) {
            return res.status(409).json({
                success: false,
                message: 'Selected time is outside the station opening hours',
                error: error.message,
                stationWindow: error.stationWindow || null
            });
        }

        if (error.code === 'PAST_SLOT' || error.message.includes('PAST_SLOT')) {
            return res.status(409).json({
                success: false,
                message: 'Selected time is in the past',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to retrieve available bornes',
            error: error.message
        });
    }
};

// =====================================================
// RESERVATIONS
// =====================================================

/**
 * POST /api/reservations/check-conflict
 * VÃ©rifie s'il y a un conflit pour une voiture Ã  un crÃ©neau donnÃ©
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
 * CrÃ©e une nouvelle rÃ©servation
 * Body: { carId, stationId, slotId, startDateTime, durationMinutes }
 */
const createReservation = async (req, res) => {
    try {
        const { carId, stationId, borneId, date_reserve, heur_reserve } = req.body;

        if (!carId || !stationId || !borneId || !date_reserve || !heur_reserve) {
            return res.status(400).json({
                success: false,
                message: 'carId, stationId, borneId, date_reserve, and heur_reserve are required'
            });
        }

        // RÃ©cupÃ©rer les infos de la station pour le tarif
        const station = await reservationService.getStationById(stationId);
        if (!station) {
            return res.status(404).json({
                success: false,
                message: 'Station not found'
            });
        }

        const selectedBorne = station.bornes?.find((borne) => String(borne.id_b) === String(borneId));
        if (!selectedBorne) {
            return res.status(404).json({
                success: false,
                message: 'Selected borne not found for this station'
            });
        }

        // CrÃ©er la rÃ©servation
        const reservation = await reservationService.createReservation(
            carId,
            stationId,
            borneId,
            date_reserve,
            heur_reserve
        );

        // RÃ©cupÃ©rer les infos de la voiture
        const pool = require('../config/db');
        const carResult = await pool.query('SELECT immatricul FROM vehicles WHERE id = $1', [carId]);
        const vehicleMatricule = carResult.rows[0]?.immatricul || 'Unknown';

        const startDateTime = `${date_reserve}T${heur_reserve}`;
        
        // GÃ©nÃ©rer le QR Code
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
                borneId: reservation.borne_id,
                createdAt: reservation.created_at,
                status: reservation.status,
                tariff: reservation.tariff,
                qrCode: qrCode,
                stationName: station.name,
                borne: selectedBorne,
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
                message: 'Conflict: No available borne',
                error: error.message
            });
        }

        if (error.message.includes('BORNE')) {
            return res.status(409).json({
                success: false,
                message: 'Selected borne is not available at this time',
                error: error.message
            });
        }

        if (error.code === 'OUT_OF_OPENING_HOURS' || error.message.includes('OUT_OF_OPENING_HOURS')) {
            return res.status(409).json({
                success: false,
                message: 'Selected time is outside the station opening hours',
                error: error.message
            });
        }

        if (error.code === 'PAST_SLOT' || error.message.includes('PAST_SLOT')) {
            return res.status(409).json({
                success: false,
                message: 'Selected time is in the past',
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
 * RÃ©cupÃ¨re les rÃ©servations futures d'une voiture
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
 * RÃ©cupÃ¨re l'historique des factures d'une voiture
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
 * RÃ©cupÃ¨re une rÃ©servation par ID
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
 * Annule une rÃ©servation
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

        if (error.message.includes('EXPIRED_RESERVATION')) {
            return res.status(409).json({
                success: false,
                message: 'This reservation has already started or expired and can no longer be cancelled',
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
 * Met Ã  jour le statut de chargement d'une rÃ©servation
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

        if (error.message.includes('EXPIRED_RESERVATION')) {
            return res.status(409).json({
                success: false,
                message: 'This reservation has already started or expired and can no longer be updated',
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
 * Marque une rÃ©servation comme payÃ©e
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
                message: 'Only reservations with charging_75 status can be paid',
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
 * Supprime une rÃ©servation (aprÃ¨s paiement)
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
    getAvailableBornes,
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
