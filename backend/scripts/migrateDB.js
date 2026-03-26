const pool = require('../config/db');

async function runMigration() {
    console.log('--- STARTING MIGRATION ---');
    try {
        console.log('-> Checking current vehicles table schema...');

        // Check if columns already exist
        const columnsResult = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'vehicles' AND column_name IN ('is_foreign', 'is_temporary')
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

        console.log('--- MIGRATION COMPLETE ---');

    } catch (err) {
        console.error('Migration failed:', err);
        console.error('Stack:', err.stack);
    } finally {
        pool.end();
    }
}

runMigration();
