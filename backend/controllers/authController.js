const pool = require('../config/db');
const { generateOTP } = require('../utils/otpGenerator');
const { generateToken } = require('../utils/jwt');
const { sendEmail } = require('../utils/emailService');

//for the sms otp
const twilio = require('twilio');

console.log("TWILIO NUMBER:", process.env.TWILIO_WHATSAPP_NUMBER);

// Lazy-initialize Twilio client to avoid crash if env vars are missing at startup
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in .env');
  }
  return twilio(accountSid, authToken);
}

// ─── Tunisian Car Auth ────────────────────────────────────────────────────────
exports.tunisianAuth = async (req, res) => {
  const { immatricul, vin } = req.body;

  if (!immatricul || !vin) {
    return res.status(400).json({ message: 'License plate and VIN are required' });
  }

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

  if (!vehicleId || !contact || !contact.type || !contact.value) {
    return res.status(400).json({ message: 'vehicleId and contact are required' });
  }

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
    } else if (contact.type === 'phone') {
            try {
              const twilioClient = getTwilioClient();

              const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

              // 🔥 SAFETY CHECK
              if (!twilioWhatsappNumber) {
                console.error("❌ TWILIO_WHATSAPP_NUMBER is undefined. Check your .env");
                return res.status(500).json({ message: 'WhatsApp config error' });
              }

              const fromNumber = twilioWhatsappNumber.startsWith('whatsapp:')
                ? twilioWhatsappNumber
                : `whatsapp:${twilioWhatsappNumber}`;

              const toNumber = contact.value.startsWith('whatsapp:')
                ? contact.value
                : `whatsapp:${contact.value}`;

              const message = await twilioClient.messages.create({
                from: fromNumber,
                to: toNumber,
                body: `Your IDD verification code is: ${otpCode}. It expires in 5 minutes.`
              });

              console.log("✅ MESSAGE SID:", message.sid);

            } catch (err) {
              console.error("FULL TWILIO ERROR:", err.message);
              console.error("CODE:", err.code);
              console.error("MORE INFO:", err.moreInfo);

              return res.status(500).json({ message: 'Failed to send OTP via WhatsApp' });
            }
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


