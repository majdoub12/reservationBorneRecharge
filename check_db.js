const pool = require('./backend/config/db');

pool.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicles')`)
  .then(res => {
    console.log('Vehicles table exists:', res.rows[0].exists);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
