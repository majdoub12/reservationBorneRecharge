const pool = require('../config/db');
const { generateOTP } = require('../utils/otpGenerator');
const { generateToken } = require('../utils/jwt');
const { sendEmail } = require('../utils/emailService');

// ─── Tunisian Car Auth ────────────────────────────────────────────────────────
exports.tunisianAuth = async (req, res) => {
  const { immatricul, vin } = req.body;

  try {
    const vehicleResult = await pool.query(
      'SELECT * FROM vehicles WHERE immatricul=$1 AND vin=$2',
      [immatricul, vin]
    );

    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const vehicle = vehicleResult.rows[0];

    const emailResult = await pool.query(
      'SELECT address AS value FROM emails WHERE vehicle_id=$1',
      [vehicle.id]
    );

    const phoneResult = await pool.query(
      'SELECT number AS value FROM telephones WHERE vehicle_id=$1',
      [vehicle.id]
    );

    const contacts = [
      ...emailResult.rows.map((r) => ({ type: 'email', value: r.value })),
      ...phoneResult.rows.map((r) => ({ type: 'phone', value: r.value })),
    ];

    res.json({
      message: 'Vehicle found',
      vehicleId: vehicle.id,
      contacts,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Send OTP to chosen contact ───────────────────────────────────────────────
exports.sendOTP = async (req, res) => {
  const { vehicleId, contact } = req.body;

  try {
    // Expire old unused OTPs
    await pool.query(
      'UPDATE otps SET expired=true WHERE vehicle_id=$1 AND is_used=false',
      [vehicleId]
    );

    // Generate and store new OTP
    const otpCode = generateOTP();
    await pool.query(
      'INSERT INTO otps (vehicle_id, code , expired , is_used) VALUES ($1, $2 , false , false)',
      [vehicleId, otpCode]
    );

    // Send OTP
    if (contact.type === 'email') {
      await sendEmail(
        contact.value,
        'Your IDD verification code',
        `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
            <h2 style="color: #1a1a1a;">Your verification code</h2>
            <p style="color: #555;">Use the code below to verify your vehicle.
            It expires in <strong>5 minutes</strong>.</p>
            <div style="
              font-size: 2.5rem;
              font-weight: 600;
              letter-spacing: 0.3em;
              text-align: center;
              padding: 1.5rem;
              background: #f4f3ef;
              border-radius: 12px;
              color: #1a1a1a;
              margin: 1.5rem 0;
            ">${otpCode}</div>
            <p style="color: #aaa; font-size: 0.85rem;">
              If you did not request this code, please ignore this email.
            </p>
          </div>
        `
      );
    } else {
      // TODO: plug in SMS service (Twilio, etc.)
      console.log(`[SMS] OTP ${otpCode} → ${contact.value}`);
    }

    res.json({ message: 'OTP sent successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

// ─── Foreign Car Auth ─────────────────────────────────────────────────────────
exports.foreignAuth = async (req, res) => {
  const { immatricul, vin, email, phone } = req.body;

  const otpCode = generateOTP();
  console.log(`[FOREIGN] OTP ${otpCode} for vehicle ${immatricul}`);

  res.json({ message: 'Foreign OTP generated', otp: otpCode });
};

// ─── Verify OTP ───────────────────────────────────────────────────────────────
exports.verifyOTP = async (req, res) => {
  const { vehicleId, code } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM otps WHERE vehicle_id=$1 AND code=$2 AND is_used=false AND expired=false',
      [vehicleId, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or already used OTP' });
    }

    const otp = result.rows[0];

    const now = new Date().getTime();
    const createdAt = new Date(otp.created_at + 'Z').getTime();
    const diffMinutes = (now - createdAt) / (1000 * 60);

    if (diffMinutes > 5) {
      await pool.query('DELETE FROM otps WHERE id=$1', [otp.id]);
      return res.status(400).json({ message: 'OTP expired' });
    }

    await pool.query('DELETE FROM otps WHERE id=$1', [otp.id]);

    const token = generateToken({ vehicleId });

    res.json({ message: 'OTP verified successfully', token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};