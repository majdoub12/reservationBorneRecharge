const pool = require('../config/db');
const QRCode = require('qrcode');

const ACTIVE_STATUSES = ['pending', 'charging_25', 'charging_50', 'charging_75', 'completed'];
const CHARGING_OVERVIEW_STATUSES = ['pending', 'charging_25', 'charging_50', 'charging_75', 'completed'];
const ACTIVE_BORNE_OCCUPANCY_STATUSES = ACTIVE_STATUSES;
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
const CHARGING_GRACE_MINUTES = 15;
const DEFAULT_TIME_ZONE = 'Africa/Tunis';
let reservationsBorneIdColumnPromise = null;
let stationHoursColumnsPromise = null;
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

const mapBorneRow = (row) => ({
    id_b: row.id_b,
    station_id: row.station_id,
    charging_speed_kw: row.charging_speed_kw,
    average_duration_hours: row.average_duration_hours,
    tariff: row.tarif
});

const enrichStationWithBornes = (station, bornes) => {
    const sortedBornes = [...bornes].sort((a, b) => {
        if (a.tariff !== b.tariff) {
            return (a.tariff ?? 0) - (b.tariff ?? 0);
        }
        return (b.charging_speed_kw ?? 0) - (a.charging_speed_kw ?? 0);
    });

    const primaryBorne = sortedBornes[0] || {};

    return {
        ...station,
        bornes: sortedBornes,
        capacity: sortedBornes.length,
        totalSlots: sortedBornes.length,
        charging_speed_kw: primaryBorne.charging_speed_kw ?? null,
        average_duration_hours: primaryBorne.average_duration_hours ?? null,
        tariff: primaryBorne.tariff ?? null
    };
};

const getStationBornes = async (stationId) => {
    if (!stationId) {
        return [];
    }

    const result = await pool.query(
        `SELECT id_b, station_id, charging_speed_kw, average_duration_hours, tarif
         FROM borne
         WHERE station_id = $1::uuid
         ORDER BY tarif ASC, charging_speed_kw DESC`,
        [stationId]
    );

    return result.rows.map(mapBorneRow);
};

const getStationCapacity = async (stationId) => {
    const result = await pool.query(
        'SELECT COUNT(*)::int AS capacity FROM borne WHERE station_id = $1::uuid',
        [stationId]
    );

    return result.rows[0]?.capacity || 0;
};

const hasReservationsBorneIdColumn = async () => {
    if (!reservationsBorneIdColumnPromise) {
        reservationsBorneIdColumnPromise = pool
            .query(
                `SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'reservations'
                      AND column_name = 'borne_id'
                ) AS has_column`
            )
            .then((result) => Boolean(result.rows[0]?.has_column))
            .catch((error) => {
                reservationsBorneIdColumnPromise = null;
                throw error;
            });
    }

    return reservationsBorneIdColumnPromise;
};

const hasStationHoursColumns = async () => {
    if (!stationHoursColumnsPromise) {
        stationHoursColumnsPromise = pool
            .query(
                `SELECT
                    EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'stations'
                          AND column_name = 'heur_ouverture'
                    ) AS has_opening,
                    EXISTS (
                        SELECT 1
                        FROM information_schema.columns
                        WHERE table_schema = 'public'
                          AND table_name = 'stations'
                          AND column_name = 'heur_fermeture'
                    ) AS has_closing`
            )
            .then((result) => Boolean(result.rows[0]?.has_opening && result.rows[0]?.has_closing))
            .catch((error) => {
                stationHoursColumnsPromise = null;
                throw error;
            });
    }

    return stationHoursColumnsPromise;
};

const parseTimeToMinutes = (time) => {
    if (!time) {
        return null;
    }

    const normalized = String(time).substring(0, 5);
    const [hours, minutes] = normalized.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        return null;
    }

    return hours * 60 + minutes;
};

const getStationTimeWindow = async (stationId) => {
    const hasHours = await hasStationHoursColumns();
    if (!hasHours) {
        return {
            heur_ouverture: null,
            heur_fermeture: null,
        };
    }

    const result = await pool.query(
        `SELECT heur_ouverture, heur_fermeture
         FROM stations
         WHERE id = $1::uuid`,
        [stationId]
    );

    return result.rows[0] || {
        heur_ouverture: null,
        heur_fermeture: null,
    };
};

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const parseDateParts = (date) => {
    if (!date) {
        return null;
    }

    if (date instanceof Date) {
        return {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate()
        };
    }

    const [year, month, day] = String(date).substring(0, 10).split('-').map(Number);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        return null;
    }

    return { year, month, day };
};

const parseTimeParts = (time) => {
    if (!time) {
        return null;
    }

    const normalized = String(time).substring(0, 8);
    const [hours, minutes, seconds = 0] = normalized.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
        return null;
    }

    return { hours, minutes, seconds };
};

const buildLocalDateTime = (date, time) => {
    const dateParts = parseDateParts(date);
    const timeParts = parseTimeParts(time);

    if (!dateParts || !timeParts) {
        return null;
    }

    return new Date(Date.UTC(
        dateParts.year,
        dateParts.month - 1,
        dateParts.day,
        timeParts.hours,
        timeParts.minutes,
        timeParts.seconds
    ));
};

const getCurrentDateTimeInTimeZone = (timeZone = DEFAULT_TIME_ZONE) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(new Date()).reduce((acc, part) => {
        if (part.type !== 'literal') {
            acc[part.type] = part.value;
        }
        return acc;
    }, {});

    const year = Number(parts.year);
    const month = Number(parts.month);
    const day = Number(parts.day);
    const hours = Number(parts.hour);
    const minutes = Number(parts.minute);
    const seconds = Number(parts.second);

    if (![year, month, day, hours, minutes, seconds].every(Number.isFinite)) {
        return new Date();
    }

    return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
};

const getDateTimeFromParts = (date, time) => {
    return buildLocalDateTime(date, time);
};

const addHours = (date, hours) => new Date(date.getTime() + toNumber(hours, 2) * 60 * 60 * 1000);

const addMinutes = (date, minutes) => new Date(date.getTime() + toNumber(minutes, 0) * 60 * 1000);

const isReservationWindowActiveAt = (reservation, slotDateTime) => {
    const reservationStart = getDateTimeFromParts(reservation.date_reserve, reservation.heur_reserve);
    const reservationEnd = addHours(reservationStart, reservation.duration_hours ?? 2);

    return slotDateTime >= reservationStart && slotDateTime < reservationEnd;
};

const getStationAvailabilityContext = async (stationId, date) => {
    const reservationsHaveBorneId = await hasReservationsBorneIdColumn();

    const [bornesResult, reservationsResult] = await Promise.all([
        pool.query(
            `SELECT id_b, station_id, charging_speed_kw, average_duration_hours, tarif
             FROM borne
             WHERE station_id = $1::uuid
             ORDER BY tarif ASC, charging_speed_kw DESC`,
            [stationId]
        ),
        reservationsHaveBorneId
            ? pool.query(
                `SELECT r.id, r.borne_id, r.date_reserve, r.heur_reserve,
                        COALESCE(b.average_duration_hours, 2) AS duration_hours
                 FROM reservations r
                 LEFT JOIN borne b ON r.borne_id = b.id_b
                 WHERE r.station_id = $1::uuid
                   AND r.date_reserve = $2::date
                   AND r.charging_status = ANY($3::text[])`,
                [stationId, date, ACTIVE_BORNE_OCCUPANCY_STATUSES]
            )
            : pool.query(
                `SELECT r.id, NULL::int AS borne_id, r.date_reserve, r.heur_reserve,
                        2 AS duration_hours
                 FROM reservations r
                 WHERE r.station_id = $1::uuid
                   AND r.date_reserve = $2::date
                   AND r.charging_status = ANY($3::text[])`,
                [stationId, date, ACTIVE_BORNE_OCCUPANCY_STATUSES]
            ),
    ]);

    return {
        bornes: bornesResult.rows.map(mapBorneRow),
        reservations: reservationsResult.rows.map((row) => ({
            ...row,
            duration_hours: toNumber(row.duration_hours, 2),
        })),
    };
};

const isTimeWithinStationHours = async (stationId, date, time) => {
    const stationWindow = await getStationTimeWindow(stationId);
    const openingMinutes = parseTimeToMinutes(stationWindow.heur_ouverture);
    const closingMinutes = parseTimeToMinutes(stationWindow.heur_fermeture);

    if (openingMinutes === null || closingMinutes === null) {
        return true;
    }

    const slotMinutes = parseTimeToMinutes(time);
    if (slotMinutes === null) {
        return false;
    }

    if (openingMinutes <= closingMinutes) {
        return slotMinutes >= openingMinutes && slotMinutes <= closingMinutes;
    }

    return slotMinutes >= openingMinutes || slotMinutes <= closingMinutes;
};

const getAvailableBornesFromContext = (bornes, reservations, slotDateTime) => {
    return bornes.filter((borne) => {
        return !reservations.some((reservation) => {
            const matchesBorne =
                reservation.borne_id === null ||
                reservation.borne_id === undefined ||
                String(reservation.borne_id) === String(borne.id_b);

            return matchesBorne && isReservationWindowActiveAt(reservation, slotDateTime);
        });
    });
};

const getAvailableBornesByStationAndDateTime = async (stationId, date, time) => {
    if (!stationId || !date || !time) {
        return [];
    }

    if (isReservationInPast(date, time)) {
        const error = new Error('PAST_SLOT: Selected time is in the past');
        error.code = 'PAST_SLOT';
        throw error;
    }

    const withinHours = await isTimeWithinStationHours(stationId, date, time);
    if (!withinHours) {
        const stationWindow = await getStationTimeWindow(stationId);
        const error = new Error('OUT_OF_OPENING_HOURS: Selected time is outside station opening hours');
        error.code = 'OUT_OF_OPENING_HOURS';
        error.stationWindow = stationWindow;
        throw error;
    }

    const context = await getStationAvailabilityContext(stationId, date);
    const slotDateTime = getDateTimeFromParts(date, time);

    return getAvailableBornesFromContext(context.bornes, context.reservations, slotDateTime);
};

const parseReservationDateTime = (date_reserve, heur_reserve) => {
    return buildLocalDateTime(date_reserve, heur_reserve);
};

const isReservationInPast = (date_reserve, heur_reserve) => {
    const reservationDateTime = parseReservationDateTime(date_reserve, heur_reserve);
    if (!reservationDateTime || Number.isNaN(reservationDateTime.getTime())) {
        return true;
    }

    return reservationDateTime < getCurrentDateTimeInTimeZone();
};

const getReservationGraceEnd = (date_reserve, heur_reserve) => {
    const reservationDateTime = parseReservationDateTime(date_reserve, heur_reserve);
    if (!reservationDateTime || Number.isNaN(reservationDateTime.getTime())) {
        return null;
    }

    return addMinutes(reservationDateTime, CHARGING_GRACE_MINUTES);
};

const isReservationPastChargingGrace = (date_reserve, heur_reserve) => {
    const graceEnd = getReservationGraceEnd(date_reserve, heur_reserve);
    if (!graceEnd) {
        return true;
    }

    return graceEnd < getCurrentDateTimeInTimeZone();
};

const cleanupExpiredPendingReservations = async () => {
    try {
        const result = await pool.query(
            `UPDATE reservations
             SET charging_status = $1
             WHERE charging_status = 'pending'
               AND (((date_reserve::text || ' ' || heur_reserve::text)::timestamp)
                   + INTERVAL '${CHARGING_GRACE_MINUTES} minutes')
                   < (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Tunis')
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
    const now = getCurrentDateTimeInTimeZone();
    const expiredIds = rows
        .filter((row) => row.charging_status === 'pending')
        .filter((row) => {
            const graceEnd = getReservationGraceEnd(row.date_reserve, row.heur_reserve);
            return graceEnd ? graceEnd < now : true;
        })
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
         AND r.charging_status = ANY($2::text[])
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
        const hasHours = await hasStationHoursColumns();
        const stationResult = await pool.query(
            hasHours
                ? 'SELECT id, name, latitude, longitude, heur_ouverture, heur_fermeture FROM stations ORDER BY name'
                : `SELECT id, name, latitude, longitude,
                        NULL::time AS heur_ouverture,
                        NULL::time AS heur_fermeture
                   FROM stations ORDER BY name`
        );

        const stationIds = stationResult.rows.map((station) => station.id);
        const bornesByStation = {};

        if (stationIds.length > 0) {
            const bornesResult = await pool.query(
                `SELECT id_b, station_id, charging_speed_kw, average_duration_hours, tarif
                 FROM borne
                 WHERE station_id = ANY($1::uuid[])
                 ORDER BY tarif ASC, charging_speed_kw DESC`,
                [stationIds]
            );

            bornesResult.rows.forEach((row) => {
                const stationId = row.station_id;
                bornesByStation[stationId] = bornesByStation[stationId] || [];
                bornesByStation[stationId].push(mapBorneRow(row));
            });
        }

        return stationResult.rows
            .map((station) => enrichStationWithBornes(station, bornesByStation[station.id] || []))
            .map(normalizeStationCoordinates);
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
        const hasHours = await hasStationHoursColumns();
        const result = await pool.query(
            hasHours
                ? 'SELECT id, name, latitude, longitude, heur_ouverture, heur_fermeture FROM stations WHERE id = $1::uuid'
                : `SELECT id, name, latitude, longitude,
                        NULL::time AS heur_ouverture,
                        NULL::time AS heur_fermeture
                   FROM stations WHERE id = $1::uuid`,
            [stationId]
        );

        const station = result.rows[0];
        if (!station) {
            return null;
        }

        const bornes = await getStationBornes(stationId);
        return normalizeStationCoordinates(enrichStationWithBornes(station, bornes));
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

        const context = await getStationAvailabilityContext(stationId, date);
        if (context.bornes.length === 0) return [];

        const dynamicSlots = [];
        const baseDate = getDateTimeFromParts(date, '08:00:00');
        if (!baseDate) {
            return [];
        }

        for (let i = 0; i < 46; i++) {
            const slotTime = new Date(baseDate.getTime() + i * 30 * 60000);
            
            const hours = String(slotTime.getUTCHours()).padStart(2, '0');
            const minutes = String(slotTime.getUTCMinutes()).padStart(2, '0');
            const timeStr = `${hours}:${minutes}`;

            const isPastSlot = isReservationInPast(date, `${timeStr}:00`);
            const availableBornes = isPastSlot
                ? []
                : getAvailableBornesFromContext(context.bornes, context.reservations, slotTime);
            const available_places = availableBornes.length;

            dynamicSlots.push({
                id: `virt-${timeStr}`,
                station_id: stationId,
                date_reserve: date,
                heur_reserve: `${timeStr}:00`,
                start_datetime: slotTime.toISOString(),
                duration_minutes: 30,
                capacity: context.bornes.length,
                available_places: available_places,
                available: !isPastSlot && available_places > 0,
                is_past: isPastSlot,
                available_borne_ids: availableBornes.map((borne) => borne.id_b)
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

        const capacity = await getStationCapacity(stationId);
        if (capacity === 0) return false;

        const resCount = await pool.query(
            `SELECT COUNT(*) as count FROM reservations 
             WHERE station_id = $1::uuid
               AND date_reserve = $2::date
               AND heur_reserve = $3::time
               AND charging_status = ANY($4::text[])`,
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
const createReservation = async (carId, stationId, borneId, date_reserve, heur_reserve) => {
    try {
        await cleanupExpiredPendingReservations();
        console.log(`[RESERVATION] Creating reservation for car=${carId}, station=${stationId}, borne=${borneId}, date=${date_reserve}, time=${heur_reserve}`);

        if (isReservationInPast(date_reserve, heur_reserve)) {
            throw new Error('PAST_SLOT: Cannot create a reservation in the past');
        }

        if (!borneId) {
            throw new Error('BORNE_REQUIRED: A borne must be selected');
        }

        const selectedBorneResult = await pool.query(
            `SELECT id_b, station_id, charging_speed_kw, average_duration_hours, tarif
             FROM borne
             WHERE id_b = $1::int AND station_id = $2::uuid
             LIMIT 1`,
            [borneId, stationId]
        );

        const selectedBorne = selectedBorneResult.rows[0];
        if (!selectedBorne) {
            throw new Error('BORNE_NOT_FOUND: Selected borne does not belong to this station');
        }

        const availableBornes = await getAvailableBornesByStationAndDateTime(stationId, date_reserve, heur_reserve);
        const chosenBorne = availableBornes.find((borne) => String(borne.id_b) === String(borneId));
        if (!chosenBorne) {
            throw new Error('BORNE_UNAVAILABLE: Selected borne is not available at this time');
        }

        // Vérifier le conflit pour la voiture
        const conflict = await hasConflict(carId, date_reserve, heur_reserve);
        if (conflict) {
            throw new Error('CONFLICT: Voiture a déjà une réservation active');
        }

        const reservationsHaveBorneId = await hasReservationsBorneIdColumn();
        const insertSql = reservationsHaveBorneId
            ? `INSERT INTO reservations (car_id, station_id, borne_id, date_reserve, heur_reserve, tariff, charging_status, qr_code)
               VALUES ($1, $2::uuid, $3::int, $4::date, $5::time, $6, 'pending', '')
               RETURNING id, car_id, station_id, borne_id, date_reserve, heur_reserve, created_at, charging_status AS status,
                  0 AS charging_progress, tariff`
            : `INSERT INTO reservations (car_id, station_id, date_reserve, heur_reserve, tariff, charging_status, qr_code)
               VALUES ($1, $2::uuid, $3::date, $4::time, $5, 'pending', '')
               RETURNING id, car_id, station_id, NULL::int AS borne_id, date_reserve, heur_reserve, created_at, charging_status AS status,
                  0 AS charging_progress, tariff`;

        const insertParams = reservationsHaveBorneId
            ? [carId, stationId, borneId, date_reserve, heur_reserve, selectedBorne.tarif]
            : [carId, stationId, date_reserve, heur_reserve, selectedBorne.tarif];

        // Créer la réservation
        const result = await pool.query(insertSql, insertParams);

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
        const rows = await finalizeExpiredPendingRows(result.rows);
        return rows.map(normalizeStationCoordinates);
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
        const reservationsHaveBorneId = await hasReservationsBorneIdColumn();
        const selectBorneColumns = reservationsHaveBorneId
            ? `r.borne_id,
                COALESCE(b.average_duration_hours, 2) AS average_duration_hours,`
            : `NULL::int AS borne_id,
                NULL::numeric AS average_duration_hours,`;
        const joinBorneClause = reservationsHaveBorneId
            ? 'LEFT JOIN borne b ON r.borne_id = b.id_b'
            : '';
        const result = await pool.query(
            `SELECT
                r.id,
                r.car_id,
                r.station_id,
                st.name AS station_name,
                ${selectBorneColumns}
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
            ${joinBorneClause}
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
        const existingReservation = normalizeStationCoordinates(result.rows[0]);
        if (!existingReservation) {
            throw new Error('NOT_FOUND: Reservation not found');
        }

        if (existingReservation.status !== 'pending') {
            throw new Error('INVALID_STATUS: Only pending reservations can be cancelled');
        }

        const deleteResult = await pool.query(
            'DELETE FROM reservations WHERE id = $1::uuid RETURNING *',
            [reservationId]
        );

        return deleteResult.rows[0];
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

        if (
            existingReservation.status === 'pending' &&
            isReservationPastChargingGrace(existingReservation.date_reserve, existingReservation.heur_reserve)
        ) {
            await pool.query(
                `UPDATE reservations
                 SET charging_status = $1
                 WHERE id = $2::uuid AND charging_status = 'pending'`,
                [EXPIRED_PENDING_STATUS, reservationId]
            );
            throw new Error('EXPIRED_RESERVATION: Reservation has already started or expired');
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
    getAvailableBornesByStationAndDateTime,
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
