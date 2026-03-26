require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');

const pool = require('./config/db');

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('API is running...');
});

app.use('/api/auth', authRoutes); 

const reservationRoutes = require('./routes/reservationRouter');
app.use('/api/reservations', reservationRoutes);


const PORT = process.env.PORT || 5000;


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
