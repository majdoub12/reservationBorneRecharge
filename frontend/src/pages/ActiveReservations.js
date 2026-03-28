import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ActiveReservations.css';
import * as reservationService from '../services/reservationService_frontend';
import AppSidebar from '../components/AppSidebar';
import { getVehicleFromToken } from '../utils/authVehicle';

const STATUS_LABELS = {
    pending: 'Pending',
    charging_25: 'Charging 25%',
    charging_50: 'Charging 50%',
    charging_75: 'Charging 75%',
    completed: 'Completed - payment required',
    paid: 'Paid'
};

const formatReservationDateTime = (date, time) => {
    const parsed = new Date(`${date}T${time}`);
    if (Number.isNaN(parsed.getTime())) {
        return `${date} ${time}`;
    }

    return parsed.toLocaleString('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
};

const ActiveReservations = () => {
    const navigate = useNavigate();
    const [carInfo, setCarInfo] = useState(null);
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoadingId, setActionLoadingId] = useState(null);

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
                const data = await reservationService.getMyReservations(carInfo.id);
                setReservations(data || []);
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
        () => reservations.filter((reservation) => reservation.charging_status === 'completed').length,
        [reservations]
    );

    const handleCancel = async (reservationId) => {
        try {
            setActionLoadingId(reservationId);
            setError(null);
            await reservationService.cancelReservation(reservationId);
            setReservations((current) => current.filter((reservation) => reservation.id !== reservationId));
        } catch (err) {
            setError(err.message || 'Unable to cancel this reservation.');
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
                    <header className="active-hero">
                        <div>
                            <div className="active-kicker">Charging command center</div>
                            <h1>Active reservations</h1>
                            <p>
                                Track reservations that still need attention. Completed sessions stay here until
                                payment is done, then they disappear from this page automatically.
                            </p>
                        </div>

                        <div className="active-hero-actions">
                            <button className="ghost-action" onClick={() => navigate('/reservation')}>
                                New reservation
                            </button>
                        </div>
                    </header>

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
                                const isPending = reservation.charging_status === 'pending';
                                const isCompleted = reservation.charging_status === 'completed';
                                const isBusy = actionLoadingId === reservation.id;

                                return (
                                    <article
                                        key={reservation.id}
                                        className={`reservation-card ${isCompleted ? 'payment-pending' : ''}`}
                                    >
                                        <div className="reservation-card-header">
                                            <div>
                                                <span className={`status-pill status-${reservation.charging_status}`}>
                                                    {STATUS_LABELS[reservation.charging_status] || reservation.charging_status}
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
                                                    {reservation.latitude}, {reservation.longitude}
                                                </strong>
                                            </div>
                                            <div>
                                                <span className="meta-label">Reservation ID</span>
                                                <strong>{reservation.id.slice(0, 8).toUpperCase()}</strong>
                                            </div>
                                        </div>

                                        {isCompleted && (
                                            <div className="payment-warning">
                                                <div>
                                                    <span className="warning-title">Payment still required</span>
                                                    <p>
                                                        Charging is finished for this reservation, but the payment is still
                                                        pending. Complete it to clear this card from the active page.
                                                    </p>
                                                </div>
                                                <button
                                                    className="primary-action"
                                                    onClick={() => handlePay(reservation.id)}
                                                    disabled={isBusy}
                                                >
                                                    {isBusy ? 'Processing...' : 'Mark as paid'}
                                                </button>
                                            </div>
                                        )}

                                        <div className="reservation-actions">
                                            {isPending ? (
                                                <button
                                                    className="danger-action"
                                                    onClick={() => handleCancel(reservation.id)}
                                                    disabled={isBusy}
                                                >
                                                    {isBusy ? 'Cancelling...' : 'Cancel reservation'}
                                                </button>
                                            ) : (
                                                <span className="action-note">
                                                    Cancellation is available only while the reservation is pending.
                                                </span>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActiveReservations;
