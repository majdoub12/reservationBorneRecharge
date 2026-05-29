const pool = require('../config/db');

const resetSlots = async () => {
    try {
        console.log('--- STARTING DATABASE RESET ---');
        
        // Supprimer toutes les réservations d'abord pour éviter les conflits de clés étrangères
        console.log('-> Clearing reservations...');
        await pool.query('DELETE FROM reservations');
        
        // Supprimer tous les creneaux existants
        console.log('-> Clearing slots...');
        await pool.query('DELETE FROM slots');
        console.log('All previous reservations and slots have been deleted successfully.');

        // Récupérer toutes les stations
        const stations = await pool.query('SELECT id FROM stations');
        
        // Obtenir la date d'aujourd'hui
        const todayStr = new Date().toISOString().split('T')[0];
        console.log(`-> Generating 46 slots (from 08:00 AM) for ${todayStr} for all ${stations.rowCount} stations...`);

        // Créer les 46 créneaux pour aujourd'hui pour chaque station
        const baseDate = new Date(`${todayStr}T08:00:00`);
        let totalCreated = 0;
        
        for (const station of stations.rows) {
            for (let i = 0; i < 46; i++) {
                const slotTime = new Date(baseDate);
                slotTime.setMinutes(slotTime.getMinutes() + (i * 30));
                
                // Insérer dans la base (8 places, 30 min)
                await pool.query(
                    `INSERT INTO slots (station_id, start_datetime, duration_minutes, available, capacity)
                     VALUES ($1::uuid, $2, $3, TRUE, 8)`,
                    [station.id, slotTime.toISOString(), 30]
                );
                totalCreated++;
            }
        }
        
        console.log(`-> Successfully created ${totalCreated} slots.`);
        console.log('--- RESET COMPLETE ---');
    } catch (err) {
        console.error('Error during reset:', err);
    } finally {
        pool.end();
    }
};

resetSlots();
