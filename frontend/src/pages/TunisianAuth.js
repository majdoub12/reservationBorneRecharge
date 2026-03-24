import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './TunisianAuth.css';

function TunisianAuth() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(1);
  const [immatricul, setImmatricul] = useState('');
  const [vin, setVin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contacts, setContacts] = useState([]);
  const [vehicleId, setVehicleId] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);

  const fileInputRef = useRef();

  const fetchResume = useCallback(async (vId) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/auth/contacts/${vId}`);
      const data = await res.json();
      if (res.ok) {
        setContacts(data.contacts);
        if (data.plate) setImmatricul(data.plate);
        if (data.vin) setVin(data.vin);
        setStep(2);
      }
    } catch (e) {
      console.error('Failed to resume:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const state = location.state;
    if (state?.vehicleId) {
      setVehicleId(state.vehicleId);
      if (state.step === 2) {
        fetchResume(state.vehicleId);
      }
    }
  }, [location.state, fetchResume]);

  const handleIdentify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/tunisian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immatricul, vin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Vehicle not found.');
        setLoading(false);
        return;
      }

      setVehicleId(data.vehicleId);
      setContacts(data.contacts);
      setStep(2);
    } catch (err) {
      setError('Cannot reach server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!selectedContact) {
      setError('Please select a contact to receive the OTP.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, contact: selectedContact }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to send OTP.');
        setLoading(false);
        return;
      }

      navigate('/verify-otp', { state: { vehicleId } });
    } catch (err) {
      setError('Cannot reach server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOCR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('http://localhost:5000/api/auth/ocr', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError('OCR failed. Please enter details manually.');
        setLoading(false);
        return;
      }

      if (data.immatricul) setImmatricul(data.immatricul);
      if (data.vin) setVin(data.vin);
    } catch (err) {
      setError('OCR service unavailable. Please enter details manually.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tunisian-auth">
      <div className="auth-background-grid" />
      <div className="auth-ambient auth-ambient-left" />
      <div className="auth-ambient auth-ambient-right" />
      <div className="auth-card">
        <div className="card-shine" />

        <div className="auth-header">
          <div className="auth-badge">TN</div>
          <h1>Vehicle identification gateway</h1>
          <p>Tunisian registered vehicles for secure charging reservation access.</p>
        </div>

        <div className="progress-bar">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
            <span>1</span>
            <label>Identify</label>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <span>2</span>
            <label>Contact</label>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
            <span>3</span>
            <label>Verify</label>
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleIdentify} className="auth-form">
            <div className="field-group">
              <label htmlFor="immatricul">License plate</label>
              <input
                id="immatricul"
                type="text"
                placeholder="e.g. 123 TU 4567"
                value={immatricul}
                onChange={(e) => setImmatricul(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="vin">Chassis number (VIN)</label>
              <input
                id="vin"
                type="text"
                placeholder="e.g. 1HGCM82633A123456"
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                required
              />
            </div>

            <button
              type="button"
              className="btn-ocr"
              onClick={() => fileInputRef.current.click()}
              disabled={loading}
            >
              <span className="ocr-icon">[]</span>
              Scan document with OCR
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleOCR}
            />

            {error && <p className="error-msg">{error}</p>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Checking...' : 'Identify vehicle'}
            </button>

            <p className="foreign-link">
              Foreign vehicle?{' '}
              <span onClick={() => navigate('/auth/foreign')}>
                Use foreign car flow
              </span>
            </p>
          </form>
        )}

        {step === 2 && (
          <div className="contact-step">
            <h2>Choose where to receive your OTP</h2>
            <p className="contact-hint">
              Select an email or phone number linked to this vehicle.
            </p>

            <div className="contact-list">
              {contacts.length === 0 && (
                <p className="no-contacts">No contacts found for this vehicle.</p>
              )}
              {contacts.map((contact, i) => (
                <div
                  key={i}
                  className={`contact-item ${selectedContact === contact ? 'selected' : ''}`}
                  onClick={() => setSelectedContact(contact)}
                >
                  <div className="contact-type-badge">
                    {contact.type === 'email' ? 'E' : 'W'}
                  </div>
                  <div className="contact-value">
                    <span className="contact-type">{contact.type}</span>
                    <span className="contact-text">{contact.value}</span>
                  </div>
                  <div className="contact-check">
                    {selectedContact === contact && <span>OK</span>}
                  </div>
                </div>
              ))}
            </div>

            <p className="manage-link">
              Need to update contacts?{' '}
              <span onClick={() => navigate('/manage-contacts', { state: { vehicleId } })}>
                Manage contact info
              </span>
            </p>

            {error && <p className="error-msg">{error}</p>}

            <div className="step2-actions">
              <button className="btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                className="btn-primary"
                onClick={handleSendOTP}
                disabled={loading || !selectedContact}
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TunisianAuth;
