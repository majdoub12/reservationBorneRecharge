const pool = require('../config/db');
const { generateOTP } = require('../utils/otpGenerator');
const { generateToken } = require('../utils/jwt');
const { sendEmail } = require('../utils/emailService');
const { queryExternalSystem } = require('../utils/mockExternalSystem');
const twilio = require('twilio');

let vehicleModelColumnReady = null;

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

async function issueForeignOTP(vehicleId, email, phone) {
  await pool.query(
    'UPDATE otps SET expired = true WHERE vehicle_id = $1 AND is_used = false',
    [vehicleId]
  );

  const otpCode = generateOTP();
  await pool.query(
    'INSERT INTO otps (vehicle_id, code, expired, is_used) VALUES ($1, $2, false, false)',
    [vehicleId, otpCode]
  );

  console.log(`[OTP] Issued foreign OTP for vehicle=${vehicleId}`);

  const deliveryErrors = [];

  try {
    await dispatchOTP({ type: 'email', value: email }, otpCode);
  } catch (e) {
    deliveryErrors.push(`email: ${e.message}`);
    console.warn('Email OTP send failed:', e.message);
  }

  if (phone) {
    try {
      await dispatchOTP({ type: 'phone', value: phone }, otpCode);
    } catch (e) {
      deliveryErrors.push(`whatsapp: ${e.message}`);
      console.warn('WhatsApp send failed:', e.message);
    }
  }

  return { otpCode, deliveryErrors };
}

async function ensureForeignVehicleContacts(contactOwnerKey, email, phone) {
  if (email) {
    const existingEmail = await pool.query(
      'SELECT id FROM emails WHERE owner_id=$1 AND address=$2 LIMIT 1',
      [contactOwnerKey, email]
    );

    if (existingEmail.rows.length === 0) {
      await pool.query(
        'INSERT INTO emails (owner_id, address, is_active) VALUES ($1, $2, TRUE)',
        [contactOwnerKey, email]
      );
    } else {
      await pool.query(
        'UPDATE emails SET is_active=TRUE WHERE id=$1',
        [existingEmail.rows[0].id]
      );
    }
  }

  if (phone) {
    const existingPhone = await pool.query(
      'SELECT id FROM telephones WHERE owner_id=$1 AND number=$2 LIMIT 1',
      [contactOwnerKey, phone]
    );

    if (existingPhone.rows.length === 0) {
      await pool.query(
        'INSERT INTO telephones (owner_id, number, is_active) VALUES ($1, $2, TRUE)',
        [contactOwnerKey, phone]
      );
    } else {
      await pool.query(
        'UPDATE telephones SET is_active=TRUE WHERE id=$1',
        [existingPhone.rows[0].id]
      );
    }
  }
}

async function vehicleHasModelColumn() {
  if (vehicleModelColumnReady !== null) {
    return vehicleModelColumnReady;
  }

  const result = await pool.query(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'model'
    LIMIT 1
  `);

  vehicleModelColumnReady = result.rows.length > 0;
  return vehicleModelColumnReady;
}

async function fetchVehicleIdentityById(vehicleId) {
  const hasModelColumn = await vehicleHasModelColumn();
  const selectColumns = ['id', 'immatricul', 'vin', 'owner_id'];

  if (hasModelColumn) {
    selectColumns.push('model');
  }

  const result = await pool.query(
    `SELECT ${selectColumns.join(', ')} FROM vehicles WHERE id=$1 LIMIT 1`,
    [vehicleId]
  );

  return result.rows[0] || null;
}

function getContactOwnerKey(vehicle) {
  return vehicle?.owner_id || vehicle?.id || null;
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
    const contactOwnerKey = getContactOwnerKey(vehicle);

    const emailResult = await pool.query(
      'SELECT address AS value FROM emails WHERE owner_id=$1',
      [contactOwnerKey]
    );

    const phoneResult = await pool.query(
      'SELECT number AS value FROM telephones WHERE owner_id=$1',
      [contactOwnerKey]
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

    const normalizedMatricule = matricule.trim().toUpperCase();
    const normalizedVin = vin.trim().toUpperCase();

    // 2. Check if vehicle already exists locally (either foreign or local)
    const existingVehicleResult = await pool.query(
      'SELECT * FROM vehicles WHERE UPPER(vin) = $1 OR UPPER(immatricul) = $2 LIMIT 1',
      [normalizedVin, normalizedMatricule]
    );

    if (existingVehicleResult.rows.length > 0) {
      const existingVehicle = existingVehicleResult.rows[0];
      if (!existingVehicle.is_foreign) {
        return res.status(409).json({
          message: 'Vehicle already exists as local vehicle',
          status: 'already_registered_local'
        });
      }

      await ensureForeignVehicleContacts(getContactOwnerKey(existingVehicle), email, phone);

      const existingStatus = existingVehicle.is_temporary ? 'pending_approval' : 'approved';
      const existingMessage = existingVehicle.is_temporary
        ? 'This foreign vehicle has already been submitted and is still waiting for back-office approval.'
        : 'This foreign vehicle is already approved. You can proceed directly to OTP verification.';

      if (!existingVehicle.is_temporary) {
        const { deliveryErrors } = await issueForeignOTP(existingVehicle.id, email, phone);

        return res.json({
          message: existingMessage,
          vehicleId: existingVehicle.id,
          existing: true,
          status: existingStatus,
          is_foreign: existingVehicle.is_foreign,
          is_temporary: existingVehicle.is_temporary,
          deliveryWarnings: deliveryErrors
        });
      }

      return res.json({
        message: existingMessage,
        vehicleId: existingVehicle.id,
        existing: true,
        status: existingStatus,
        is_foreign: existingVehicle.is_foreign,
        is_temporary: existingVehicle.is_temporary
      });
    }

    // 3. Save temporary foreign vehicle record (for approval flow)

    // 3. Create owner record for foreign vehicle
    const newOwnerResult = await pool.query(
      'INSERT INTO owners (national_id) VALUES ($1) RETURNING national_id',
      [email] // use email as national_id for foreign owners
    );
    const foreignOwnerId = newOwnerResult.rows[0].national_id;


    const newVehicleResult = await pool.query(
      'INSERT INTO vehicles (immatricul, vin, is_foreign, is_temporary  , owner_id) VALUES ($1, $2, TRUE, TRUE,$3) RETURNING *',
      [normalizedMatricule, normalizedVin , foreignOwnerId]
    );
    const tempVehicle = newVehicleResult.rows[0];

    await ensureForeignVehicleContacts(getContactOwnerKey(tempVehicle), email, phone);

    // 4. Ask back-office to validate the foreign vehicle
    const approveUrl = `http://localhost:5000/api/auth/foreign/approve?matricule=${encodeURIComponent(matricule)}&vin=${encodeURIComponent(vin)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`;
    const rejectUrl = `http://localhost:5000/api/auth/foreign/reject?matricule=${encodeURIComponent(matricule)}&vin=${encodeURIComponent(vin)}`;

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

    res.json({
      message: 'Foreign vehicle request sent to back-office for validation',
      vehicleId: tempVehicle.id,
      status: 'pending'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─── Back-office Approve ──────────────────────────────────────────────────────
exports.foreignApprove = async (req, res) => {
  const { matricule, vin, email, phone } = req.query;

  if (!matricule || !vin || !email) {
    return res.status(400).send('Missing required query params');
  }

  try {
    const normalizedMatricule = matricule.trim().toUpperCase();
    const normalizedVin = vin.trim().toUpperCase();

    // Ensure the vehicle exists or create it in the vehicles table
    let vehicleResult = await pool.query(
      'SELECT * FROM vehicles WHERE UPPER(immatricul) = $1 OR UPPER(vin) = $2 LIMIT 1',
      [normalizedMatricule, normalizedVin]
    );

    let vehicle;
    if (vehicleResult.rows.length === 0) {

       const newOwnerResult = await pool.query(
          'INSERT INTO owners (national_id) VALUES ($1) RETURNING national_id',
          [email]
        );
        const foreignOwnerId = newOwnerResult.rows[0].national_id;

      const insertResult = await pool.query(
        'INSERT INTO vehicles (immatricul, vin, is_foreign, is_temporary, owner_id) VALUES ($1, $2, TRUE, FALSE, $3) RETURNING *',
    [normalizedMatricule, normalizedVin, foreignOwnerId]
      );
      vehicle = insertResult.rows[0];
    } else {
      vehicle = vehicleResult.rows[0];
      if (!vehicle.is_foreign) {
        return res.status(409).send('Vehicle exists as local vehicle');
      }
      await pool.query('UPDATE vehicles SET is_temporary = FALSE WHERE id = $1', [vehicle.id]);
    }

    await ensureForeignVehicleContacts(getContactOwnerKey(vehicle), email, phone);

    const { deliveryErrors } = await issueForeignOTP(vehicle.id, email, phone);

    res.send(`
      <div style="font-family:sans-serif;text-align:center;padding:3rem;">
        <h2 style="color:#1a7a4a;">Approved</h2>
        <p>OTP has been sent to <strong>${email}</strong>${phone ? ` and <strong>${phone}</strong>` : ''}.</p>
        ${deliveryErrors.length ? `<p style="color:#b45309;font-size:0.9rem;">Delivery warning: ${deliveryErrors.join(' | ')}</p>` : ''}
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
  const { matricule, vin } = req.query;

  const normalizedMatricule = matricule?.trim().toUpperCase();
  const normalizedVin = vin?.trim().toUpperCase();

  if (normalizedMatricule && normalizedVin) {
    const vehicleResult = await pool.query(
      'SELECT * FROM vehicles WHERE UPPER(immatricul) = $1 OR UPPER(vin) = $2 LIMIT 1',
      [normalizedMatricule, normalizedVin]
    );

    if (vehicleResult.rows.length > 0) {
      const vehicle = vehicleResult.rows[0];
      if (vehicle.is_foreign && vehicle.is_temporary) {
        await pool.query('DELETE FROM vehicles WHERE id = $1', [vehicle.id]);
      }
    }
  }

  res.send(`
    <div style="font-family:sans-serif;text-align:center;padding:3rem;">
      <h2 style="color:#c0392b;">Rejected</h2>
      <p>Vehicle <strong>${matricule}</strong> has been rejected.</p>
      <p style="color:#888;font-size:0.9rem;">You can close this tab.</p>
    </div>
  `);
};

// ─── Verify OTP (Tunisian) ────────────────────────────────────────────────────
// ─── Verify OTP (Tunisian) ────────────────────────────────────────────────────
exports.verifyOTP = async (req, res) => {
  const { vehicleId, code } = req.body;

  try {
    const vehicle = await fetchVehicleIdentityById(vehicleId);
    const immatricul = vehicle?.immatricul || null;

    const result = await pool.query(
      `SELECT *, 
       (created_at > NOW() - INTERVAL '5 minutes') as is_fresh
       FROM otps 
       WHERE vehicle_id=$1 AND code=$2 AND is_used=false AND expired=false`,
      [vehicleId, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or already used OTP' });
    }

    const otp = result.rows[0];

    if (!otp.is_fresh) {
      await pool.query('DELETE FROM otps WHERE id=$1', [otp.id]);
      return res.status(400).json({ message: 'OTP expired' });
    }

    await pool.query('DELETE FROM otps WHERE id=$1', [otp.id]);

    // ── Get token from Keycloak ──────────────────────────────────────────────
    const vin = vehicle?.vin || null;

    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: 'vehicle-frontend',
      username: immatricul.toLowerCase(), // Keycloak username is the immatricul in lowercase
      password: vin,
    });

    const keycloakRes = await fetch(
      'http://localhost:8080/realms/vehicle-app/protocol/openid-connect/token',
      { method: 'POST', body: params }
    );

    // ✅ Read body ONCE only
    const keycloakData = await keycloakRes.json();

    if (!keycloakRes.ok) {
      console.error('Keycloak error:', keycloakData);
      return res.status(500).json({ 
        message: 'OTP verified but authentication service failed. Please try again.'
      });
    }

   res.json({
      message: 'OTP verified successfully',
      token: keycloakData.access_token,
      refresh_token: keycloakData.refresh_token,
      vehicleId: vehicleId, // ← add this
    });
    // ────────────────────────────────────────────────────────────────────────

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }

};

// ─── Verify Foreign OTP ───────────────────────────────────────────────────────
exports.verifyForeignOTP = async (req, res) => {
  const { vehicleId, email, code } = req.body;
  let targetVehicleId = vehicleId;

  try {
    // ✅ Fixed: Find vehicle.id by email, not owner_id
if (!targetVehicleId) {
  if (!email) {
    return res.status(400).json({ message: 'vehicleId or email is required' });
  }

  // Join emails → owners → vehicles to get the actual vehicle.id (INTEGER)
  const vehicleRes = await pool.query(
    `SELECT v.id 
     FROM vehicles v
     INNER JOIN owners o ON v.owner_id = o.national_id
     INNER JOIN emails e ON o.national_id = e.owner_id
     WHERE e.address = $1 AND v.is_foreign = TRUE
     ORDER BY v.id DESC 
     LIMIT 1`,
    [email]
  );

  if (vehicleRes.rows.length === 0) {
    return res.status(404).json({ message: 'No foreign vehicle found for this email' });
  }
  
  targetVehicleId = vehicleRes.rows[0].id; // ← Now this is an INTEGER (vehicle.id)
  console.log(`[verifyForeignOTP] Resolved vehicle_id=${targetVehicleId} for email=${email}`);
}

    const otpResult = await pool.query(
      `SELECT *, 
       (created_at > NOW() - INTERVAL '5 minutes') as is_fresh
       FROM otps 
       WHERE vehicle_id=$1 AND code=$2 AND is_used=false AND expired=false`,
      [targetVehicleId, code]
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or already used OTP' });
    }

    const otp = otpResult.rows[0];

    if (!otp.is_fresh) {
      await pool.query('DELETE FROM otps WHERE id=$1', [otp.id]);

      // Delete temporary foreign vehicle if OTP expired and it is not yet verified
      const vehicleResult = await pool.query('SELECT * FROM vehicles WHERE id=$1', [targetVehicleId]);
      if (vehicleResult.rows.length > 0 && vehicleResult.rows[0].is_foreign && vehicleResult.rows[0].is_temporary) {
        await pool.query('DELETE FROM vehicles WHERE id=$1', [targetVehicleId]);
      }

      return res.status(400).json({ message: 'OTP expired' });
    }

    await pool.query('UPDATE otps SET is_used=true WHERE id=$1', [otp.id]);

    await pool.query('UPDATE vehicles SET is_temporary=false WHERE id=$1 AND is_foreign=TRUE', [targetVehicleId]);

    const vehicle = await fetchVehicleIdentityById(targetVehicleId);
    const token = generateToken({
      vehicleId: targetVehicleId,
      immatricul: vehicle?.immatricul || null,
      model: vehicle?.model || null,
      foreign: true
    });

    res.json({ 
      message: 'OTP verified successfully', 
      token,
      vehicleId: targetVehicleId  // add this
    });

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
    const vehicle = await fetchVehicleIdentityById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const contactOwnerKey = getContactOwnerKey(vehicle);

    if (contact.type === 'email') {
      const result = await pool.query(
        'INSERT INTO emails(owner_id, address) VALUES($1, $2) RETURNING id, address AS value',
        [contactOwnerKey, contact.value]
      );

      return res.json({
        message: 'Contact added successfully',
        contact: { id: result.rows[0].id, type: 'email', value: result.rows[0].value }
      });
    } else {
      const result = await pool.query(
        'INSERT INTO telephones(owner_id, number) VALUES($1, $2) RETURNING id, number AS value',
        [contactOwnerKey, contact.value]
      );

      return res.json({
        message: 'Contact added successfully',
        contact: { id: result.rows[0].id, type: 'phone', value: result.rows[0].value }
      });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding contact' });
  }
};


exports.deleteContact = async (req, res) => {
  const { vehicleId, contactId, contact } = req.body;

  if (!vehicleId || (!contactId && (!contact?.type || !contact?.value))) {
    return res.status(400).json({ message: 'Missing identifiers' });
  }

  try {
    const vehicle = await fetchVehicleIdentityById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const contactOwnerKey = getContactOwnerKey(vehicle);
    let deleteResult = null;

    if (contactId) {
      deleteResult = await pool.query(
        'DELETE FROM emails WHERE id=$1 AND owner_id=$2 RETURNING id',
        [contactId, contactOwnerKey]
      );

      if (deleteResult.rowCount === 0) {
        deleteResult = await pool.query(
          'DELETE FROM telephones WHERE id=$1 AND owner_id=$2 RETURNING id',
          [contactId, contactOwnerKey]
        );
      }
    } else if (contact.type === 'email') {
      deleteResult = await pool.query(
        'DELETE FROM emails WHERE owner_id=$1 AND address=$2 RETURNING id',
        [contactOwnerKey, contact.value]
      );
    } else {
      deleteResult = await pool.query(
        'DELETE FROM telephones WHERE owner_id=$1 AND number=$2 RETURNING id',
        [contactOwnerKey, contact.value]
      );
    }

    if (!deleteResult || deleteResult.rowCount === 0) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted', deleted: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting contact' });
  }
};

exports.updateContact = async (req, res) => {
  const { vehicleId, contactId, currentType, contact } = req.body;

  if (!vehicleId || !contactId || !currentType || !contact?.type || !contact?.value) {
    return res.status(400).json({ message: 'Missing identifiers' });
  }

  try {
    const vehicle = await fetchVehicleIdentityById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const contactOwnerKey = getContactOwnerKey(vehicle);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      let updatedContact = null;

      if (currentType === contact.type) {
        if (contact.type === 'email') {
          const updateResult = await client.query(
            'UPDATE emails SET address=$1 WHERE id=$2 AND owner_id=$3 RETURNING id, address AS value',
            [contact.value, contactId, contactOwnerKey]
          );

          if (updateResult.rowCount === 0) {
            throw new Error('Contact not found');
          }

          updatedContact = { id: updateResult.rows[0].id, type: 'email', value: updateResult.rows[0].value };
        } else {
          const updateResult = await client.query(
            'UPDATE telephones SET number=$1 WHERE id=$2 AND owner_id=$3 RETURNING id, number AS value',
            [contact.value, contactId, contactOwnerKey]
          );

          if (updateResult.rowCount === 0) {
            throw new Error('Contact not found');
          }

          updatedContact = { id: updateResult.rows[0].id, type: 'phone', value: updateResult.rows[0].value };
        }
      } else {
        let deleteResult = null;

        if (currentType === 'email') {
          deleteResult = await client.query(
            'DELETE FROM emails WHERE id=$1 AND owner_id=$2 RETURNING id',
            [contactId, contactOwnerKey]
          );
        } else {
          deleteResult = await client.query(
            'DELETE FROM telephones WHERE id=$1 AND owner_id=$2 RETURNING id',
            [contactId, contactOwnerKey]
          );
        }

        if (deleteResult.rowCount === 0) {
          throw new Error('Contact not found');
        }

        if (contact.type === 'email') {
          const insertResult = await client.query(
            'INSERT INTO emails(owner_id, address) VALUES($1, $2) RETURNING id, address AS value',
            [contactOwnerKey, contact.value]
          );

          updatedContact = { id: insertResult.rows[0].id, type: 'email', value: insertResult.rows[0].value };
        } else {
          const insertResult = await client.query(
            'INSERT INTO telephones(owner_id, number) VALUES($1, $2) RETURNING id, number AS value',
            [contactOwnerKey, contact.value]
          );

          updatedContact = { id: insertResult.rows[0].id, type: 'phone', value: insertResult.rows[0].value };
        }
      }

      await client.query('COMMIT');
      return res.json({
        message: 'Contact updated successfully',
        contact: updatedContact
      });
    } catch (updateError) {
      await client.query('ROLLBACK');
      throw updateError;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    if (err.message === 'Contact not found') {
      return res.status(404).json({ message: 'Contact not found' });
    }
    res.status(500).json({ message: 'Error updating contact' });
  }
};


exports.getContacts = async (req, res) => {
  const { vehicleId } = req.params;
  if (!vehicleId) return res.status(400).json({ message: 'Vehicle ID required' });

  try {
    // If vehicleId is not a number, try to find by matricule
    let vehicle;
    if (isNaN(vehicleId)) {
      return res.status(400).json({ message: 'Invalid vehicle ID' });
    } else {
      vehicle = await fetchVehicleIdentityById(vehicleId);
    }

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const contactOwnerKey = getContactOwnerKey(vehicle);

    const emailResult = await pool.query(
      'SELECT id, address AS value FROM emails WHERE owner_id=$1',
      [contactOwnerKey]
    );
    const phoneResult = await pool.query(
      'SELECT id, number AS value FROM telephones WHERE owner_id=$1',
      [contactOwnerKey]
    );

    const contacts = [
      ...emailResult.rows.map(r => ({ ...r, type: 'email' })),
      ...phoneResult.rows.map(r => ({ ...r, type: 'phone' }))
    ];

    res.json({
      contacts,
      vehicleId: vehicle.id,
      plate: vehicle.immatricul || null,
      vin: vehicle.vin || null,
      model: vehicle.model || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching contacts' });
  }
};



// ─── Fetch vehicle by matricule (for Keycloak token validation) ───────────────
async function fetchVehicleByImmatricul(immatricul) {
  const hasModelColumn = await vehicleHasModelColumn();
  const selectColumns = ['id', 'immatricul', 'vin', 'owner_id'];
  if (hasModelColumn) selectColumns.push('model');

  const result = await pool.query(
    `SELECT ${selectColumns.join(', ')} FROM vehicles WHERE UPPER(immatricul)=$1 LIMIT 1`,
    [immatricul.toUpperCase()]
  );
  return result.rows[0] || null;
}


// ─── Get current vehicle from Keycloak token ──────────────────────────────────
exports.getMyVehicle = async (req, res) => {
  try {
    // preferred_username = matricule (set by Keycloak)
    const immatricul = req.user.preferred_username?.toUpperCase();
    if (!immatricul) {
      return res.status(401).json({ message: 'Invalid token: no username' });
    }

    const vehicle = await fetchVehicleByImmatricul(immatricul);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json({
      vehicleId: vehicle.id,
      immatricul: vehicle.immatricul,
      model: vehicle.model || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};