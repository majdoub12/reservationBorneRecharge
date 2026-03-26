import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Reservation.css';
import StationList from '../components/StationList';
import StationMap from '../components/StationMap';
import TimeSlotSelector from '../components/TimeSelector';
import ConfirmationModal from '../components/ConfirmationModal';
import * as reservationService from '../services/reservationService_frontend';

const Reservation = () => {
    const navigate = useNavigate();

    // State Management
    const [stations, setStations] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [reservation, setReservation] = useState(null);

    // Get car info from auth (localStorage or context)
    const [carInfo, setCarInfo] = useState(null);

    // Load stations on mount
    useEffect(() => {
        fetchStations();
        loadCarInfo();
    }, []);

    const fetchStations = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await reservationService.getStations();
            setStations(data);
        } catch (err) {
            setError('Erreur lors du chargement des stations');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadCarInfo = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/');
            return;
        }

        try {
            // Decode JWT payload safely
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const parsed = JSON.parse(jsonPayload);

            const vehicleId = parsed.vehicleId || parsed.email;
            if (vehicleId) {
                setCarInfo({
                    id: vehicleId,
                    matricule: parsed.email ? parsed.email : 'Véhicule Autorisé'
                });
            } else {
                navigate('/');
            }
        } catch (err) {
            console.error('Error decoding token:', err);
            localStorage.removeItem('token');
            navigate('/');
        }
    };

    const handleStationSelect = (station) => {
        setSelectedStation(station);
        setSelectedSlot(null);
        setError(null);
    };

    const handleSlotSelected = async (slot, date, isConfirming = false) => {
        setSelectedSlot(slot);

        // If user is confirming the reservation
        if (isConfirming && slot && selectedStation && carInfo) {
            await createReservation(slot, date);
        }
    };

    const createReservation = async (slot, date) => {
        if (!carInfo || !selectedStation) {
            setError('Informations de la voiture manquantes');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Check for conflict first
            const hasConflict = await reservationService.checkConflict(
                carInfo.id, 
                slot.date_reserve, 
                slot.heur_reserve
            );
            
            if (hasConflict) {
                setError('Votre voiture a déjà une réservation active à ce moment');
                setLoading(false);
                return;
            }

            // Create reservation
            const result = await reservationService.createReservation(
                carInfo.id,
                selectedStation.id,
                slot.date_reserve,
                slot.heur_reserve
            );

            // Show confirmation modal
            setReservation(result);
            setShowConfirmation(true);

        } catch (err) {
            if (err.message.includes('Conflict')) {
                setError('Votre voiture a déjà une réservation active à ce moment');
            } else if (err.message.includes('No available slots')) {
                setError('Aucune place disponible pour ce créneau');
            } else {
                setError('Erreur lors de la création de la réservation');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmationClose = () => {
        setShowConfirmation(false);
    };

    const handleConfirmationConfirm = () => {
        // Reset form for new reservation
        setSelectedStation(null);
        setSelectedSlot(null);
        setShowConfirmation(false);
        setReservation(null);
    };

    if (!carInfo) {
        return (
            <div className="reservation-page">
                <div className="loading-message">
                    <p>Chargement des informations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="reservation-page">
            <div className="reservation-container">
                {/* DIV 1: Map + List */}
                <div className="div-1">
                    <div className="map-list-wrapper">
                        {/* Left: Station List */}
                        <div className="list-section">
                            {loading && !stations.length ? (
                                <div className="loading-section">
                                    <p>Chargement des stations...</p>
                                </div>
                            ) : (
                                <StationList
                                    stations={stations}
                                    selectedStation={selectedStation}
                                    onSelectStation={handleStationSelect}
                                />
                            )}
                        </div>

                        {/* Right: Map */}
                        <div className="map-section">
                            <StationMap
                                stations={stations}
                                selectedStation={selectedStation}
                                onSelectStation={handleStationSelect}
                            />
                        </div>
                    </div>
                </div>

                {/* DIV 2: Time Slot Selector */}
                {selectedStation && (
                    <div className="div-2">
                        <TimeSlotSelector
                            selectedStation={selectedStation}
                            onSlotSelected={handleSlotSelected}
                            loading={loading}
                        />
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="error-message">
                        <span className="error-icon">⚠️</span>
                        <span>{error}</span>
                        <button
                            className="error-close"
                            onClick={() => setError(null)}
                        >
                            ×
                        </button>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={showConfirmation}
                reservation={reservation}
                onClose={handleConfirmationClose}
                onConfirm={handleConfirmationConfirm}
            />
        </div>
    );
};

export default Reservation;