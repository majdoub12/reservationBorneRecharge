const pool = require('../config/db');
const QRCode = require('qrcode');

const ACTIVE_STATUSES = ['pending', 'charging_25', 'charging_50', 'charging_75', 'completed'];
const CHARGING_OVERVIEW_STATUSES = ['pending', 'charging_25', 'charging_50', 'charging_75', 'completed'];
const STATUS_TRANSITIONS = {
    pending: ['charging_25'],
    charging_25: ['charging_50'],
    charging_50: ['charging_75'],
    charging_75: ['completed', 'paid'],
    completed: ['paid'],
};

const STATUS_TO_PROGRESS = {
    pending: 0,
    charging_25: 25,
    charging_50: 50,
    charging_75: 75,
    completed: 75,
    paid: 100
};

const ACTIVE_RESERVATION_STATUSES = ['pending', 'charging_25', 'charging_50', 'charging_75', 'completed'];
const EXPIRED_PENDING_STATUS = 'missed';
const KNOWN_STATION_COORDINATE_FIXES = {
    marsa: {
        latitude: 36.87818,
        longitude: 10.32466,
    },
};

const normalizeStationCoordinates = (station) => {
    if (!station) {
        return station;
    }

    const stationName = typeof station.name === 'string' ? station.name.toLowerCase() : '';
    const matchedFix = Object.entries(KNOWN_STATION_COORDINATE_FIXES).find(([key]) =>
        stationName.includes(key)
    );

    if (!matchedFix) {
        return station;
    }

    const [, fixedCoordinates] = matchedFix;
    return {
        ...station,
        latitude: fixedCoordinates.latitude,
        longitude: fixedCoordinates.longitude,
    };
};

const parseReservationDateTime = (date_reserve, heur_reserve) => {
    const timeValue =
        typeof heur_reserve === 'string'
            ? heur_reserve.substring(0, 8)
            : heur_reserve.toString().substring(0, 8);

    return new Date(`${date_reserve}T${timeValue}`);
};

const isReservationInPast = (date_reserve, heur_reserve) => {
    const reservationDateTime = parseReservationDateTime(date_reserve, heur_reserve);
    return Number.isNaN(reservationDateTime.getTime()) || reservationDateTime < new Date();
};

const cleanupExpiredPendingReservations = async () => {
    try {
        const result = await pool.query(
            `UPDATE reservations
             SET charging_status = $1
             WHERE charging_status = 'pending'
               AND to_timestamp(
                    date_reserve::text || ' ' || heur_reserve::text,
                    'YYYY-MM-DD HH24:MI:SS'
               ) < NOW()
             RETURNING id`,
            [EXPIRED_PENDING_STATUS]
        );

        return result.rowCount;
    } catch (error) {
        console.error('Error cleaning up expired reservations:', error);
        throw error;
    }
};

const finalizeExpiredPendingRows = async (rows) => {
    const now = new Date();
    const expiredIds = rows
        .filter((row) => row.charging_status === 'pending')
        .filter((row) => parseReservationDateTime(row.date_reserve, row.heur_reserve) < now)
        .map((row) => row.id);

    if (expiredIds.length > 0) {
        await pool.query(
            `UPDATE reservations
             SET charging_status = $1
             WHERE id = ANY($2::uuid[])`,
            [EXPIRED_PENDING_STATUS, expiredIds]
        );
    }

    return rows.filter((row) => !expiredIds.includes(row.id));
};

const fetchReservationsByCarIdentifier = async (carIdentifier) => {
    const result = await pool.query(
        `SELECT r.id, r.car_id, r.station_id, r.date_reserve, r.heur_reserve, r.created_at, r.charging_status AS status,
                CASE r.charging_status
                    WHEN 'pending' THEN 0
                    WHEN 'charging_25' THEN 25
                    WHEN 'charging_50' THEN 50
                    WHEN 'charging_75' THEN 75
                    WHEN 'completed' THEN 75
                    WHEN 'paid' THEN 100
                    ELSE 0
                END AS charging_progress,
                r.tariff, r.qr_code,
                st.name as station_name, st.latitude, st.longitude
         FROM reservations r
         INNER JOIN stations st ON r.station_id = st.id
         LEFT JOIN vehicles v ON r.car_id = v.id
         WHERE (r.car_id::text = $1
            OR v.immatricul = $1)
         AND r.charging_status = ANY($2)
         ORDER BY r.date_reserve DESC, r.heur_reserve DESC`,
        [carIdentifier, ACTIVE_STATUSES]
    );

    return {
        ...result,
        rows: result.rows.map(normalizeStationCoordinates),
    };
};

const fetchInvoicesByCarIdentifier = async (carIdentifier) => {
    return pool.query(
        `SELECT i.id, i.reservation_id, i.amount, i.paid_at,
                r.car_id, r.station_id, r.date_reserve, r.heur_reserve, r.charging_status AS status,
                st.name AS station_name
         FROM invoices i
         INNER JOIN reservations r ON i.reservation_id = r.id
         INNER JOIN stations st ON r.station_id = st.id
         LEFT JOIN vehicles v ON r.car_id = v.id
         WHERE (r.car_id::text = $1
            OR v.immatricul = $1)
         ORDER BY i.paid_at DESC NULLS LAST, r.date_reserve DESC, r.heur_reserve DESC`,
        [carIdentifier]
    );
};

// =====================================================
// STATIONS
// =====================================================

/**
 * Récupère toutes les stations
 */
const getAllStations = async () => {
    try {
        const result = await pool.query(
            'SELECT id, name, latitude, longitude, charging_speed_kw, average_duration_hours, tariff, capacity FROM stations ORDER BY name'
        );
        return result.rows.map(normalizeStationCoordinates);
    } catch (error) {
        console.error('Error fetching stations:', error);
        throw error;
    }
};

/**
 * Récupère une station par ID
 */
const getStationById = async (stationId) => {
    try {
        const result = await pool.query(
            'SELECT * FROM stations WHERE id = $1::uuid',
            [stationId]
        );
        return normalizeStationCoordinates(result.rows[0]);
    } catch (error) {
        console.error('Error fetching station:', error);
        throw error;
    }
};

// =====================================================
// SLOTS (Créneaux)
// =====================================================

/**
 * Récupère les créneaux disponibles pour une station à une date donnée
 */
const getSlotsByStationAndDate = async (stationId, date) => {
    try {
        await cleanupExpiredPendingReservations();
        // date format: YYYY-MM-DD
        console.log(`[SLOTS] Fetching dynamic slots for station=${stationId}, date=${date}`);

        // Get station capacity
        const stationRes = await pool.query('SELECT capacity FROM stations WHERE id=$1::uuid', [stationId]);
        if (!stationRes.rows[0]) return [];
        const capacity = stationRes.rows[0].capacity;

        // Get reservations count group by heur_reserve
        const resCount = await pool.query(
            `SELECT heur_reserve, COUNT(*) as count 
             FROM reservations 
             WHERE station_id=$1::uuid
               AND date_reserve=$2::date
               AND charging_status = ANY($3)
             GROUP BY heur_reserve`,
            [stationId, date, ACTIVE_RESERVATION_STATUSES]
        );

        const countsMap = {};
        resCount.rows.forEach(r => {
            const timeStr = typeof r.heur_reserve === 'string' ? r.heur_reserve : r.heur_reserve.toString();
            const hm = timeStr.substring(0, 5);
            countsMap[hm] = parseInt(r.count);
        });

        const dynamicSlots = [];
        const baseDate = new Date(`${date}T08:00:00`);

        for (let i = 0; i < 46; i++) {
            const slotTime = new Date(baseDate.getTime() + i * 30 * 60000);
            
            const hours = String(slotTime.getHours()).padStart(2, '0');
            const minutes = String(slotTime.getMinutes()).padStart(2, '0');
            const timeStr = `${hours}:${minutes}`;

            const occupied = countsMap[timeStr] || 0;
            const isPastSlot = isReservationInPast(date, `${timeStr}:00`);
            const available_places = isPastSlot ? 0 : Math.max(0, capacity - occupied);

            dynamicSlots.push({
                id: `virt-${timeStr}`,
                station_id: stationId,
                date_reserve: date,
                heur_reserve: `${timeStr}:00`,
                start_datetime: slotTime.toISOString(),
                duration_minutes: 30,
                capacity: capacity,
                available_places: available_places,
                available: !isPastSlot && available_places > 0,
                is_past: isPastSlot
            });
        }

        console.log(`[SLOTS] Generated ${dynamicSlots.length} dynamic slots`);
        return dynamicSlots;
    } catch (error) {
        console.error('Error fetching slots:', error);
        throw error;
    }
};

/**
 * Crée un nouveau slot (créneau) pour une station
 */
const isTimeAvailable = async (stationId, date_reserve, heur_reserve) => {
    try {
        await cleanupExpiredPendingReservations();
        if (isReservationInPast(date_reserve, heur_reserve)) {
            return false;
        }

        const stationRes = await pool.query('SELECT capacity FROM stations WHERE id = $1::uuid', [stationId]);
        if (!stationRes.rows[0]) return false;
        const capacity = stationRes.rows[0].capacity;

        const resCount = await pool.query(
            `SELECT COUNT(*) as count FROM reservations 
             WHERE station_id = $1::uuid
               AND date_reserve = $2::date
               AND heur_reserve = $3::time
               AND charging_status = ANY($4)`,
            [stationId, date_reserve, heur_reserve, ACTIVE_RESERVATION_STATUSES]
        );

        const occupied = parseInt(resCount.rows[0].count);
        return occupied < capacity;
    } catch (error) {
        console.error('Error checking time availability:', error);
        throw error;
    }
};

// =====================================================
// RESERVATIONS
// =====================================================

/**
 * Vérifie si une voiture a une réservation active au même moment
 * Retourne true s'il y a un conflit
 */
const hasConflict = async (carId, date_reserve, heur_reserve) => {
    try {
        await cleanupExpiredPendingReservations();
        console.log(`[CONFLICT] Checking conflict for car=${carId}, date=${date_reserve}, time=${heur_reserve}`);

        const conflictResult = await pool.query(
            `SELECT id FROM reservations 
             WHERE car_id = $1
             AND date_reserve = $2::date
             AND heur_reserve = $3::time
             AND charging_status = ANY($4)`,
            [carId, date_reserve, heur_reserve, ACTIVE_RESERVATION_STATUSES]
        );

        const hasConflictFlag = conflictResult.rows.length > 0;
        console.log(`[CONFLICT] Result: ${hasConflictFlag ? 'CONFLICT FOUND' : 'NO CONFLICT'}`);
        return hasConflictFlag;
    } catch (error) {
        console.error('Error checking conflict:', error);
        throw error;
    }
};

/**
 * Crée une nouvelle réservation
 */
const createReservation = async (carId, stationId, date_reserve, heur_reserve, tariff) => {
    try {
        await cleanupExpiredPendingReservations();
        console.log(`[RESERVATION] Creating reservation for car=${carId}, station=${stationId}, date=${date_reserve}, time=${heur_reserve}`);

        if (isReservationInPast(date_reserve, heur_reserve)) {
            throw new Error('PAST_SLOT: Cannot create a reservation in the past');
        }

        // Vérifier le conflit
        const conflict = await hasConflict(carId, date_reserve, heur_reserve);
        if (conflict) {
            throw new Error('CONFLICT: Voiture a déjà une réservation active');
        }

        // Vérifier la disponibilité
        const available = await isTimeAvailable(stationId, date_reserve, heur_reserve);
        if (!available) {
            throw new Error('SLOT_FULL: Aucune place disponible dans ce créneau');
        }

        // Créer la réservation
        const result = await pool.query(
            `INSERT INTO reservations (car_id, station_id, date_reserve, heur_reserve, tariff, charging_status, qr_code)
             VALUES ($1, $2::uuid, $3::date, $4::time, $5, 'pending', '')
             RETURNING id, car_id, station_id, date_reserve, heur_reserve, created_at, charging_status AS status,
                0 AS charging_progress, tariff`,
            [carId, stationId, date_reserve, heur_reserve, tariff]
        );

        console.log(`[RESERVATION] Created: ${result.rows[0].id}`);
        return result.rows[0];
    } catch (error) {
        console.error('Error creating reservation:', error);
        throw error;
    }
};

/**
 * Génère un QR Code pour une réservation
 */
const generateQRCodeForReservation = async (reservationId, stationName, vehicleMatricule, dateTime) => {
    try {
        console.log(`[QR] Generating QR code for reservation=${reservationId}`);

        const qrData = {
            reservationId,
            stationName,
            vehicleMatricule,
            dateTime,
            timestamp: new Date().toISOString()
        };

        const qrString = JSON.stringify(qrData);
        const qrCodeImage = await QRCode.toDataURL(qrString);

        // Sauvegarder le QR code dans la DB
        await pool.query(
            'UPDATE reservations SET qr_code = $1 WHERE id = $2::uuid',
            [qrCodeImage, reservationId]
        );

        console.log(`[QR] QR code generated and saved`);
        return qrCodeImage;
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw error;
    }
};

/**
 * Récupère les réservations d'un utilisateur (via sa voiture)
 */
const getReservationsByCarId = async (carId) => {
    try {
        await cleanupExpiredPendingReservations();
        console.log(`[RESERVATIONS] Fetching reservations for car=${carId}`);

        const result = await fetchReservationsByCarIdentifier(carId);

        console.log(`[RESERVATIONS] Found ${result.rows.length} reservations`);
        return finalizeExpiredPendingRows(result.rows).map(normalizeStationCoordinates);
    } catch (error) {
        console.error('Error fetching reservations:', error);
        throw error;
    }
};

/**
 * Récupère une réservation par ID
 */
const getReservationById = async (reservationId) => {
    try {
        await cleanupExpiredPendingReservations();
        const result = await pool.query(
            `SELECT r.*, r.charging_status AS status,
                CASE r.charging_status
                    WHEN 'pending' THEN 0
                    WHEN 'charging_25' THEN 25
                    WHEN 'charging_50' THEN 50
                    WHEN 'charging_75' THEN 75
                    WHEN 'completed' THEN 75
                    WHEN 'paid' THEN 100
                    ELSE 0
                END AS charging_progress,
                st.name as station_name
             FROM reservations r
             INNER JOIN stations st ON r.station_id = st.id
             WHERE r.id = $1::uuid`,
            [reservationId]
        );
        const rows = await finalizeExpiredPendingRows(result.rows);
        return normalizeStationCoordinates(rows[0]);
    } catch (error) {
        console.error('Error fetching reservation:', error);
        throw error;
    }
};

const getAllChargingSessions = async () => {
    try {
        await cleanupExpiredPendingReservations();
        const result = await pool.query(
            `SELECT
                r.id,
                r.car_id,
                r.station_id,
                st.name AS station_name,
                st.average_duration_hours,
                v.immatricul,
                r.charging_status AS status,
                CASE r.charging_status
                    WHEN 'pending' THEN 0
                    WHEN 'charging_25' THEN 25
                    WHEN 'charging_50' THEN 50
                    WHEN 'charging_75' THEN 75
                    WHEN 'completed' THEN 75
                    WHEN 'paid' THEN 100
                    ELSE 0
                END AS charging_progress,
                r.date_reserve,
                r.heur_reserve
            FROM reservations r
            INNER JOIN stations st ON r.station_id = st.id
            INNER JOIN vehicles v ON r.car_id = v.id
            WHERE r.charging_status = ANY($1)
            ORDER BY st.name ASC, r.date_reserve DESC, r.heur_reserve DESC`,
            [CHARGING_OVERVIEW_STATUSES]
        );

        return finalizeExpiredPendingRows(result.rows);
    } catch (error) {
        console.error('Error fetching charging overview:', error);
        throw error;
    }
};

/**
 * Récupère les factures d'un utilisateur via sa voiture
 */
const getInvoicesByCarId = async (carId) => {
    try {
        const result = await fetchInvoicesByCarIdentifier(carId);

        return result.rows;
    } catch (error) {
        console.error('Error fetching invoices:', error);
        throw error;
    }
};

/**
 * Supprime une réservation en attente
 */
const cancelReservation = async (reservationId) => {
    try {
        await cleanupExpiredPendingReservations();
        const existingReservation = await getReservationById(reservationId);
        if (!existingReservation) {
            throw new Error('NOT_FOUND: Reservation not found');
        }

        if (existingReservation.status !== 'pending') {
            throw new Error('INVALID_STATUS: Only pending reservations can be cancelled');
        }

        const result = await pool.query(
            'DELETE FROM reservations WHERE id = $1::uuid RETURNING *',
            [reservationId]
        );

        return result.rows[0];
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        throw error;
    }
};

/**
 * Met à jour le status d'une réservation selon les transitions autorisées
 */
const updateReservationStatus = async (reservationId, newStatus) => {
    try {
        await cleanupExpiredPendingReservations();
        const existingReservation = await getReservationById(reservationId);
        if (!existingReservation) {
            throw new Error('NOT_FOUND: Reservation not found');
        }

        const allowedNextStatuses = STATUS_TRANSITIONS[existingReservation.status] || [];
        if (!allowedNextStatuses.includes(newStatus)) {
            throw new Error(`INVALID_STATUS: Cannot move from ${existingReservation.status} to ${newStatus}`);
        }

        const result = await pool.query(
            'UPDATE reservations SET charging_status = $1 WHERE id = $2::uuid RETURNING *, charging_status AS status',
            [newStatus, reservationId]
        );

        return result.rows[0];
    } catch (error) {
        console.error('Error updating reservation status:', error);
        throw error;
    }
};

/**
 * Marque une réservation comme payée
 */
const markReservationAsPaid = async (reservationId) => {
    const client = await pool.connect();
    try {
        await cleanupExpiredPendingReservations();
        await client.query('BEGIN');

        const existingReservationResult = await client.query(
            `SELECT r.*, r.charging_status AS status, st.name AS station_name
             FROM reservations r
             INNER JOIN stations st ON r.station_id = st.id
             WHERE r.id = $1::uuid`,
            [reservationId]
        );

        const existingReservation = existingReservationResult.rows[0];
        if (!existingReservation) {
            throw new Error('NOT_FOUND: Reservation not found');
        }

        const allowedNextStatuses = STATUS_TRANSITIONS[existingReservation.status] || [];
        if (!allowedNextStatuses.includes('paid')) {
            throw new Error(`INVALID_STATUS: Cannot move from ${existingReservation.status} to paid`);
        }

        const paidReservationResult = await client.query(
            'UPDATE reservations SET charging_status = $1 WHERE id = $2::uuid RETURNING *, charging_status AS status',
            ['paid', reservationId]
        );

        const invoiceCheck = await client.query(
            'SELECT id, reservation_id, amount, paid_at FROM invoices WHERE reservation_id = $1::uuid LIMIT 1',
            [reservationId]
        );

        let invoice;
        if (invoiceCheck.rows[0]) {
            const updatedInvoice = await client.query(
                'UPDATE invoices SET amount = $1, paid_at = NOW() WHERE reservation_id = $2::uuid RETURNING id, reservation_id, amount, paid_at',
                [existingReservation.tariff, reservationId]
            );
            invoice = updatedInvoice.rows[0];
        } else {
            const createdInvoice = await client.query(
                `INSERT INTO invoices (reservation_id, amount, paid_at)
                 VALUES ($1::uuid, $2, NOW())
                 RETURNING id, reservation_id, amount, paid_at`,
                [reservationId, existingReservation.tariff]
            );
            invoice = createdInvoice.rows[0];
        }

        await client.query('COMMIT');

        return {
            ...paidReservationResult.rows[0],
            invoice
        };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error marking reservation as paid:', error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Supprime une réservation (après paiement ou annulation)
 */
const deleteReservation = async (reservationId) => {
    try {
        await pool.query('DELETE FROM reservations WHERE id = $1::uuid', [reservationId]);
        return true;
    } catch (error) {
        console.error('Error deleting reservation:', error);
        throw error;
    }
};

module.exports = {
    getAllStations,
    getStationById,
    getSlotsByStationAndDate,
    isTimeAvailable,
    hasConflict,
    createReservation,
    generateQRCodeForReservation,
    getReservationsByCarId,
    getAllChargingSessions,
    getReservationById,
    getInvoicesByCarId,
    cancelReservation,
    updateReservationStatus,
    markReservationAsPaid,
    deleteReservation
};
