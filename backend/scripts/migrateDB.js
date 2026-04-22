const pool = require('../config/db');

async function runMigration() {
    console.log('--- STARTING MIGRATION ---');
    try {
        console.log('-> Checking current vehicles table schema...');

        // Check if columns already exist
        const columnsResult = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'vehicles' AND column_name IN ('is_foreign', 'is_temporary', 'model')
        `);

        const existingColumns = columnsResult.rows.map(row => row.column_name);
        console.log('Existing columns:', existingColumns);

        if (!existingColumns.includes('is_foreign')) {
            console.log('-> Adding is_foreign column...');
            await pool.query(`
                ALTER TABLE vehicles
                ADD COLUMN is_foreign BOOLEAN NOT NULL DEFAULT FALSE
            `);
        } else {
            console.log('-> is_foreign column already exists');
        }

        if (!existingColumns.includes('is_temporary')) {
            console.log('-> Adding is_temporary column...');
            await pool.query(`
                ALTER TABLE vehicles
                ADD COLUMN is_temporary BOOLEAN NOT NULL DEFAULT FALSE
            `);
        } else {
            console.log('-> is_temporary column already exists');
        }

        if (!existingColumns.includes('model')) {
            console.log('-> Adding model column...');
            await pool.query(`
                ALTER TABLE vehicles
                ADD COLUMN model VARCHAR(32)
            `);
        } else {
            console.log('-> model column already exists');
        }

        console.log('-> Checking model constraint...');
        const modelConstraintResult = await pool.query(`
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'vehicles'::regclass AND conname = 'vehicles_model_check'
            LIMIT 1
        `);

        if (modelConstraintResult.rows.length === 0) {
            console.log('-> Adding model check constraint...');
            try {
                await pool.query(`
                    ALTER TABLE vehicles
                    ADD CONSTRAINT vehicles_model_check
                    CHECK (model IS NULL OR model IN ('model3', 'modelS', 'modelY', 'modelX', 'cyberTruck'))
                `);
            } catch (err) {
                console.log('-> model constraint might already exist or conflict with rows, skipping...');
            }
        } else {
            console.log('-> model check constraint already exists');
        }

        // Check for unique constraints
        console.log('-> Checking unique constraints...');
        const constraintsResult = await pool.query(`
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'vehicles'::regclass AND contype = 'u'
        `);

        const existingConstraints = constraintsResult.rows.map(row => row.conname);
        console.log('Existing unique constraints:', existingConstraints);

        if (!existingConstraints.includes('vehicles_vin_unique')) {
            console.log('-> Adding vin unique constraint...');
            try {
                await pool.query(`
                    ALTER TABLE vehicles ADD CONSTRAINT vehicles_vin_unique UNIQUE (vin)
                `);
            } catch (err) {
                console.log('-> vin constraint might already exist or have duplicates, skipping...');
            }
        }

        if (!existingConstraints.includes('vehicles_immatricul_unique')) {
            console.log('-> Adding immatricul unique constraint...');
            try {
                await pool.query(`
                    ALTER TABLE vehicles ADD CONSTRAINT vehicles_immatricul_unique UNIQUE (immatricul)
                `);
            } catch (err) {
                console.log('-> immatricul constraint might already exist or have duplicates, skipping...');
            }
        }

        console.log('-> Checking borne / bornes table...');
        const borneTableResult = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name IN ('borne', 'bornes')
        `);
        const existingBorneTables = borneTableResult.rows.map((row) => row.table_name);

        if (existingBorneTables.includes('bornes') && !existingBorneTables.includes('borne')) {
            console.log('-> Renaming bornes table to borne...');
            await pool.query(`ALTER TABLE bornes RENAME TO borne`);

            const legacyConstraintResult = await pool.query(`
                SELECT conname
                FROM pg_constraint
                WHERE conrelid = 'borne'::regclass AND conname = 'bornes_station_fk'
                LIMIT 1
            `);

            if (legacyConstraintResult.rows.length > 0) {
                await pool.query(`ALTER TABLE borne RENAME CONSTRAINT bornes_station_fk TO borne_station_fk`);
            }
        } else {
            console.log('-> Creating borne table if missing...');
            await pool.query(`
                CREATE TABLE IF NOT EXISTS borne (
                    id_b SERIAL PRIMARY KEY,
                    station_id UUID NOT NULL,
                    charging_speed_kw NUMERIC,
                    average_duration_hours NUMERIC,
                    tarif NUMERIC,
                    CONSTRAINT borne_station_fk FOREIGN KEY (station_id) REFERENCES stations(id) ON DELETE CASCADE
                )
            `);
        }

        console.log('-> Ensuring reservations.borne_id exists...');
        const reservationBorneColumnResult = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'reservations'
              AND column_name = 'borne_id'
            LIMIT 1
        `);

        if (reservationBorneColumnResult.rows.length === 0) {
            await pool.query(`ALTER TABLE reservations ADD COLUMN borne_id INTEGER`);
        }

        const reservationBorneFkResult = await pool.query(`
            SELECT conname
            FROM pg_constraint
            WHERE conrelid = 'reservations'::regclass
              AND conname = 'reservations_borne_fk'
            LIMIT 1
        `);

        if (reservationBorneFkResult.rows.length === 0) {
            await pool.query(`
                ALTER TABLE reservations
                ADD CONSTRAINT reservations_borne_fk
                FOREIGN KEY (borne_id) REFERENCES borne(id_b) ON DELETE SET NULL
            `);
        }

        console.log('-> Ensuring stations opening hours exist...');
        const stationHoursColumnsResult = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'stations'
              AND column_name IN ('heur_ouverture', 'heur_fermeture')
        `);
        const existingStationHoursColumns = stationHoursColumnsResult.rows.map((row) => row.column_name);

        if (!existingStationHoursColumns.includes('heur_ouverture')) {
            await pool.query(`ALTER TABLE stations ADD COLUMN heur_ouverture TIME NOT NULL DEFAULT '08:00:00'`);
        }

        if (!existingStationHoursColumns.includes('heur_fermeture')) {
            await pool.query(`ALTER TABLE stations ADD COLUMN heur_fermeture TIME NOT NULL DEFAULT '20:00:00'`);
        }

        await pool.query(`UPDATE stations SET heur_ouverture = COALESCE(heur_ouverture, '08:00:00'::time)`);
        await pool.query(`UPDATE stations SET heur_fermeture = COALESCE(heur_fermeture, '20:00:00'::time)`);

        const stationColumnsResult = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'stations'
              AND column_name IN ('charging_speed_kw', 'average_duration_hours', 'tariff', 'tarif', 'capacity')
        `);
        const existingStationColumns = stationColumnsResult.rows.map(row => row.column_name);

        if (existingStationColumns.length > 0) {
            console.log('-> Seeding borne from existing stations data...');
            const seedColumns = [];
            if (existingStationColumns.includes('charging_speed_kw')) seedColumns.push('charging_speed_kw');
            if (existingStationColumns.includes('average_duration_hours')) seedColumns.push('average_duration_hours');
            if (existingStationColumns.includes('tariff')) seedColumns.push('tariff');
            if (existingStationColumns.includes('tarif')) seedColumns.push('tarif');

            if (seedColumns.length > 0) {
                const existingBorneCount = await pool.query('SELECT COUNT(*)::int AS count FROM borne');
                if (existingBorneCount.rows[0].count === 0) {
                    const columnsList = seedColumns.join(', ');
                    const selectColumns = `id, ${columnsList}`;
                    const seedResult = await pool.query(`SELECT ${selectColumns} FROM stations`);

                    for (const row of seedResult.rows) {
                        await pool.query(
                            `INSERT INTO borne (station_id, charging_speed_kw, average_duration_hours, tarif)
                             VALUES ($1, $2, $3, $4)`,
                            [
                                row.id,
                                row.charging_speed_kw ?? null,
                                row.average_duration_hours ?? null,
                                row.tariff ?? row.tarif ?? null
                            ]
                        );
                    }
                } else {
                    console.log('-> Borne table already contains data; skipping station seeding.');
                }
            }

            console.log('-> Dropping legacy station columns...');
            await pool.query(`ALTER TABLE stations DROP COLUMN IF EXISTS charging_speed_kw`);
            await pool.query(`ALTER TABLE stations DROP COLUMN IF EXISTS average_duration_hours`);
            await pool.query(`ALTER TABLE stations DROP COLUMN IF EXISTS tariff`);
            await pool.query(`ALTER TABLE stations DROP COLUMN IF EXISTS tarif`);
            await pool.query(`ALTER TABLE stations DROP COLUMN IF EXISTS capacity`);
        }

        console.log('-> Dropping foreign_otps table if exists...');
        await pool.query('DROP TABLE IF EXISTS foreign_otps CASCADE');

        console.log('-> Dropping foreign_requests table if exists...');
        await pool.query('DROP TABLE IF EXISTS foreign_requests CASCADE');

        console.log('--- MIGRATION COMPLETE ---');

    } catch (err) {
        console.error('Migration failed:', err);
        console.error('Stack:', err.stack);
    } finally {
        pool.end();
    }
}

runMigration();
