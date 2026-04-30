import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronDown,
  CirclePlus,
  Info,
  Loader2,
  Mail,
  PencilLine,
  Phone,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { COUNTRIES } from '../../utils/constants';
import { getVehicleFromToken } from '../../utils/authVehicle';
import './ManageContactInfo.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const fadeSlide = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -16, transition: { duration: 0.25 } },
};

const contactLabel = (type) => (type === 'email' ? 'Email' : 'WhatsApp');

const parsePhoneValue = (value) => {
  const normalized = String(value || '').replace(/^whatsapp:/i, '').trim();
  const match = [...COUNTRIES].sort((left, right) => right.code.length - left.code.length)
    .find((country) => normalized.startsWith(country.code));

  if (!match) {
    return {
      country: COUNTRIES[0],
      localNumber: normalized.replace(/\D/g, ''),
    };
  }

  return {
    country: match,
    localNumber: normalized.slice(match.code.length).replace(/\D/g, ''),
  };
};

const ManageContactInfo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const tokenVehicle = useMemo(() => getVehicleFromToken(), []);

  const vehicleId = location.state?.vehicleId || tokenVehicle?.id || null;
  const plate = location.state?.plate || tokenVehicle?.matricule || '';
  const vin = location.state?.vin || tokenVehicle?.payload?.vin || '';
  const model = location.state?.model || tokenVehicle?.model || '';

  const returnState = useMemo(
    () => ({
      vehicleId,
      plate,
      vin,
      step: 2,
    }),
    [vehicleId, plate, vin]
  );

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingContact, setEditingContact] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [newContact, setNewContact] = useState({ type: 'email', value: '' });

  const loadContacts = useCallback(
    async ({ silent = false } = {}) => {
      if (!vehicleId) {
        return;
      }

      if (silent) {
        setSaving(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const headers = {};
        const token = localStorage.getItem('token');
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE}/api/auth/contacts/${vehicleId}`, {
          headers,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load contacts');
        }

        setContacts(data.contacts || []);
      } catch (loadError) {
        setError(loadError.message || 'Unable to load contact information.');
      } finally {
        if (silent) {
          setSaving(false);
        } else {
          setLoading(false);
        }
      }
    },
    [vehicleId]
  );

  useEffect(() => {
    if (!vehicleId) {
      navigate('/tunisian-auth', { replace: true });
      return;
    }

    loadContacts();
  }, [vehicleId, navigate, loadContacts]);

  const resetForm = useCallback((nextType = 'email') => {
    setEditingContact(null);
    setNewContact({ type: nextType, value: '' });
    setSelectedCountry(COUNTRIES[0]);
    setShowDropdown(false);
  }, []);

  const beginAdd = useCallback((nextType = 'email') => {
    setSuccess('');
    resetForm(nextType);
  }, [resetForm]);

  const beginEdit = useCallback((contact) => {
    setSuccess('');
    setError('');
    setEditingContact(contact);
    setShowDropdown(false);

    if (contact.type === 'phone') {
      const parsed = parsePhoneValue(contact.value);
      setSelectedCountry(parsed.country);
      setNewContact({
        type: 'phone',
        value: parsed.localNumber,
      });
      return;
    }

    setSelectedCountry(COUNTRIES[0]);
    setNewContact({
      type: 'email',
      value: contact.value || '',
    });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    const trimmedValue = newContact.value.trim();
    let finalValue = trimmedValue;

    if (newContact.type === 'phone') {
      const cleanDigits = trimmedValue.replace(/\D/g, '');
      if (cleanDigits.length < 5) {
        setError('Please enter a valid phone number.');
        return;
      }

      finalValue = `${selectedCountry.code}${cleanDigits}`;
    } else if (!trimmedValue.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('token');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const endpoint = editingContact ? '/update-contact' : '/add-contact';
      const payload = editingContact
        ? {
            vehicleId,
            contactId: editingContact.id,
            currentType: editingContact.type,
            contact: {
              type: newContact.type,
              value: finalValue,
            },
          }
        : {
            vehicleId,
            contact: {
              type: newContact.type,
              value: finalValue,
            },
          };

      const response = await fetch(`${API_BASE}/api/auth${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save contact');
      }

      setSuccess(editingContact ? 'Contact updated successfully.' : 'Contact added successfully.');
      resetForm();
      await loadContacts({ silent: true });
    } catch (submitError) {
      setError(submitError.message || 'Unable to save the contact.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (contact) => {
    if (saving) {
      return;
    }

    const confirmed = window.confirm(`Delete this ${contactLabel(contact.type)} contact?`);
    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('token');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE}/api/auth/delete-contact`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          vehicleId,
          contactId: contact.id,
          contact: {
            type: contact.type,
            value: contact.value,
          },
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete contact');
      }

      if (editingContact?.id === contact.id) {
        resetForm();
      }

      setSuccess('Contact deleted successfully.');
      await loadContacts({ silent: true });
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete the contact.');
    } finally {
      setSaving(false);
    }
  };

  const vehicleLabel = plate || tokenVehicle?.matricule || 'Vehicle';
  const contactCount = contacts.length;

  if (loading) {
    return (
      <div className="manage-contact-page">
        <div className="manage-contact-loading">Loading your contact vault...</div>
      </div>
    );
  }

  return (
    <div className="manage-contact-page">
      <div className="manage-contact-glow manage-contact-glow-left" />
      <div className="manage-contact-glow manage-contact-glow-right" />
      <div className="manage-contact-gridline" />

      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
        onClick={() => navigate('/tunisian-auth', { state: returnState })}
        className="manage-contact-back"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </motion.button>

      <motion.main
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="manage-contact-shell"
      >
        <section className="manage-contact-card">
          <motion.div {...fadeSlide} className="manage-contact-header">
            <div className="manage-contact-header-left">
              <div className="manage-contact-kicker">
                <ShieldCheck className="h-4 w-4" />
                Secure contact vault
              </div>

              <div className="manage-contact-brand">
                <div className="manage-contact-mark">TN</div>
                <div>
                  <h1>Manage contact info</h1>
                  <p>Add, edit, or delete the contacts used to receive OTP codes.</p>
                </div>
              </div>
            </div>

            <div className="manage-contact-chip-row">
              <span className="manage-contact-chip">{vehicleLabel}</span>
              {vin && <span className="manage-contact-chip">VIN {String(vin).slice(0, 8)}...</span>}
              {model && <span className="manage-contact-chip">{model}</span>}
              <span className="manage-contact-chip">{contactCount} contacts</span>
            </div>
          </motion.div>

          <div className="manage-contact-stats">
            <div className="manage-contact-stat">
              <span>Vehicle</span>
              <strong>{vehicleLabel}</strong>
            </div>
            <div className="manage-contact-stat">
              <span>Contacts</span>
              <strong>{contactCount} OTP destinations</strong>
            </div>
            <div className="manage-contact-stat">
              <span>Mode</span>
              <strong>{editingContact ? 'Editing a contact' : 'Adding a new contact'}</strong>
            </div>
          </div>

          <AnimatePresence>
            {(error || success) && (
              <motion.div
                key={error ? 'error' : 'success'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`manage-contact-alert ${error ? 'is-error' : 'is-success'}`}
              >
                {error || success}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="manage-contact-layout">
            <section className="manage-contact-panel manage-contact-panel-list">
              <div className="manage-contact-panel-head">
                <div>
                  <span className="manage-contact-section-tag">Contacts</span>
                  <h2>Current OTP destinations</h2>
                </div>

                <button type="button" className="manage-contact-add" onClick={() => beginAdd('email')}>
                  <CirclePlus className="h-4 w-4" />
                  Add new
                </button>
              </div>

              <div className="manage-contact-list">
                {contacts.length === 0 ? (
                  <div className="manage-contact-empty">
                    <div className="manage-contact-empty-icon">
                      <Mail className="h-5 w-5" />
                    </div>
                    <h3>No contacts yet</h3>
                    <p>Add an email or a WhatsApp number so the OTP step has somewhere to send codes.</p>
                    <button type="button" className="manage-contact-secondary-btn" onClick={() => beginAdd('email')}>
                      Create contact
                    </button>
                  </div>
                ) : (
                  contacts.map((contact, index) => {
                    const typeIcon = contact.type === 'email' ? Mail : Phone;
                    const TypeIcon = typeIcon;

                    return (
                      <motion.article
                        key={contact.id || `${contact.type}-${contact.value}-${index}`}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.99 }}
                        className="manage-contact-item"
                      >
                        <div className="manage-contact-item-main">
                          <div className="manage-contact-item-badge">
                            <TypeIcon className="h-3.5 w-3.5" />
                            {contactLabel(contact.type)}
                          </div>
                          <div className="manage-contact-item-value">{contact.value}</div>
                          <p>This contact can receive OTP codes for the selected vehicle.</p>
                        </div>

                        <div className="manage-contact-item-actions">
                          <button type="button" className="manage-contact-action-btn" onClick={() => beginEdit(contact)}>
                            <PencilLine className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="manage-contact-action-btn is-danger"
                            onClick={() => handleDelete(contact)}
                            disabled={saving}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </motion.article>
                    );
                  })
                )}
              </div>
            </section>

            <section className="manage-contact-panel manage-contact-panel-editor">
              <div className="manage-contact-panel-head">
                <div>
                  <span className="manage-contact-section-tag">Editor</span>
                  <h2>{editingContact ? 'Edit contact' : 'Add a contact'}</h2>
                </div>

                {editingContact && (
                  <button type="button" className="manage-contact-close" onClick={() => resetForm()}>
                    <X className="h-3.5 w-3.5" />
                    Cancel edit
                  </button>
                )}
              </div>

              <form className="manage-contact-form" onSubmit={handleSubmit}>
                <div className="manage-contact-toggle">
                  <button
                    type="button"
                    className={newContact.type === 'email' ? 'active' : ''}
                    onClick={() => {
                      setNewContact((current) => ({ ...current, type: 'email' }));
                      setShowDropdown(false);
                      setSelectedCountry(COUNTRIES[0]);
                    }}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    className={newContact.type === 'phone' ? 'active' : ''}
                    onClick={() => {
                      setNewContact((current) => ({ ...current, type: 'phone' }));
                    }}
                  >
                    WhatsApp
                  </button>
                </div>

                <div className="manage-contact-field">
                  <label>{newContact.type === 'email' ? 'Email address' : 'Phone number'}</label>

                  <div className="manage-contact-input-row">
                    {newContact.type === 'phone' && (
                      <div className="manage-contact-country">
                        <button
                          type="button"
                          className="manage-contact-country-btn"
                          onClick={() => setShowDropdown((current) => !current)}
                        >
                          <span>{selectedCountry.iso || 'TN'}</span>
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </button>

                        <AnimatePresence>
                          {showDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: 8, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 8, scale: 0.98 }}
                              className="manage-contact-country-menu"
                            >
                              {COUNTRIES.map((country) => (
                                <button
                                  key={country.iso}
                                  type="button"
                                  className={selectedCountry.iso === country.iso ? 'is-selected' : ''}
                                  onClick={() => {
                                    setSelectedCountry(country);
                                    setShowDropdown(false);
                                  }}
                                >
                                  <span>{country.name}</span>
                                  <strong>{country.code}</strong>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    <input
                      type={newContact.type === 'email' ? 'email' : 'tel'}
                      inputMode={newContact.type === 'email' ? 'email' : 'tel'}
                      autoComplete={newContact.type === 'email' ? 'email' : 'tel'}
                      placeholder={newContact.type === 'email' ? 'email@example.com' : '55 123 456'}
                      value={newContact.value}
                      onChange={(e) => setNewContact((current) => ({ ...current, value: e.target.value }))}
                      onFocus={() => setShowDropdown(false)}
                    />
                  </div>

                  <p className="manage-contact-help">
                    {newContact.type === 'email'
                      ? 'Use a real email address so the OTP can be delivered instantly.'
                      : 'The phone number will be stored with the selected country code.'}
                  </p>
                </div>

                <button type="submit" className="manage-contact-save" disabled={saving}>
                  {saving ? (
                    <span className="manage-contact-saving">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    editingContact ? 'Update contact' : 'Save contact'
                  )}
                </button>

                <button
                  type="button"
                  className="manage-contact-return"
                  onClick={() => navigate('/tunisian-auth', { state: returnState })}
                >
                  Return to OTP selection
                </button>
              </form>

              <div className="manage-contact-note">
                <Info className="h-4 w-4 shrink-0" />
                <p>
                  Changes affect the OTP selection step only. Once you are done, go back to the Tunisian
                  authentication screen and choose the contact you want to use.
                </p>
              </div>
            </section>
          </div>
        </section>
      </motion.main>
    </div>
  );
};

export default ManageContactInfo;
