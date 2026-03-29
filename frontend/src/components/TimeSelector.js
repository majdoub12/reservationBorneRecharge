import React, { useEffect, useState } from 'react';
import './styles/TimeSlotSelector.css';
import * as reservationService from '../services/reservationService_frontend';

const TimeSlotSelector = ({ selectedStation, onSlotSelected, loading }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!selectedStation) return undefined;

        let cancelled = false;

        const fetchSlots = async () => {
            setLoadingSlots(true);
            setError(null);

            try {
                const slotsData = await reservationService.getSlotsByStation(
                    selectedStation.id,
                    selectedDate
                );

                if (!cancelled) {
                    setSlots(Array.isArray(slotsData) ? slotsData : []);
                }
            } catch (err) {
                if (!cancelled) {
                    setError('Error loading available slots');
                    setSlots([]);
                    console.error(err);
                }
            } finally {
                if (!cancelled) {
                    setLoadingSlots(false);
                }
            }
        };

        fetchSlots();

        return () => {
            cancelled = true;
        };
    }, [selectedStation, selectedDate]);

    const handleDateChange = (e) => {
        const [year, month, day] = e.target.value.split('-').map(Number);
        setSelectedDate(new Date(year, month - 1, day));
        setSelectedSlot(null);
    };

    const formatDate = (date) => {
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return '';
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const isPastSlot = (slot) => {
        const slotTime = String(slot?.heur_reserve || '').substring(0, 8);
        const slotDateTime = new Date(`${slot.date_reserve}T${slotTime}`);
        return !Number.isNaN(slotDateTime.getTime()) && slotDateTime < new Date();
    };

    const minDate = new Date();
    minDate.setDate(minDate.getDate());

    return (
        <div className="time-slot-selector">
            <div className="selector-header">
                <h3>Select a time slot</h3>
                {selectedStation && (
                    <p className="selected-station">
                        Station: <strong>{selectedStation.name}</strong>
                    </p>
                )}
            </div>

            {!selectedStation ? (
                <div className="no-station-selected">
                    <p>Please select a station first</p>
                </div>
            ) : (
                <>
                    <div className="date-picker-section">
                        <label htmlFor="date-input" className="date-label">
                            Choose a date:
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
                            Available slots for {selectedDate.toLocaleDateString('en-GB')}
                        </h4>

                        {loadingSlots ? (
                            <div className="loading">Loading slots...</div>
                        ) : error ? (
                            <div className="error">{error}</div>
                        ) : slots.length === 0 ? (
                            <div className="no-slots">
                                <p>No slots available for this date</p>
                            </div>
                        ) : (
                            <div className="slot-dropdown-wrapper">
                                <select
                                    value={selectedSlot?.heur_reserve || ''}
                                    onChange={(event) => {
                                        const chosenTime = event.target.value;
                                        const slot = slots.find((item) => item.heur_reserve === chosenTime);

                                        if (slot?.available && !isPastSlot(slot)) {
                                            setSelectedSlot(slot);
                                            if (onSlotSelected) {
                                                onSlotSelected(slot, selectedDate);
                                            }
                                        }
                                    }}
                                    className="slot-dropdown"
                                >
                                    <option value="" disabled>
                                        Choose a time slot
                                    </option>
                                    {slots.map((slot) => (
                                        <option
                                            key={slot.id}
                                            value={slot.heur_reserve}
                                            disabled={!slot.available || isPastSlot(slot)}
                                        >
                                            {String(slot.heur_reserve || '').substring(0, 5)} -{' '}
                                            {!slot.available || isPastSlot(slot)
                                                ? 'Unavailable'
                                                : `${slot.available_places} spots`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {selectedSlot && (
                        <div className="slot-summary">
                            <h4>Reservation summary</h4>
                            <div className="summary-item">
                                <span className="summary-label">Station:</span>
                                <span className="summary-value">{selectedStation.name}</span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Date:</span>
                                <span className="summary-value">
                                    {selectedDate.toLocaleDateString('en-GB')}
                                </span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Time:</span>
                                <span className="summary-value">
                                    {String(selectedSlot.heur_reserve || '').substring(0, 5)}
                                </span>
                            </div>
                            <div className="summary-item">
                                <span className="summary-label">Tariff:</span>
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
                                {loading ? 'Confirming...' : 'Confirm reservation'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TimeSlotSelector;
