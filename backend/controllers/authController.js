const pool = require('../config/db');
const { generateOTP } = require('../utils/otpGenerator');
const { generateToken } = require('../utils/jwt');
const { sendEmail } = require('../utils/emailService');
const { queryExternalSystem } = require('../utils/mockExternalSystem');
const twilio = require('twilio');

// ─── Twilio lazy init ─────────────────────────────────────────────────────────
function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) {
    throw new Error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in .env');
  }
  return twilio(accountSid, authToken);
}

// ─── Shared: dispatch OTP via email or WhatsApp ───────────────────────────────
async function dispatchOTP(contact, otpCode) {
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
    const twilioClient = getTwilioClient();
    const from = process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
      ? process.env.TWILIO_WHATSAPP_NUMBER
      : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;
    const to = contact.value.startsWith('whatsapp:')
      ? contact.value
      : `whatsapp:${contact.value}`;

    await twilioClient.messages.create({
      from,
      to,
      body: `Your IDD verification code is: ${otpCode}. It expires in 5 minutes.`,
    });
    console.log(`[WhatsApp] OTP sent to ${contact.value}`);
  }
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

    res.json({ message: 'Vehicle found', vehicleId: vehicle.id, contacts });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Send OTP (Tunisian flow) ─────────────────────────────────────────────────
exports.sendOTP = async (req, res) => {
  const { vehicleId, contact } = req.body;

  if (!vehicleId || !contact?.type || !contact?.value) {
    return res.status(400).json({ message: 'vehicleId and contact are required' });
  }

  try {
    await pool.query(
      'UPDATE otps SET expired=true WHERE vehicle_id=$1 AND is_used=false',
      [vehicleId]
    );

    const otpCode = generateOTP();
    await pool.query(
      'INSERT INTO otps (vehicle_id, code, expired, is_used) VALUES ($1, $2, false, false)',
      [vehicleId, otpCode]
    );

    await dispatchOTP(contact, otpCode);

    res.json({ message: 'OTP sent successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

// ─── Foreign Car Auth ─────────────────────────────────────────────────────────
exports.foreignAuth = async (req, res) => {
  const { matricule, vin, email, phone } = req.body;

  if (!matricule || !vin || !email || !phone) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    // 1. Query mock external system
    const car = queryExternalSystem(matricule, vin);

    if (!car) {
      return res.status(404).json({ message: 'Vehicle not found in external system' });
    }

    // 2. Send back-office validation email
    const approveUrl = `http://localhost:5000/api/auth/foreign/approve?matricule=${encodeURIComponent(matricule)}&vin=${encodeURIComponent(vin)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`;
    const rejectUrl = `http://localhost:5000/api/auth/foreign/reject?matricule=${encodeURIComponent(matricule)}`;

    await sendEmail(
      process.env.EMAIL_USER,
      '[Back-office] Foreign vehicle validation request',
      `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #1a1a1a;">Foreign vehicle validation request</h2>
          <p>A user is requesting access with the following foreign vehicle:</p>
          <table style="width:100%; border-collapse: collapse; margin: 1rem 0;">
            <tr><td style="padding:8px; background:#f4f3ef; font-weight:500;">Matricule</td><td style="padding:8px;">${matricule}</td></tr>
            <tr><td style="padding:8px; background:#f4f3ef; font-weight:500;">VIN</td><td style="padding:8px;">${vin}</td></tr>
            <tr><td style="padding:8px; background:#f4f3ef; font-weight:500;">Country</td><td style="padding:8px;">${car.country}</td></tr>
            <tr><td style="padding:8px; background:#f4f3ef; font-weight:500;">Email</td><td style="padding:8px;">${email}</td></tr>
            <tr><td style="padding:8px; background:#f4f3ef; font-weight:500;">Phone</td><td style="padding:8px;">${phone}</td></tr>
          </table>
          <div style="margin-top:1.5rem; display:flex; gap:1rem;">
            <a href="${approveUrl}" style="
              padding:12px 28px; background:#1a7a4a; color:white;
              text-decoration:none; border-radius:8px; font-weight:500;
            ">Approve</a>
            <a href="${rejectUrl}" style="
              padding:12px 28px; background:#c0392b; color:white;
              text-decoration:none; border-radius:8px; font-weight:500; margin-left:12px;
            ">Reject</a>
          </div>
        </div>
      `
    );

    res.json({ message: 'Request sent to back-office for validation. Please wait.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Back-office Approve ──────────────────────────────────────────────────────
exports.foreignApprove = async (req, res) => {
  const { matricule, vin, email, phone } = req.query;

  try {
    const otpCode = generateOTP();

    // Send OTP via email
    await dispatchOTP({ type: 'email', value: email }, otpCode);

    // Send OTP via WhatsApp if phone provided
    if (phone) {
      try {
        await dispatchOTP({ type: 'phone', value: phone }, otpCode);
      } catch (e) {
        console.warn('WhatsApp send failed, email OTP already sent:', e.message);
      }
    }

    // Store OTP in foreign_otps table
    await pool.query(
      `INSERT INTO foreign_otps (matricule, vin, email, phone, code)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET code=$5, created_at=NOW()`,
      [matricule, vin, email, phone, otpCode]
    );

    res.send(`
      <div style="font-family:sans-serif;text-align:center;padding:3rem;">
        <h2 style="color:#1a7a4a;">Approved</h2>
        <p>OTP has been sent to <strong>${email}</strong> and <strong>${phone}</strong>.</p>
        <p style="color:#888;font-size:0.9rem;">You can close this tab.</p>
      </div>
    `);

  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing approval');
  }
};

// ─── Back-office Reject ───────────────────────────────────────────────────────
exports.foreignReject = async (req, res) => {
  const { matricule } = req.query;

  res.send(`
    <div style="font-family:sans-serif;text-align:center;padding:3rem;">
      <h2 style="color:#c0392b;">Rejected</h2>
      <p>Vehicle <strong>${matricule}</strong> has been rejected.</p>
      <p style="color:#888;font-size:0.9rem;">You can close this tab.</p>
    </div>
  `);
};

// ─── Verify OTP (Tunisian) ────────────────────────────────────────────────────
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

// ─── Verify Foreign OTP ───────────────────────────────────────────────────────
exports.verifyForeignOTP = async (req, res) => {
  const { email, code } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM foreign_otps WHERE email=$1 AND code=$2',
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    const otp = result.rows[0];

    const now = new Date().getTime();
    const createdAt = new Date(otp.created_at + 'Z').getTime();
    const diffMinutes = (now - createdAt) / (1000 * 60);

    if (diffMinutes > 5) {
      await pool.query('DELETE FROM foreign_otps WHERE email=$1', [email]);
      return res.status(400).json({ message: 'OTP expired' });
    }

    await pool.query('DELETE FROM foreign_otps WHERE email=$1', [email]);

    const token = generateToken({ email, foreign: true });

    res.json({ message: 'OTP verified successfully', token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.addContact = async (req, res) => {
  const { vehicleId, contact } = req.body;

  if (!vehicleId || !contact?.type || !contact?.value) {
    return res.status(400).json({ message: 'Invalid data' });
  }

  try {
    if (contact.type === 'email') {
      await pool.query(
        'INSERT INTO emails(vehicle_id, address) VALUES($1, $2)',
        [vehicleId, contact.value]
      );
    } else {
      await pool.query(
        'INSERT INTO telephones(vehicle_id, number) VALUES($1, $2)',
        [vehicleId, contact.value]
      );
    }

    res.json({ message: 'Contact added successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding contact' });
  }
};


exports.deleteContact = async (req, res) => {
  const { vehicleId, contact } = req.body;

  if (!vehicleId || !contact?.type || !contact?.value) {
    return res.status(400).json({ message: 'Missing identifiers' });
  }

  try {
    if (contact.type === 'email') {
      await pool.query(
        'DELETE FROM emails WHERE vehicle_id=$1 AND address=$2',
        [vehicleId, contact.value]
      );
    } else {
      await pool.query(
        'DELETE FROM telephones WHERE vehicle_id=$1 AND number=$2',
        [vehicleId, contact.value]
      );
    }

    res.json({ message: 'Contact deleted' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting contact' });
  }
};

exports.getContacts = async (req, res) => {
  const { vehicleId } = req.params;
  if (!vehicleId) return res.status(400).json({ message: 'Vehicle ID required' });

  try {
    const emailResult = await pool.query('SELECT id, address AS value FROM emails WHERE vehicle_id=$1', [vehicleId]);
    const phoneResult = await pool.query('SELECT id, number AS value FROM telephones WHERE vehicle_id=$1', [vehicleId]);

    const contacts = [
      ...emailResult.rows.map(r => ({ ...r, type: 'email' })),
      ...phoneResult.rows.map(r => ({ ...r, type: 'phone' }))
    ];
    res.json({ contacts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching contacts' });
  }
};