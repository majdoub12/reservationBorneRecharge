const pool = require('../config/db');
const QRCode = require('qrcode');

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
        return result.rows;
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
        return result.rows[0];
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
             WHERE station_id=$1::uuid AND date_reserve=$2::date AND status != 'cancelled'
             GROUP BY heur_reserve`,
            [stationId, date]
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
            const available_places = capacity - occupied;

            dynamicSlots.push({
                id: `virt-${timeStr}`,
                station_id: stationId,
                date_reserve: date,
                heur_reserve: `${timeStr}:00`,
                start_datetime: slotTime.toISOString(),
                duration_minutes: 30,
                capacity: capacity,
                available_places: available_places,
                available: available_places > 0
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
        const stationRes = await pool.query('SELECT capacity FROM stations WHERE id = $1::uuid', [stationId]);
        if (!stationRes.rows[0]) return false;
        const capacity = stationRes.rows[0].capacity;

        const resCount = await pool.query(
            `SELECT COUNT(*) as count FROM reservations 
             WHERE station_id = $1::uuid AND date_reserve = $2::date AND heur_reserve = $3::time AND status != 'cancelled'`,
            [stationId, date_reserve, heur_reserve]
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
        console.log(`[CONFLICT] Checking conflict for car=${carId}, date=${date_reserve}, time=${heur_reserve}`);

        const conflictResult = await pool.query(
            `SELECT id FROM reservations 
             WHERE car_id = $1
             AND date_reserve = $2::date
             AND heur_reserve = $3::time
             AND status IN ('pending', 'completed')`,
            [carId, date_reserve, heur_reserve]
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
        console.log(`[RESERVATION] Creating reservation for car=${carId}, station=${stationId}, date=${date_reserve}, time=${heur_reserve}`);

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
            `INSERT INTO reservations (car_id, station_id, date_reserve, heur_reserve, tariff, status, qr_code)
             VALUES ($1, $2::uuid, $3::date, $4::time, $5, 'pending', '')
             RETURNING id, car_id, station_id, date_reserve, heur_reserve, created_at, status, tariff`,
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
        console.log(`[RESERVATIONS] Fetching reservations for car=${carId}`);

        const result = await pool.query(
            `SELECT r.id, r.car_id, r.station_id, r.date_reserve, r.heur_reserve, r.created_at, r.status, r.tariff, r.qr_code,
                    st.name as station_name, st.latitude, st.longitude
             FROM reservations r
             INNER JOIN stations st ON r.station_id = st.id
             WHERE r.car_id = $1
             AND (r.date_reserve > CURRENT_DATE OR (r.date_reserve = CURRENT_DATE AND r.heur_reserve >= CURRENT_TIME))
             ORDER BY r.date_reserve DESC, r.heur_reserve DESC`,
            [carId]
        );

        console.log(`[RESERVATIONS] Found ${result.rows.length} reservations`);
        return result.rows;
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
        const result = await pool.query(
            `SELECT r.*, st.name as station_name
             FROM reservations r
             INNER JOIN stations st ON r.station_id = st.id
             WHERE r.id = $1::uuid`,
            [reservationId]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error fetching reservation:', error);
        throw error;
    }
};

/**
 * Annule une réservation
 */
const cancelReservation = async (reservationId) => {
    try {
        const result = await pool.query(
            'UPDATE reservations SET status = $1, updated_at = NOW() WHERE id = $2::uuid RETURNING *',
            ['cancelled', reservationId]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        throw error;
    }
};

/**
 * Met à jour le status d'une réservation à "completed"
 */
const completeReservation = async (reservationId) => {
    try {
        const result = await pool.query(
            'UPDATE reservations SET status = $1, updated_at = NOW() WHERE id = $2::uuid RETURNING *',
            ['completed', reservationId]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error completing reservation:', error);
        throw error;
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
    getReservationById,
    cancelReservation,
    completeReservation,
    deleteReservation
};