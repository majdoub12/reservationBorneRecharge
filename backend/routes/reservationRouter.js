const express = require('express');
const router = express.Router();
const reservationController = require('../controllers/reservationController');

// =====================================================
// STATIONS ROUTES
// =====================================================

/**
 * GET /api/reservations/stations
 * Récupère toutes les stations
 */
router.get('/stations', reservationController.getAllStations);

/**
 * GET /api/reservations/stations/:stationId
 * Récupère une station par ID
 */
router.get('/stations/:stationId', reservationController.getStationById);

// =====================================================
// SLOTS ROUTES
// =====================================================

/**
 * GET /api/reservations/stations/:stationId/slots?date=YYYY-MM-DD
 * Récupère les créneaux disponibles pour une station
 */
router.get('/stations/:stationId/slots', reservationController.getSlotsByStation);

// =====================================================
// RESERVATIONS ROUTES
// =====================================================

/**
 * POST /api/reservations/check-conflict
 * Vérifie s'il y a un conflit pour une voiture
 */
router.post('/check-conflict', reservationController.checkConflict);

/**
 * POST /api/reservations/create
 * Crée une nouvelle réservation
 */
router.post('/create', reservationController.createReservation);

/**
 * GET /api/reservations/my-reservations/:carId
 * Récupère les réservations d'une voiture
 */
router.get('/my-reservations/:carId', reservationController.getMyReservations);

/**
 * GET /api/reservations/charging
 * Returns all active charging sessions
 */
router.get('/charging', reservationController.getAllChargingSessions);

/**
 * GET /api/reservations/invoices/:carId
 * Récupère les factures d'une voiture
 */
router.get('/invoices/:carId', reservationController.getInvoicesByCarId);

/**
 * GET /api/reservations/:reservationId
 * Récupère une réservation par ID
 */
router.get('/:reservationId', reservationController.getReservationById);

/**
 * PATCH /api/reservations/:reservationId/status
 * Met à jour le statut de chargement
 */
router.patch('/:reservationId/status', reservationController.updateReservationStatus);

/**
 * PATCH /api/reservations/:reservationId/pay
 * Marque une réservation comme payée
 */
router.patch('/:reservationId/pay', reservationController.payReservation);

/**
 * DELETE /api/reservations/:reservationId/cancel
 * Annule une réservation
 */
router.delete('/:reservationId/cancel', reservationController.cancelReservation);

/**
 * DELETE /api/reservations/:reservationId
 * Supprime une réservation
 */
router.delete('/:reservationId', reservationController.deleteReservation);

module.exports = router;
