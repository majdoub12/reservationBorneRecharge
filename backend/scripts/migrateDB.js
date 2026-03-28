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

        console.log('-> Dropping foreign_otps table if exists...');
        await pool.query('DROP TABLE IF EXISTS foreign_otps CASCADE');

        console.log('-> Ensuring foreign_requests table exists...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS foreign_requests (
                id SERIAL PRIMARY KEY,
                matricule VARCHAR(255) NOT NULL,
                vin VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(255),
                vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                CONSTRAINT foreign_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected')),
                CONSTRAINT foreign_requests_matricule_vin_unique UNIQUE (matricule, vin)
            )
        `);

        console.log('--- MIGRATION COMPLETE ---');

    } catch (err) {
        console.error('Migration failed:', err);
        console.error('Stack:', err.stack);
    } finally {
        pool.end();
    }
}

runMigration();
