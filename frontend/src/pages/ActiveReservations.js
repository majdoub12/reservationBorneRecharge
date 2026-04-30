import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ActiveReservations.css';
import * as reservationService from '../services/reservationService_frontend';
import AppSidebar from '../components/AppSidebar';
import { getVehicleFromToken } from '../utils/authVehicle';
import { Sparkles, PlayCircle, QrCode, X } from 'lucide-react';

const STATUS_LABELS = {
    pending: 'Pending',
    charging_25: 'Charging 25%',
    charging_50: 'Charging 50%',
    charging_75: 'Charging 75%',
    charging_75: 'Completed - payment required',
    paid: 'Paid',
    missed: 'Missed'
};

const getReservationStatus = (reservation) => reservation?.status || reservation?.charging_status || '';

const formatReservationDateTime = (date, time) => {
    if (!date || !time) {
        return `${date} ${time}`;
    }

    const datePart = String(date).includes('T') ? String(date).split('T')[0] : String(date);
    const [year, month, day] = datePart.split('-');
    const timePart = String(time).slice(0, 8);

    if (!year || !month || !day) {
        return `${date} ${time}`;
    }

    return `${day}/${month}/${year} ${timePart.slice(0, 5)}`;
};

const ActiveReservations = () => {
    const navigate = useNavigate();
    const [carInfo, setCarInfo] = useState(null);
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoadingId, setActionLoadingId] = useState(null);
    const [selectedQrReservation, setSelectedQrReservation] = useState(null);

    useEffect(() => {
        const vehicle = getVehicleFromToken();
        if (!vehicle) {
            localStorage.removeItem('token');
            navigate('/');
            return;
        }

        setCarInfo(vehicle);
    }, [navigate]);

    useEffect(() => {
        if (!carInfo?.id) {
            return;
        }

        const fetchReservations = async () => {
            try {
                setLoading(true);
                setError(null);
                const primaryData = await reservationService.getMyReservations(carInfo.id);
                if (primaryData?.length || !carInfo.matricule || carInfo.matricule === carInfo.id) {
                    setReservations(primaryData || []);
                    return;
                }

                const fallbackData = await reservationService.getMyReservations(carInfo.matricule);
                setReservations(fallbackData || primaryData || []);
            } catch (err) {
                setError('Unable to load active reservations right now.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchReservations();
    }, [carInfo]);

    const completedCount = useMemo(
        () => reservations.filter((reservation) => getReservationStatus(reservation) === 'completed').length,
        [reservations]
    );

    const getReservationQrCode = (reservation) => reservation.qr_code || reservation.qrCode || null;

    const openQrPopup = (reservation) => {
        setSelectedQrReservation(reservation);
    };

    const closeQrPopup = () => {
        setSelectedQrReservation(null);
    };

    const handleCancel = async (reservationId) => {
        try {
            setActionLoadingId(reservationId);
            setError(null);
            await reservationService.cancelReservation(reservationId);
            setReservations((current) => current.filter((reservation) => reservation.id !== reservationId));
        } catch (err) {
            if (String(err.message || '').includes('expired')) {
                setError('This reservation has already started or expired and can no longer be cancelled.');
            } else if (String(err.message || '').includes('not found')) {
                setError('We could not find this reservation anymore.');
            } else {
                setError(err.message || 'Unable to cancel this reservation.');
            }
            console.error(err);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handlePay = async (reservationId) => {
        try {
            setActionLoadingId(reservationId);
            setError(null);
            await reservationService.payReservation(reservationId);
            setReservations((current) => current.filter((reservation) => reservation.id !== reservationId));
        } catch (err) {
            setError(err.message || 'Unable to complete payment for this reservation.');
            console.error(err);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleOpenCharging = (reservation) => {
        navigate('/charging-visualization', {
            state: {
                reservationId: reservation.id
            }
        });
    };

    if (!carInfo) {
        return (
            <div className="active-reservations-page">
                <div className="active-loading">Loading your vehicle access...</div>
            </div>
        );
    }

    return (
        <div className="active-reservations-page">
            <div className="active-reservations-layout">
                <AppSidebar />

                <div className="active-reservations-shell">
                    <section className="active-summary-grid">
                        <article className="summary-card">
                            <span className="summary-label">Open reservations</span>
                            <strong>{reservations.length}</strong>
                        </article>
                        <article className="summary-card warning">
                            <span className="summary-label">Payment pending</span>
                            <strong>{completedCount}</strong>
                        </article>
                    </section>

                    {error && (
                        <div className="active-error-banner">
                            <span>{error}</span>
                            <button onClick={() => setError(null)}>Dismiss</button>
                        </div>
                    )}

                    {loading ? (
                        <div className="active-panel">
                            <div className="active-loading">Loading active reservations...</div>
                        </div>
                    ) : reservations.length === 0 ? (
                        <div className="active-panel active-empty-state">
                            <h2>No active reservations</h2>
                            <p>
                                You have no pending or in-progress charging sessions right now. Create a new reservation
                                when you are ready.
                            </p>
                            <button className="primary-action" onClick={() => navigate('/reservation')}>
                                Reserve a slot
                            </button>
                        </div>
                    ) : (
                        <section className="active-reservation-list">
                            {reservations.map((reservation) => {
                                const reservationStatus = getReservationStatus(reservation);
                                const isPending = reservationStatus === 'pending';
                                const isCompleted = reservationStatus === 'charging_75';
                                const isBusy = actionLoadingId === reservation.id;
                                const qrCode = getReservationQrCode(reservation);
                                const startLabel =
                                    reservationStatus === 'charging_75'
                                        ? 'Open payment'
                                        : reservationStatus.startsWith('charging_')
                                            ? 'Continue charging'
                                            : 'Start charging';

                                return (
                                    <article
                                        key={reservation.id}
                                        className={`reservation-card ${isCompleted ? 'payment-pending' : ''}`}
                                    >
                                        <div className="reservation-card-header">
                                            <div>
                                                <span className={`status-pill status-${reservationStatus}`}>
                                                    {STATUS_LABELS[reservationStatus] || reservationStatus}
                                                </span>
                                                <h2>{reservation.station_name}</h2>
                                    
                                            </div>
                                            <div className="reservation-price">{reservation.tariff} TND</div>
                                        </div>

                                        <div className="reservation-meta">
                                            <div>
                                                <span className="meta-label">Schedule</span>
                                                <strong>
                                                    {formatReservationDateTime(
                                                        reservation.date_reserve,
                                                        reservation.heur_reserve
                                                    )}
                                                </strong>
                                            </div>
                                            <div>
                                                <span className="meta-label">Location</span>
                                                <strong>
                                                    <a
                                                        href={`https://www.google.com/maps?q=${reservation.latitude},${reservation.longitude}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="map-link"
                                                    >
                                                        {reservation.station_name}
                                                    </a>
                                                </strong>
                                            </div>
                                            <div>
                                                <span className="meta-label">Reservation ID</span>
                                                <strong>{reservation.id.slice(0, 8).toUpperCase()}</strong>
                                            </div>
                                        </div>

                                        

                                        <div className="reservation-actions">
                                            <button className="primary-action" onClick={() => handleOpenCharging(reservation)}>
                                                <PlayCircle size={16} />
                                                {startLabel}
                                            </button>

                                            {isPending ? (
                                                <button
                                                    className="danger-action"
                                                    onClick={() => handleCancel(reservation.id)}
                                                    disabled={isBusy}
                                                >
                                                    {isBusy ? 'Cancelling...' : 'Cancel reservation'}
                                                </button>
                                            ) : isCompleted ? (
                                                <button
                                                    className="primary-action"
                                                    onClick={() => handlePay(reservation.id)}
                                                    disabled={isBusy}
                                                >
                                                    {isBusy ? 'Processing...' : 'Mark as paid'}
                                                </button>
                                            ) : null}

                                            {qrCode && (
                                                <button
                                                    className="ghost-action qr-toggle-action"
                                                    onClick={() => openQrPopup(reservation)}
                                                    type="button"
                                                >
                                                    <QrCode size={16} />
                                                    Show QR code
                                                </button>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </section>
                    )}
                </div>
            </div>

            {selectedQrReservation && getReservationQrCode(selectedQrReservation) && (
                <div className="qr-modal-overlay" onClick={closeQrPopup}>
                    <div
                        className="qr-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="qr-modal-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            className="qr-modal-close"
                            onClick={closeQrPopup}
                            type="button"
                            aria-label="Close QR code popup"
                        >
                            <X size={18} />
                        </button>

                        <div className="qr-modal-header">
                            <div className="qr-modal-heading-group">
                                <span className="meta-label">QR Access Pass</span>
                                <h2 id="qr-modal-title">{selectedQrReservation.station_name}</h2>
                                <p>
                                    Present this code at the station when you arrive so the reservation can be
                                    verified quickly and cleanly.
                                </p>
                            </div>

                            <div className="qr-modal-status-chip">
                                <QrCode size={16} />
                                Ready to scan
                            </div>
                        </div>

                        <div className="qr-modal-body">
                            <div className="qr-modal-preview">
                                <div className="qr-modal-frame">
                                    <span className="qr-modal-frame-label">Reservation QR</span>
                                    <img
                                        src={getReservationQrCode(selectedQrReservation)}
                                        alt={`QR code for reservation ${selectedQrReservation.id}`}
                                        className="qr-modal-image"
                                    />
                                </div>
                                <p className="qr-modal-caption">
                                    Keep this screen bright and centered when scanning at the station.
                                </p>
                            </div>

                            <div className="qr-modal-details">
                                <div className="detail-item detail-highlight">
                                    <span className="detail-label">Reservation</span>
                                    <span className="detail-value">
                                        {selectedQrReservation.id.slice(0, 8).toUpperCase()}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Schedule</span>
                                    <span className="detail-value">
                                        {formatReservationDateTime(
                                            selectedQrReservation.date_reserve,
                                            selectedQrReservation.heur_reserve
                                        )}
                                    </span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Status</span>
                                    <span className="detail-value">
                                        {STATUS_LABELS[getReservationStatus(selectedQrReservation)] ||
                                            getReservationStatus(selectedQrReservation)}
                                    </span>
                                </div>
                                <div className="qr-modal-footnote">
                                    This QR code is tied to the active reservation and is intended for station check-in.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActiveReservations;
