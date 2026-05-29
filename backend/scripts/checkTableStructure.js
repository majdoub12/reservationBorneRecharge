const pool = require('../config/db');

async function checkTableStructure() {
    console.log('--- CHECKING TABLE STRUCTURE ---');

    try {
        // Check if owners table exists and its structure
        const tableResult = await pool.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_name = 'owners' AND table_schema = 'public'
        `);

        if (tableResult.rows.length === 0) {
            console.log('-> owners table does not exist');
            return;
        }

        console.log('-> owners table exists');

        // Check columns in owners table
        const columnsResult = await pool.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'owners' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);

        console.log('-> owners table columns:');
        columnsResult.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}, nullable: ${col.is_nullable}, default: ${col.column_default}`);
        });

        // Check if vehicles table has owner_id column
        const vehicleColumnsResult = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'vehicles' AND column_name = 'owner_id'
        `);

        if (vehicleColumnsResult.rows.length > 0) {
            console.log('-> vehicles.owner_id exists:', vehicleColumnsResult.rows[0]);
        } else {
            console.log('-> vehicles.owner_id does not exist');
        }

    } catch (err) {
        console.error('Error checking table structure:', err);
    } finally {
        pool.end();
    }
}

checkTableStructure();