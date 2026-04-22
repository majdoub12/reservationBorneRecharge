import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Reservation.css';
import StationList from '../components/StationList';
import StationMap from '../components/StationMap';
import TimeSlotSelector from '../components/TimeSelector';
import ConfirmationModal from '../components/ConfirmationModal';
import AppSidebar from '../components/AppSidebar';
import * as reservationService from '../services/reservationService_frontend';
import { getVehicleFromToken } from '../utils/authVehicle';

const formatDateForApi = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const Reservation = () => {
    const navigate = useNavigate();
    const [stations, setStations] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [reservation, setReservation] = useState(null);
    const [carInfo, setCarInfo] = useState(null);

    useEffect(() => {
        fetchStations();
        const vehicle = getVehicleFromToken();

        if (!vehicle) {
            localStorage.removeItem('token');
            navigate('/');
            return;
        }

        setCarInfo({
            id: vehicle.id,
            matricule: vehicle.matricule
        });
    }, [navigate]);

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

    const handleStationSelect = (station) => {
        setSelectedStation(station);
        setError(null);
    };

    const handleSlotSelected = async (date, time, isConfirming = false, borne = null) => {
        if (isConfirming && date && time && selectedStation && carInfo && borne) {
            await createReservation(date, time, borne);
        }
    };

    const createReservation = async (date, time, borne) => {
        if (!carInfo || !selectedStation) {
            setError('Informations de la voiture manquantes');
            return;
        }

        if (!borne?.id_b) {
            setError('Veuillez choisir une borne disponible');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const result = await reservationService.createReservation(
                carInfo.id,
                selectedStation.id,
                borne.id_b,
                formatDateForApi(date),
                time
            );

            setReservation(result);
            setShowConfirmation(true);
        } catch (err) {
            if (err.message.includes('CONFLICT')) {
                setError('Votre voiture a deja une reservation active a ce moment');
            } else if (err.message.includes('Cannot create a reservation in the past')) {
                setError('Impossible de reserver un creneau dans le passe');
            } else if (err.message.includes('opening hours')) {
                setError('La station est fermee a cette heure. Choisissez un autre horaire.');
            } else if (err.message.includes('No available')) {
                setError('Aucune borne disponible pour cet horaire');
            } else if (err.message.includes('Selected time is in the past')) {
                setError('Impossible de reserver un horaire deja passe');
            } else {
                setError('Erreur lors de la creation de la reservation');
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
        setSelectedStation(null);
        setShowConfirmation(false);
        setReservation(null);
        navigate('/active-reservations');
    };

    if (!carInfo) {
        return (
            <div className="reservation-page">
                <div className="loading-message">
                    <p>Loading your vehicle profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="reservation-page">
            <div className="reservation-layout">
                <AppSidebar />

                <div className="reservation-content">
                    <div className="div-1">
                        <div className="map-list-wrapper">
                            <div className="map-section">
                                <StationMap
                                    stations={stations}
                                    selectedStation={selectedStation}
                                    onSelectStation={handleStationSelect}
                                />
                            </div>

                            <div className="list-section">
                                {loading && !stations.length ? (
                                    <div className="loading-section">
                                        <p>Loading stations...</p>
                                    </div>
                                ) : (
                                    <StationList
                                        stations={stations}
                                        selectedStation={selectedStation}
                                        onSelectStation={handleStationSelect}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {selectedStation && (
                        <div className="div-2">
                            <TimeSlotSelector
                                selectedStation={selectedStation}
                                onSlotSelected={handleSlotSelected}
                                loading={loading}
                            />
                        </div>
                    )}

                    {error && (
                        <div className="error-message">
                            <span className="error-icon">!</span>
                            <span>{error}</span>
                            <button
                                className="error-close"
                                onClick={() => setError(null)}
                                aria-label="Dismiss error"
                            >
                                x
                            </button>
                        </div>
                    )}
                </div>
            </div>

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
