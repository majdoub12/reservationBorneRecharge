import React, { useState, useEffect } from 'react';
import './styles/TimeSlotSelector.css';
import * as reservationService from '../services/reservationService_frontend';

const TimeSlotSelector = ({ selectedStation, onSlotSelected, loading }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [error, setError] = useState(null);

    // Fetch slots when date or station changes
    useEffect(() => {
        if (!selectedStation) return;

        const fetchSlots = async () => {
            setLoadingSlots(true);
            setError(null);
            try {
                const slotsData = await reservationService.getSlotsByStation(
                    selectedStation.id,
                    selectedDate
                );
                setSlots(slotsData || []);
            } catch (err) {
                setError('Erreur lors du chargement des créneaux');
                console.error(err);
                setSlots([]);
            } finally {
                setLoadingSlots(false);
            }
        };

        fetchSlots();
    }, [selectedStation, selectedDate]);

    const handleDateChange = (e) => {
        setSelectedDate(new Date(e.target.value));
        setSelectedSlot(null); // Reset selected slot when date changes
    };

    const formatDate = (date) => {
        return date.toISOString().split('T')[0];
    };

    const isPastSlot = (slot) => {
        const slotDateTime = new Date(`${slot.date_reserve}T${slot.heur_reserve.substring(0, 8)}`);
        return !Number.isNaN(slotDateTime.getTime()) && slotDateTime < new Date();
    };

    const minDate = new Date();
    minDate.setDate(minDate.getDate());

    return (
        <div className="time-slot-selector">
            <div className="selector-header">
                <h3>Sélectionner Créneau Horaire</h3>
                {selectedStation && (
                    <p className="selected-station">
                        Station: <strong>{selectedStation.name}</strong>
                    </p>
                )}
            </div>

            {!selectedStation ? (
                <div className="no-station-selected">
                    <p>Veuillez sélectionner une station d'abord</p>
                </div>
            ) : (
                <>
                    <div className="date-picker-section">
                        <label htmlFor="date-input" className="date-label">
                            Choisir une Date:
                        </label>
                        <input
                            id="date-input"
                            type="date"
                            value={formatDate(selectedDate)}
                            onChange={handleDateChange}
                            min={formatDate(minDate)}
                            className="date-input"
                        />
                    </div>

                    <div className="slots-section">
                        <h4 className="slots-title">
                            Créneaux disponibles le {selectedDate.toLocaleDateString('fr-FR')}
                        </h4>

                        {loadingSlots ? (
                            <div className="loading">Chargement des créneaux...</div>
                        ) : error ? (
                            <div className="error">{error}</div>
                        ) : slots.length === 0 ? (
                            <div className="no-slots">
                                <p>Aucun créneau disponible pour cette date</p>
                            </div>
                        ) : (
                            <div className="slot-dropdown-wrapper">
                                <select
                                    value={selectedSlot?.heur_reserve || ''}
                                    onChange={(e) => {
                                        const chosenTime = e.target.value;
                                        const slot = slots.find(s => s.heur_reserve === chosenTime);
                                        if (slot?.available && !isPastSlot(slot)) {
                                            setSelectedSlot(slot);
                                            if (onSlotSelected) onSlotSelected(slot, selectedDate);
                                        }
                                    }}
                                    className="slot-dropdown"
                                >
                                    <option value="" disabled>
                                        Choisissez un créneau horaire
                                    </option>
                                    {slots.map(slot => (
                                        <option
                                            key={slot.id}
                                            value={slot.heur_reserve}
                                            disabled={!slot.available || isPastSlot(slot)}
                                        >
                                            {slot.heur_reserve.substring(0, 5)} - {!slot.available || isPastSlot(slot) ? 'Indisponible' : `${slot.available_places} place(s)`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {selectedSlot && (
                        <div className="slot-summary">
                            <h4>Résumé de la Réservation</h4>
                            <div className="summary-item">
                                <span className="summary-label">Station:</span>
                                <span className="summary-value">{selectedStation.name}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Date:</span>
                                <span className="summary-value">
                                    {selectedDate.toLocaleDateString('fr-FR')}
                                </span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Heure:</span>
                                <span className="summary-value">
                                    {selectedSlot.heur_reserve.substring(0, 5)}
                                </span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Tarif:</span>
                                <span className="summary-value">
                                    {Number(selectedStation.tariff).toFixed(2)} TND
                                </span>
                            </div>

                            <button
                                className="confirm-button"
                                disabled={loading}
                                onClick={() => {
                                    if (onSlotSelected) {
                                        onSlotSelected(selectedSlot, selectedDate, true);
                                    }
                                }}
                            >
                                {loading ? 'Confirmation en cours...' : 'Confirmer la Réservation'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TimeSlotSelector;
