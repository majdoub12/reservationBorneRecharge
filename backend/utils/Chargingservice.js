/**
 * UPDATED chargingService.js - Avec durée dynamique basée sur stations
 * 
 * Modifications principales:
 * 1. Utiliser average_duration_hours de la station
 * 2. Simuler la progression progressivement (pas juste en étapes fixes)
 * 3. Ajouter de l'aléatoire pour réalisme
 */

// Exemple de fonction améliorée pour simulateChargingProgress:
const pool = require('../db'); // Assurez-vous que le pool est correctement configuré

const simulateChargingProgressEnhanced = async (reservationId, stationId) => {
    try {
        // 1. Récupérer la station pour obtenir average_duration_hours
        const stationResult = await pool.query(
            `SELECT average_duration_hours
             FROM borne
             WHERE station_id = $1::uuid
             ORDER BY tarif ASC
             LIMIT 1`,
            [stationId]
        );

        if (stationResult.rows.length === 0) {
            throw new Error('Station not found');
        }

        const stationDurationHours = stationResult.rows[0].average_duration_hours;
        const stationDurationMinutes = Math.round(stationDurationHours * 60);

        // 2. Vérifier que la réservation existe et est en cours
        const reservation = await pool.query(
            'SELECT id, charging_status FROM reservations WHERE id = $1',
            [reservationId]
        );

        if (reservation.rows.length === 0) {
            throw new Error('Reservation not found');
        }

        if (reservation.rows[0].charging_status !== 'charging') {
            throw new Error('Reservation is not in charging status');
        }

        // 3. Calculer les intervalles pour atteindre les étapes en fonction de la durée
        const progressSteps = [0, 25, 50, 75, 100];
        const intervals = [];

        // Distribuer les étapes de manière réaliste
        // 0% → 25%: ~25% du temps total
        // 25% → 50%: ~25% du temps total
        // 50% → 75%: ~30% du temps total (un peu plus rapide vers la fin)
        // 75% → 100%: ~20% du temps total (les 5% finaux sont plus lents)

        const intervalMillis = [
            Math.round(stationDurationMinutes * 0.25 * 60 * 1000),  // 0→25%
            Math.round(stationDurationMinutes * 0.25 * 60 * 1000),  // 25→50%
            Math.round(stationDurationMinutes * 0.30 * 60 * 1000),  // 50→75%
            Math.round(stationDurationMinutes * 0.20 * 60 * 1000)   // 75→100%
        ];

        // 4. Ajouter du bruit/aléatoire (±10%) pour réalisme
        const noisyIntervals = intervalMillis.map(interval => {
            const noise = (Math.random() - 0.5) * 0.2 * interval; // ±10%
            return Math.max(1000, interval + noise); // Min 1s
        });

        console.log(`[CHARGING SIMULATION] Reservation ${reservationId.substring(0, 8)}`);
        console.log(`[CHARGING SIMULATION] Station duration: ${stationDurationMinutes} minutes`);
        console.log(`[CHARGING SIMULATION] Interval distribution: [${noisyIntervals.map(i => (i / 60000).toFixed(1) + 'm').join(', ')}]`);

        // 5. Lancer la simulation
        let currentStep = 0;

        const nextStep = async () => {
            if (currentStep < progressSteps.length) {
                const progress = progressSteps[currentStep];
                const timestamp = new Date().toISOString();

                console.log(`[CHARGING] ${timestamp} - Reservation ${reservationId.substring(0, 8)}: ${progress}%`);

                try {
                    await updateChargingProgress(reservationId, progress);
                } catch (error) {
                    console.error(`[CHARGING ERROR] Failed to update progress to ${progress}%:`, error.message);
                }

                currentStep++;

                // Continuer si pas terminé
                if (currentStep < progressSteps.length) {
                    const nextInterval = noisyIntervals[currentStep - 1];
                    setTimeout(nextStep, nextInterval);
                }
            }
        };

        // Démarrer la simulation immédiatement (0%)
        nextStep();

        const totalDurationMs = noisyIntervals.reduce((sum, interval) => sum + interval, 0);

        return {
            message: 'Charging simulation started with dynamic duration',
            reservationId,
            stationDurationMinutes,
            totalDurationMinutes: Math.round(totalDurationMs / 60000),
            progressSteps: progressSteps,
            intervals: noisyIntervals.map(i => (i / 60000).toFixed(1) + 'm')
        };
    } catch (error) {
        console.error('Error simulating charging progress:', error);
        throw error;
    }
};

// =====================================================
// AJOUTER AUSSI CETTE FONCTION AU MODULE
// =====================================================

/**
 * Calcule le temps estimé restant basé sur la progression
 */
const estimateTimeRemaining = (chargingProgress, stationDurationHours) => {
    const remainingPercent = 100 - chargingProgress;
    const remainingMinutes = Math.round((stationDurationHours * 60) * (remainingPercent / 100));
    return remainingMinutes;
};

/**
 * Retourne le statut detaillé d'un chargement avec temps estimé
 */
const getChargingStatusDetailed = async (reservationId) => {
    const charging = await getChargingStatus(reservationId);
    
    if (!charging) {
        throw new Error('Charging not found');
    }

    // Récupérer la durée moyenne de la station
    const stationResult = await pool.query(
        `SELECT average_duration_hours
         FROM borne
         WHERE station_id = $1::uuid
         ORDER BY tarif ASC
         LIMIT 1`,
        [charging.station_id]
    );

    const stationDurationHours = stationResult.rows[0]?.average_duration_hours || 2;
    const timeRemaining = estimateTimeRemaining(charging.charging_progress, stationDurationHours);

    return {
        ...charging,
        stationDurationHours,
        timeRemainingMinutes: timeRemaining,
        percentageComplete: charging.charging_progress,
        percentageRemaining: 100 - charging.charging_progress
    };
};

// =====================================================
// EXEMPLE D'UTILISATION DEPUIS LE CONTROLLER
// =====================================================

/*
const startChargingWithSimulation = async (req, res) => {
    try {
        const { reservationId, stationId, simulateProgress = true } = req.body;

        // Démarrer le chargement
        await chargingService.startCharging(reservationId, stationId);

        // Optionnellement simuler la progression
        if (simulateProgress) {
            await chargingService.simulateChargingProgressEnhanced(reservationId, stationId);
        }

        res.status(200).json({
            success: true,
            message: 'Charging started' + (simulateProgress ? ' with simulation' : ''),
            reservationId
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to start charging',
            error: error.message
        });
    }
};
*/

module.exports = {
    simulateChargingProgressEnhanced,
    estimateTimeRemaining,
    getChargingStatusDetailed
};
