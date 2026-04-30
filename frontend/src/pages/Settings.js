import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Settings.css';
import { COUNTRIES } from '../utils/constants';
import AppSidebar from '../components/AppSidebar';
import { getVehicleFromToken } from '../utils/authVehicle';
import { applyTheme, getStoredTheme } from '../utils/theme';
import { Trash2, X } from 'lucide-react';

function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const vehicleId = location.state?.vehicleId || getVehicleFromToken()?.id;
  const [theme, setTheme] = useState(getStoredTheme());

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newContact, setNewContact] = useState({ type: 'email', value: '' });
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchContacts = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/auth/contacts/${vehicleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setContacts(data.contacts);
      } else {
        setError(data.message || 'Failed to load contacts');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) {
      navigate('/tunisian-auth');
      return;
    }
    fetchContacts();
  }, [vehicleId, navigate, fetchContacts]);

  const handleThemeChange = (nextTheme) => {
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const handleAddContact = async () => {
    setError('');
    let finalValue = newContact.value;
    if (newContact.type === 'phone') {
      const cleanNum = newContact.value.replace(/\D/g, '');
      if (cleanNum.length < 5) return setError('Invalid phone number');
      finalValue = `${selectedCountry.code}${cleanNum}`;
    } else if (!newContact.value.includes('@')) {
      return setError('Invalid email address');
    }

    setActionLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/auth/add-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ vehicleId, contact: { type: newContact.type, value: finalValue } })
      });

      if (res.ok) {
        setNewContact({ type: 'email', value: '' });
        setSelectedCountry(COUNTRIES[0]);
        setShowDropdown(false);
        fetchContacts();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to add contact');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (type, value) => {
    if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

    setActionLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/auth/delete-contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ vehicleId, contact: { type, value } })
      });

      if (res.ok) {
        fetchContacts();
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to delete contact');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="settings-loading">Loading your settings...</div>;

  return (
    <div className="settings-page">
      <div className="settings-layout">
        <AppSidebar />

        <div className="settings-content">
          {error && <div className="settings-error">{error}</div>}

          <section className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <h2>Theme</h2>
              </div>
              <div className="theme-toggle">
                <button
                  className={theme === 'dark' ? 'active' : ''}
                  onClick={() => handleThemeChange('dark')}
                >
                  Dark
                </button>
                <button
                  className={theme === 'light' ? 'active' : ''}
                  onClick={() => handleThemeChange('light')}
                >
                  Light
                </button>
              </div>
            </div>
            <p className="settings-panel-copy">
              Your theme preference is stored on this device and applied automatically the next time you open the app.
            </p>
          </section>

          <section className="settings-panel">
            <div className="settings-panel-header">
              <div>
                <h2>Contacts</h2>
              </div>
            </div>

            <div className="contacts-editor-grid">
              <div className="contacts-pane">
                <div className="contacts-list">
                  {contacts.length === 0 ? (
                    <p className="no-contacts">No contacts found for this vehicle.</p>
                  ) : (
                    contacts.map((c, idx) => (
                      <div key={idx} className="contact-card">
                        <div className="contact-info">
                          <span className={`contact-badge ${c.type}`}>
                            {c.type === 'email' ? 'email' : 'whatsapp'}
                          </span>
                          <span className="contact-value">{c.value}</span>
                        </div>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(c.type, c.value)}
                          disabled={actionLoading}
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="editor-pane">
                <div className="add-contact-form">
                  <div className="editor-head-row">
                    <div>
                      <h3>New Contact Info</h3>
                      <p>Add a new email or WhatsApp number for OTP delivery.</p>
                    </div>
                    <button
                      type="button"
                      className="btn-mini-reset"
                      onClick={() => {
                        setNewContact({ type: 'email', value: '' });
                        setSelectedCountry(COUNTRIES[0]);
                        setShowDropdown(false);
                      }}
                    >
                      <X size={14} />
                      Reset
                    </button>
                  </div>

                  <div className="type-toggle">
                    <button
                      type="button"
                      className={newContact.type === 'email' ? 'active' : ''}
                      onClick={() => setNewContact({ ...newContact, type: 'email' })}
                    >
                      Email
                    </button>
                    <button
                      type="button"
                      className={newContact.type === 'phone' ? 'active' : ''}
                      onClick={() => setNewContact({ ...newContact, type: 'phone' })}
                    >
                      WhatsApp
                    </button>
                  </div>

                  <div className="input-group">
                    {newContact.type === 'phone' && (
                      <div className="country-picker" onClick={() => setShowDropdown(!showDropdown)}>
                        <span>{selectedCountry.flag}</span>
                        {showDropdown && (
                          <div className="country-menu">
                            {COUNTRIES.map((c) => (
                              <div
                                key={c.iso}
                                onClick={() => {
                                  setSelectedCountry(c);
                                  setShowDropdown(false);
                                }}
                              >
                                {c.flag} {c.code}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    <input
                      placeholder={newContact.type === 'email' ? 'email@example.com' : '55 123 456'}
                      value={newContact.value}
                      onChange={(e) => setNewContact({ ...newContact, value: e.target.value })}
                    />
                  </div>

                  <div className="form-actions">
                    <button className="btn-add" onClick={handleAddContact} disabled={actionLoading}>
                      {actionLoading ? 'Saving...' : 'Save Contact'}
                    </button>
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => {
                        setNewContact({ type: 'email', value: '' });
                        setSelectedCountry(COUNTRIES[0]);
                        setShowDropdown(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Settings;
