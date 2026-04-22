const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

const verifyConnection = async () => {
    const client = await pool.connect();
    try {
        client.on('error', (err) => {
            console.error('Unexpected error on checked-out client', err);
        });

        console.log('Connected to Supabase database!');
    } finally {
        client.release();
    }
};

verifyConnection().catch((err) => {
    console.error('Connection error', err);
});

module.exports = pool;
