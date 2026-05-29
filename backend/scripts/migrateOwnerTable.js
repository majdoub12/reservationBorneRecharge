const pool = require('../config/db');

async function runMigration() {
    console.log('--- STARTING OWNER TABLE MIGRATION ---');

    try {
        // Step 0: Drop all existing FKs to allow type changes
        console.log('-> Dropping existing FKs...');
        await pool.query(`ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_owner_id_fkey`);
        await pool.query(`ALTER TABLE emails DROP CONSTRAINT IF EXISTS emails_owner_id_fkey`);
        await pool.query(`ALTER TABLE telephones DROP CONSTRAINT IF EXISTS telephones_owner_id_fkey`);
        console.log('-> FKs dropped');

        // Step 1: Create or adapt owners table
        console.log('-> Ensuring owners table exists with national_id primary key...');
        const ownersTableResult = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'owners' AND table_schema = 'public'
        `);

        const ownerColumns = ownersTableResult.rows.map(row => row.column_name);

        if (ownerColumns.length === 0) {
            await pool.query(`
                CREATE TABLE owners (
                    national_id VARCHAR(20) PRIMARY KEY,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            `);
            console.log('-> owners table created');
        } else {
            console.log('-> owners table exists, columns:', ownerColumns);
            if (ownerColumns.includes('id') && !ownerColumns.includes('national_id')) {
                console.log('-> Renaming id to national_id...');
                await pool.query(`ALTER TABLE owners RENAME COLUMN id TO national_id`);
            }
            // Always ensure national_id is VARCHAR(20)
            const nationalIdTypeResult = await pool.query(`
                SELECT data_type, character_maximum_length
                FROM information_schema.columns
                WHERE table_name = 'owners' AND column_name = 'national_id'
            `);
            const typeInfo = nationalIdTypeResult.rows[0];
            console.log('-> national_id type:', typeInfo);
            if (typeInfo.data_type !== 'character varying' || typeInfo.character_maximum_length !== 20) {
                console.log('-> Converting national_id to VARCHAR(20)...');
                // First, change to text type
                await pool.query(`ALTER TABLE owners ALTER COLUMN national_id TYPE text USING national_id::text`);
                // Then truncate values to 20 chars
                await pool.query(`UPDATE owners SET national_id = LEFT(national_id, 20) WHERE LENGTH(national_id) > 20`);
                // Then change to VARCHAR(20)
                await pool.query(`ALTER TABLE owners ALTER COLUMN national_id TYPE VARCHAR(20)`);
                await pool.query(`ALTER TABLE owners ALTER COLUMN national_id DROP DEFAULT`);
                await pool.query(`ALTER TABLE owners DROP CONSTRAINT IF EXISTS owners_pkey`);
                await pool.query(`ALTER TABLE owners ADD PRIMARY KEY (national_id)`);
                console.log('-> national_id converted to VARCHAR(20)');
            } else {
                console.log('-> national_id is already VARCHAR(20)');
            }
        }

        // Step 2: Add owner_id column to vehicles table
        console.log('-> Adding owner_id to vehicles table...');
        const ownerIdColumnResult = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'vehicles' AND column_name = 'owner_id'
        `);

        if (ownerIdColumnResult.rows.length === 0) {
            await pool.query(`
                ALTER TABLE vehicles
                ADD COLUMN owner_id VARCHAR(20)
            `);
            console.log('-> owner_id column added to vehicles');
        } else {
            const typeInfo = ownerIdColumnResult.rows[0];
            console.log('-> vehicles.owner_id type:', typeInfo);
            if (typeInfo.data_type !== 'character varying') {
                console.log('-> Converting vehicles.owner_id to VARCHAR(20)...');
                await pool.query(`ALTER TABLE vehicles ALTER COLUMN owner_id TYPE text USING owner_id::text`);
                await pool.query(`UPDATE vehicles SET owner_id = LEFT(owner_id, 20) WHERE owner_id IS NOT NULL AND LENGTH(owner_id) > 20`);
                await pool.query(`ALTER TABLE vehicles ALTER COLUMN owner_id TYPE VARCHAR(20)`);
                console.log('-> vehicles.owner_id converted to VARCHAR(20)');
            } else {
                console.log('-> vehicles.owner_id is already VARCHAR(20)');
            }
        }

        // Step 3: Add owner_id to emails table
        console.log('-> Adding owner_id to emails table...');
        const emailOwnerColumnResult = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'emails' AND column_name = 'owner_id'
        `);

        if (emailOwnerColumnResult.rows.length === 0) {
            await pool.query(`
                ALTER TABLE emails
                ADD COLUMN owner_id VARCHAR(20)
            `);
            console.log('-> owner_id column added to emails');
        } else {
            const typeInfo = emailOwnerColumnResult.rows[0];
            console.log('-> emails.owner_id type:', typeInfo);
            if (typeInfo.data_type !== 'character varying') {
                console.log('-> Converting emails.owner_id to VARCHAR(20)...');
                await pool.query(`ALTER TABLE emails ALTER COLUMN owner_id TYPE text USING owner_id::text`);
                await pool.query(`UPDATE emails SET owner_id = LEFT(owner_id, 20) WHERE owner_id IS NOT NULL AND LENGTH(owner_id) > 20`);
                await pool.query(`ALTER TABLE emails ALTER COLUMN owner_id TYPE VARCHAR(20)`);
                console.log('-> emails.owner_id converted to VARCHAR(20)');
            } else {
                console.log('-> emails.owner_id is already VARCHAR(20)');
            }
        }

        // Step 4: Add owner_id to telephones table
        console.log('-> Adding owner_id to telephones table...');
        const phoneOwnerColumnResult = await pool.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'telephones' AND column_name = 'owner_id'
        `);

        if (phoneOwnerColumnResult.rows.length === 0) {
            await pool.query(`
                ALTER TABLE telephones
                ADD COLUMN owner_id VARCHAR(20)
            `);
            console.log('-> owner_id column added to telephones');
        } else {
            const typeInfo = phoneOwnerColumnResult.rows[0];
            console.log('-> telephones.owner_id type:', typeInfo);
            if (typeInfo.data_type !== 'character varying') {
                console.log('-> Converting telephones.owner_id to VARCHAR(20)...');
                await pool.query(`ALTER TABLE telephones ALTER COLUMN owner_id TYPE text USING owner_id::text`);
                await pool.query(`UPDATE telephones SET owner_id = LEFT(owner_id, 20) WHERE owner_id IS NOT NULL AND LENGTH(owner_id) > 20`);
                await pool.query(`ALTER TABLE telephones ALTER COLUMN owner_id TYPE VARCHAR(20)`);
                console.log('-> telephones.owner_id converted to VARCHAR(20)');
            } else {
                console.log('-> telephones.owner_id is already VARCHAR(20)');
            }
        }

        // Note: Existing data in emails and telephones tables will have NULL owner_id
        // The application should handle migrating this data when owners are created

        // Step 5: Create indexes for better performance
        console.log('-> Creating indexes...');
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_vehicles_owner_id ON vehicles(owner_id)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_emails_owner_id ON emails(owner_id)
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_telephones_owner_id ON telephones(owner_id)
        `);

        // Step 6: Add foreign key constraints
        console.log('-> Adding FK constraints...');
        await pool.query(`ALTER TABLE vehicles ADD CONSTRAINT vehicles_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES owners(national_id)`);
        await pool.query(`ALTER TABLE emails ADD CONSTRAINT emails_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES owners(national_id)`);
        await pool.query(`ALTER TABLE telephones ADD CONSTRAINT telephones_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES owners(national_id)`);
        console.log('-> FK constraints added');

        // Step 8: Optional - Drop old vehicle_id columns from emails and telephones
        // (Commented out for safety - can be done in a separate migration after testing)
        /*
        console.log('-> Dropping old vehicle_id columns...');
        await pool.query(`ALTER TABLE emails DROP COLUMN IF EXISTS vehicle_id`);
        await pool.query(`ALTER TABLE telephones DROP COLUMN IF EXISTS vehicle_id`);
        */

        console.log('--- OWNER TABLE MIGRATION COMPLETE ---');
        console.log('Note: owner table uses national_id as primary key.');
        console.log('Existing emails and telephones data will have NULL owner_id until owners are created.');
        console.log('The application should handle creating owners and migrating contact data accordingly.');
        console.log('vehicle_id columns in emails and telephones tables are kept for backward compatibility.');
        console.log('You can drop them in a future migration after updating all application code.');

    } catch (err) {
        console.error('Migration failed:', err);
        console.error('Stack:', err.stack);
        throw err;
    } finally {
        pool.end();
    }
}

runMigration();