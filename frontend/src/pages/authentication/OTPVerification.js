import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './OTPVerification.css';

function OTPVerification() {
  const navigate = useNavigate();
  const location = useLocation();
  const { vehicleId, plate = '', vin = '' } = location.state || {};

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (!vehicleId) {
      navigate('/tunisian-auth');
    }
  }, [vehicleId, navigate]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Verification failed.');
        setDigits(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      navigate('/reservation');
    } catch (err) {
      setError('Cannot reach server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-page">
      <div className="auth-background-grid" />
      <div className="auth-ambient auth-ambient-left" />
      <div className="auth-ambient auth-ambient-right" />
      <div className="otp-card">
        <div className="card-shine" />

        <div className="otp-header">
          <div className="otp-kicker">Secure tunnel</div>
          <div className="otp-icon">OTP</div>
          <h1>Validate charging access</h1>
          <p>Enter the 6-digit code sent to your selected vehicle contact.</p>
        </div>

        <div className={`otp-timer ${timeLeft <= 60 ? 'urgent' : ''}`}>
          {timeLeft > 0 ? (
            <>Code expires in <strong>{formatTime(timeLeft)}</strong></>
          ) : (
            <span className="expired">Code expired. Go back and request a new one.</span>
          )}
        </div>

        <div className="otp-inputs" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={d ? 'filled' : ''}
              autoFocus={i === 0}
            />
          ))}
        </div>

        {error && <p className="otp-error">{error}</p>}

        <button
          className="btn-verify"
          onClick={handleVerify}
          disabled={loading || timeLeft <= 0 || digits.join('').length < 6}
        >
          {loading ? 'Verifying...' : 'Verify code'}
        </button>

        <div className="otp-footer">
          <button
            className="btn-back-otp"
            onClick={() => navigate('/tunisian-auth', { state: { vehicleId, plate, vin, step: 2 } })}
          >
            Back and change contact
          </button>
        </div>
      </div>
    </div>
  );
}

export default OTPVerification;
