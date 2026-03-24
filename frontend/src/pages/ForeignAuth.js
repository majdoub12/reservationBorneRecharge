import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ForeignAuth.css';
import { COUNTRIES } from '../utils/constants';

function ForeignAuth() {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    matricule: '',
    vin: '',
    email: '',
    phone: '',
  });
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'matricule' || name === 'vin' ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const fullPhone = `${selectedCountry.code}${formData.phone.replace(/\D/g, '')}`;

    if (formData.phone.length < 5) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/foreign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: fullPhone
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Request failed.');
        setLoading(false);
        return;
      }

      setStep(2);
    } catch (err) {
      setError('Cannot reach server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="foreign-auth">
      <div className="auth-background-grid" />
      <div className="auth-ambient auth-ambient-left" />
      <div className="auth-ambient auth-ambient-right" />
      <div className="foreign-card">
        <div className="card-shine" />

        <div className="foreign-header">
          <div className="foreign-kicker">International charging route</div>
          <div className="foreign-badge">INT</div>
          <h1>Foreign vehicle reservation gateway</h1>
          <p>Designed for non-Tunisian registered vehicles with guided contact intake.</p>
        </div>

        {step === 1 && (
          <form onSubmit={handleSubmit} className="foreign-form">
            <div className="field-group">
              <label htmlFor="matricule">License plate</label>
              <input
                id="matricule"
                name="matricule"
                type="text"
                placeholder="e.g. AB-123-CD"
                value={formData.matricule}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="vin">Chassis number (VIN)</label>
              <input
                id="vin"
                name="vin"
                type="text"
                placeholder="e.g. WBA3A5C51CF256651"
                value={formData.vin}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field-divider">
              <span>Your contact information</span>
            </div>

            <div className="field-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="e.g. your@email.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="phone">WhatsApp number</label>

              <div className="phone-input-container" ref={dropdownRef}>
                <div
                  className={`country-selector ${showDropdown ? 'active' : ''}`}
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <span className="current-flag">{selectedCountry.flag}</span>
                  <span className="current-code">{selectedCountry.code}</span>
                  <span className="dropdown-arrow">v</span>

                  {showDropdown && (
                    <div className="country-dropdown">
                      {COUNTRIES.map((c) => (
                        <div
                          key={c.iso}
                          className="country-option"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedCountry(c);
                            setShowDropdown(false);
                          }}
                        >
                          <span className="opt-flag">{c.flag}</span>
                          <span className="opt-name">{c.name}</span>
                          <span className="opt-code">{c.code}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="e.g. 21 555 158"
                  value={formData.phone}
                  onChange={handleChange}
                  onFocus={() => setShowDropdown(false)}
                  required
                />
              </div>
            </div>

            {error && <p className="error-msg">{error}</p>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit request'}
            </button>

            <p className="tunisian-link">
              Tunisian vehicle?{' '}
              <span onClick={() => navigate('/tunisian-auth')}>
                Use Tunisian car flow
              </span>
            </p>
          </form>
        )}

        {step === 2 && (
          <div className="waiting-step">
            <div className="waiting-icon">SYNC</div>
            <h2>Request submitted</h2>
            <p>
              Your vehicle details have been sent to our back-office team
              for validation. Once approved, you will receive your OTP at:
            </p>
            <div className="contact-summary">
              <div className="contact-summary-item">
                <span className="label">Email</span>
                <span className="value">{formData.email}</span>
              </div>
              <div className="contact-summary-item">
                <span className="label">WhatsApp</span>
                <span className="value">{selectedCountry.code} {formData.phone}</span>
              </div>
            </div>
            <p className="waiting-note">
              This usually takes just a few minutes.
              Keep this page open or check your email and WhatsApp.
            </p>

            <button
              className="btn-primary"
              onClick={() =>
                navigate('/verify-foreign-otp', {
                  state: { email: formData.email },
                })
              }
            >
              I received my OTP, verify now
            </button>

            <button className="btn-back" onClick={() => setStep(1)}>
              Back and edit details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForeignAuth;
