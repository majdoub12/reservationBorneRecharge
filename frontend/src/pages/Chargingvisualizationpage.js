import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './Chargingvisualizationpage.css';
import AppSidebar from '../components/AppSidebar';
import BatteryVisualizer from '../components/Batteryvisualizer';
import StationChargingTable from '../components/ChargingTable';
import * as chargingService from '../services/Chargingservice';
import * as reservationService from '../services/reservationService_frontend';
import { getVehicleFromToken } from '../utils/authVehicle';
import { Gauge, BatteryCharging, PlayCircle, CircleDollarSign } from 'lucide-react';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const CHARGING_GRACE_MINUTES = 15;
const TESLA_MODEL_ASSETS = {
    model3: '/cars/model-3.png',
    modelS: '/cars/model-s.png',
    modelY: '/cars/model-y.png',
    modelX: '/cars/model-x.png',
    cyberTruck: '/cars/cybertruck.png'
};

const normalizeTeslaModel = (value) => {
    const normalized = String(value || '').trim().toLowerCase();

    if (normalized.includes('cybertruck')) return 'cyberTruck';
    if (normalized.includes('cyber')) return 'cyberTruck';
    if (normalized.includes('modelx') || normalized.includes('model x')) return 'modelX';
    if (normalized.includes('modely') || normalized.includes('model y')) return 'modelY';
    if (normalized.includes('models') || normalized.includes('model s')) return 'modelS';
    if (normalized.includes('model3') || normalized.includes('model 3')) return 'model3';

    return 'model3';
};

const getTeslaModelLabel = (value) => {
    const normalized = normalizeTeslaModel(value);

    switch (normalized) {
        case 'modelS':
            return 'Model S';
        case 'modelY':
            return 'Model Y';
        case 'modelX':
            return 'Model X';
        case 'cyberTruck':
            return 'Cybertruck';
        case 'model3':
        default:
            return 'Model 3';
    }
};

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

const getReservationTime = (reservation) => {
    const datePart = String(reservation?.date_reserve || '').includes('T')
        ? String(reservation.date_reserve).split('T')[0]
        : String(reservation?.date_reserve || '');
    const parsed = new Date(`${datePart}T${String(reservation?.heur_reserve || '').slice(0, 8)}`);
    return Number.isNaN(parsed.getTime()) ? Number.POSITIVE_INFINITY : parsed.getTime();
};

const getReservationStatus = (reservation) => reservation?.status || reservation?.charging_status || '';

const getReservationProgress = (reservation) => {
    const status = getReservationStatus(reservation);
    const progressMap = {
        pending: 0,
        charging_25: 25,
        charging_50: 50,
        charging_75: 75,
        charging_0: 0,
        paid: 100
    };

    return progressMap[status] ?? Number(reservation?.charging_progress || 0);
};

const isReservationInGraceWindow = (reservation) => {
    const reservationTime = getReservationTime(reservation);
    if (!Number.isFinite(reservationTime)) {
        return false;
    }

    const now = Date.now();
    const graceEnd = reservationTime + CHARGING_GRACE_MINUTES * 60 * 1000;
    return now >= reservationTime && now <= graceEnd;
};

const ChargingVisualizationPage = () => {
    const [vehicle, setVehicle] = useState(() => getVehicleFromToken());
    const location = useLocation();
    const selectedReservationId = location.state?.reservationId || null;
    const autoRefresh = true;
    const [reservations, setReservations] = useState([]);
    const [chargingSessions, setChargingSessions] = useState([]);
    const [error, setError] = useState(null);
    const [actionMessage, setActionMessage] = useState(null);
    const [simulationReservationId, setSimulationReservationId] = useState(null);
    const [simulationProgress, setSimulationProgress] = useState(0);
    const [simulationLabel, setSimulationLabel] = useState('Waiting for reservation');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const hydrateVehicle = async () => {
            if (!vehicle?.id) {
                return;
            }

            try {
                const response = await fetch(`http://localhost:5000/api/auth/contacts/${vehicle.id}`);
                if (!response.ok) {
                    return;
                }

                const data = await response.json();
                setVehicle((current) => ({
                    ...current,
                    matricule: data.plate || current?.matricule || 'Vehicule Autorise',
                    model: data.model || current?.model || null,
                    payload: {
                        ...current?.payload,
                        plate: data.plate,
                        vin: data.vin,
                        model: data.model
                    }
                }));
            } catch (hydrateError) {
                console.error('Error hydrating charging vehicle:', hydrateError);
            }
        };

        hydrateVehicle();
    }, [vehicle?.id]);

    const loadDashboard = useCallback(async () => {
        try {
            setError(null);

            const [reservationData, chargingData] = await Promise.all([
                vehicle?.id ? reservationService.getMyReservations(vehicle.id) : Promise.resolve([]),
                chargingService.getAllCharging()
            ]);

            if (reservationData?.length || !vehicle?.matricule || vehicle.matricule === vehicle.id) {
                setReservations(reservationData || []);
            } else {
                const fallbackReservations = await reservationService.getMyReservations(vehicle.matricule);
                setReservations(fallbackReservations || reservationData || []);
            }
            setChargingSessions(chargingData || []);
            setRefreshTrigger(prev => prev + 1);
        } catch (loadError) {
            setError('Unable to load the charging dashboard right now.');
            console.error(loadError);
        }
    }, [vehicle?.id, vehicle?.matricule]);

    useEffect(() => {
        loadDashboard();

        if (!autoRefresh) {
            return undefined;
        }

        const interval = setInterval(() => {
            loadDashboard();
        }, 5000);

        return () => clearInterval(interval);
    }, [autoRefresh, loadDashboard]);

    const activeOrPendingReservation = useMemo(() => {
        const sorted = [...reservations]
            .filter((reservation) =>
                ['pending', 'charging_0', 'charging_25', 'charging_50', 'charging_75'].includes(getReservationStatus(reservation))
            )
            .sort((left, right) => getReservationTime(left) - getReservationTime(right));

        return sorted[0] || null;
    }, [reservations]);

    const selectedReservation = useMemo(() => {
        if (!selectedReservationId) {
            return null;
        }

        return reservations.find((reservation) => reservation.id === selectedReservationId) || null;
    }, [reservations, selectedReservationId]);

    const upcomingReservation = useMemo(() => {
        const pending = [...reservations]
            .filter((reservation) => getReservationStatus(reservation) === 'pending')
            .sort((left, right) => getReservationTime(left) - getReservationTime(right));

        return pending[0] || null;
    }, [reservations]);

    const currentReservation = selectedReservation || activeOrPendingReservation || upcomingReservation || null;
    const currentStationId = currentReservation?.station_id || null;
    const vehicleModel = normalizeTeslaModel(vehicle?.model || vehicle?.payload?.model);
    const vehicleModelLabel = getTeslaModelLabel(vehicle?.model || vehicle?.payload?.model);
    const vehicleImageSrc = TESLA_MODEL_ASSETS[vehicleModel] || TESLA_MODEL_ASSETS.model3;

    const stationSessions = useMemo(() => {
        if (!currentStationId) {
            return [];
        }

        return chargingSessions.filter((session) => session.station_id === currentStationId);
    }, [chargingSessions, currentStationId]);

    const stationDurationHours = stationSessions[0]?.average_duration_hours || 2;

    const displayProgress = simulationReservationId
        ? simulationProgress
        : Number(getReservationProgress(currentReservation));

    const displayStatusLabel = simulationReservationId
        ? simulationLabel
        : getReservationStatus(currentReservation) === 'charging_75'
            ? 'Payment required'
            : getReservationStatus(currentReservation) || 'No active session';

    const displayStationName = currentReservation?.station_name || stationSessions[0]?.station_name || 'Charging station';

    const selectedReservationStatus = getReservationStatus(currentReservation);
    const selectedReservationIsPending = selectedReservationStatus === 'pending';
    const selectedReservationCanStart = selectedReservationIsPending
        ? isReservationInGraceWindow(currentReservation)
        : Boolean(currentReservation);

    const handleStartCharging = async () => {
        if (actionLoading) {
            return;
        }

        if (!currentReservation) {
            setActionMessage("You didn't do a reservation.");
            return;
        }

        const reservationStatus = getReservationStatus(currentReservation);

        if (reservationStatus === 'pending' && !selectedReservationCanStart) {
            setActionMessage('This reservation is not due yet, or it has already expired.');
            return;
        }

        try {
            setActionLoading(true);
            setError(null);
            setActionMessage(null);
            setSimulationReservationId(currentReservation.id);
            setSimulationProgress(getReservationProgress(currentReservation));

            if (reservationStatus === 'charging_75') {
                setSimulationLabel('Payment required');
                setSimulationProgress(75);
                await loadDashboard();
                setShowPaymentModal(true);
                return;
            }

            if (reservationStatus === 'charging_50') {
                setSimulationLabel('Charging 75%');
                await sleep(4000);
                await reservationService.updateReservationStatus(currentReservation.id, 'charging_75');
                setSimulationProgress(75);
                setSimulationLabel('Payment required');
                await loadDashboard();
                setShowPaymentModal(true);
                return;
            }

            if (reservationStatus === 'charging_75') {
                setSimulationLabel('Payment required');
                setSimulationProgress(75);
                await loadDashboard();
                setShowPaymentModal(true);
                return;
            }

            setSimulationLabel('Starting charge');
            await reservationService.updateReservationStatus(currentReservation.id, 'charging_25');
            setSimulationProgress(25);
            setSimulationLabel('Charging 25%');
            await loadDashboard();

            await sleep(4000);
            await reservationService.updateReservationStatus(currentReservation.id, 'charging_50');
            setSimulationProgress(50);
            setSimulationLabel('Charging 50%');
            await loadDashboard();

            await sleep(4000);
            await reservationService.updateReservationStatus(currentReservation.id, 'charging_75');
            setSimulationProgress(75);
            setSimulationLabel('Payment required');
            await loadDashboard();

            setShowPaymentModal(true);
        } catch (simulationError) {
            setError(simulationError.message || 'Unable to start charging.');
            console.error(simulationError);
            setSimulationReservationId(null);
            setSimulationProgress(0);
            setSimulationLabel('Waiting for reservation');
        } finally {
            setActionLoading(false);
        }
    };

    const handlePayNow = async () => {
        if (!simulationReservationId) {
            return;
        }

        try {
            setActionLoading(true);
            await reservationService.payReservation(simulationReservationId);
            setActionMessage('Payment completed successfully.');
            setShowPaymentModal(false);
            setSimulationReservationId(null);
            setSimulationProgress(0);
            setSimulationLabel('Waiting for reservation');
            await loadDashboard();
        } catch (payError) {
            setError(payError.message || 'Unable to complete payment.');
            console.error(payError);
        } finally {
            setActionLoading(false);
        }
    };

    const batteryStatusLabel =
        simulationReservationId && showPaymentModal
            ? 'Payment required'
            : simulationReservationId
                ? simulationLabel
                : getReservationStatus(currentReservation) === 'charging_75'
                    ? 'Payment required'
                    : getReservationStatus(currentReservation) === 'pending'
                        ? 'Waiting to start'
                        : getReservationStatus(currentReservation) || 'Idle';

    return (
        <div className="charging-visualization-page">
            <div className="charging-layout">
                <AppSidebar />

                <section className="dashboard-shell">
                    {error && <div className="dashboard-alert error">{error}</div>}
                    {actionMessage && <div className="dashboard-alert success">{actionMessage}</div>}

                    <section className="charging-top-grid">
                        <article className="car-model-panel">
                            <div className="panel-kicker">
                                <BatteryCharging size={14} />
                                Vehicle model
                            </div>
                            <div className="car-model-header">
                                <div>
                                    <h2>{vehicleModelLabel}</h2>
                                    <p>
                                        {vehicle?.matricule || 'Your vehicle'} is being visualized with a matching
                                        Tesla body style.
                                    </p>
                                </div>
                                <div className="car-model-chip">{vehicle?.matricule || 'Vehicle'}</div>
                            </div>

                            <div className="car-model-image-frame">
                                <img
                                    src={vehicleImageSrc}
                                    alt={`${vehicleModelLabel} visual`}
                                    className="car-model-image"
                                />
                            </div>

                            <div className="car-model-details">
                                <div>
                                    <span className="detail-title">Reservation</span>
                                    <strong>
                                        {currentReservation
                                            ? currentReservation.station_name
                                            : 'Waiting for reservation'}
                                    </strong>
                                </div>
                                <div>
                                    <span className="detail-title">Schedule</span>
                                    <strong>
                                        {currentReservation
                                            ? formatReservationDateTime(
                                                  currentReservation.date_reserve,
                                                  currentReservation.heur_reserve
                                              )
                                            : 'No active slot'}
                                    </strong>
                                </div>
                            </div>
                        </article>

                        <article className="battery-stage-panel battery-stage-panel-prominent">
                            <div className="section-heading section-heading-tight">
                                <div>
                                    <span className="section-kicker">
                                        <Gauge size={14} />
                                        Battery simulation
                                    </span>
                                    <h3>Charging progress</h3>
                                </div>
                                <div className="section-note">
                                    {simulationReservationId
                                        ? 'Battery progress is being simulated from the reservation state.'
                                        : currentReservation
                                            ? 'The battery will start moving when you press the start button.'
                                            : 'No reservation found yet.'}
                                </div>
                            </div>

                            <div className="hero-status-card hero-status-card-compact">
                                <div>
                                    <div className="hero-status-label">Session status</div>
                                    <div className="hero-status-value">{displayStatusLabel}</div>
                                    <p className="hero-status-note">
                                        {simulationReservationId
                                            ? 'The simulation is running on the page.'
                                            : currentReservation
                                                ? getReservationStatus(currentReservation) === 'pending'
                                                    ? selectedReservationCanStart
                                                        ? 'Your reservation is ready to start.'
                                                        : 'Your reservation is scheduled for later or has expired.'
                                                    : 'This reservation already has a charging state.'
                                                : 'No reservation is visible for this vehicle.'}
                                    </p>
                                </div>

                                <button className="start-button" onClick={handleStartCharging} disabled={actionLoading}>
                                    <PlayCircle size={16} />
                                    {actionLoading ? 'Starting...' : 'Start recharging'}
                                </button>
                            </div>

                            <div className="battery-showcase">
                                <BatteryVisualizer
                                    progress={displayProgress}
                                    vehicleMatricule={vehicle?.matricule || 'Vehicle'}
                                    stationName={displayStationName}
                                    chargingTime={stationDurationHours * 60}
                                    statusLabel={batteryStatusLabel}
                                />
                            </div>
                        </article>
                    </section>

                    <section className="table-panel">
                        <div className="section-heading">
                            <div>
                                <span className="section-kicker">Station board</span>
                                <h3>Vehicles currently being served</h3>
                            </div>
                            <div className="section-note">
                                {currentStationId
                                    ? 'Matricules are grouped by progress stage for this station.'
                                    : 'The table will appear once a reservation is selected.'}
                            </div>
                        </div>

                        <StationChargingTable
                            autoRefresh={autoRefresh}
                            refreshInterval={5000}
                            stationId={currentStationId}
                            vehicleMatricule={vehicle?.matricule || null}
                            refreshTrigger={refreshTrigger}
                        />
                    </section>
                </section>
            </div>

            {showPaymentModal && simulationReservationId && (
                <div className="payment-modal-overlay" onClick={() => setShowPaymentModal(false)}>
                    <div className="payment-modal" onClick={(event) => event.stopPropagation()}>
                        <button className="payment-close" type="button" onClick={() => setShowPaymentModal(false)}>
                            ×
                        </button>

                        <span className="payment-kicker">Payment required</span>
                        <h3>Charging reached 75%</h3>
                        <p>
                            Your reservation is completed for payment. Confirm the payment to finalize the reservation
                            and clear it from the active charging board.
                        </p>

                        <div className="payment-details">
                            <div>
                                <span>Reservation</span>
                                <strong>{simulationReservationId.slice(0, 8).toUpperCase()}</strong>
                            </div>
                            <div>
                                <span>Vehicle</span>
                                <strong>{vehicle?.matricule || 'Unknown'}</strong>
                            </div>
                        </div>

                        <button className="payment-button" onClick={handlePayNow} disabled={actionLoading}>
                            <CircleDollarSign size={16} />
                            {actionLoading ? 'Processing...' : 'Pay now'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChargingVisualizationPage;
