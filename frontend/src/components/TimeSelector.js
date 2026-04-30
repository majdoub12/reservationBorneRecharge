import React, { useEffect, useState } from 'react';
import './styles/TimeSlotSelector.css';
import * as reservationService from '../services/reservationService_frontend';
import { getStationTariff } from '../utils/stationBorne';

const TimeSlotSelector = ({ selectedStation, onSlotSelected, loading }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState('');
    const [availableBornes, setAvailableBornes] = useState([]);
    const [selectedBorneId, setSelectedBorneId] = useState('');
    const [loadingBornes, setLoadingBornes] = useState(false);
    const [bornesError, setBornesError] = useState(null);

    useEffect(() => {
        setSelectedTime('');
        setAvailableBornes([]);
        setSelectedBorneId('');
        setBornesError(null);
    }, [selectedStation?.id]);

    useEffect(() => {
        if (!selectedStation || !selectedTime) {
            setAvailableBornes([]);
            setSelectedBorneId('');
            setBornesError(null);
            return undefined;
        }

        let cancelled = false;

        const fetchBornes = async () => {
            setLoadingBornes(true);
            setBornesError(null);

            try {
                const bornesData = await reservationService.getAvailableBornes(
                    selectedStation.id,
                    selectedDate,
                    selectedTime
                );

                if (!cancelled) {
                    const bornesList = Array.isArray(bornesData) ? bornesData : [];
                    setAvailableBornes(bornesList);
                    setSelectedBorneId((current) => {
                        const firstBorne = bornesList[0] ? String(bornesList[0].id_b) : '';
                        return current && bornesList.some((borne) => String(borne.id_b) === String(current))
                            ? current
                            : firstBorne;
                    });

                    if (bornesList.length === 0) {
                        setBornesError('No borne available at this time. Please choose another time.');
                    }
                }
            } catch (fetchError) {
                if (!cancelled) {
                    setAvailableBornes([]);
                    setSelectedBorneId('');
                    const message = fetchError?.message || '';
                    setBornesError(
                        message.includes('opening hours')
                            ? 'This station is closed at the selected time. Please choose another time.'
                            : message.includes('past')
                                ? 'This time is already in the past. Please choose a later time.'
                                : 'No borne available at this time. Please choose another time.'
                    );
                    console.error(fetchError);
                }
            } finally {
                if (!cancelled) {
                    setLoadingBornes(false);
                }
            }
        };

        fetchBornes();

        return () => {
            cancelled = true;
        };
    }, [selectedStation, selectedDate, selectedTime]);

    const handleDateChange = (event) => {
        const [year, month, day] = event.target.value.split('-').map(Number);
        setSelectedDate(new Date(year, month - 1, day));
        setAvailableBornes([]);
        setSelectedBorneId('');
        setBornesError(null);
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

    const minDate = new Date();
    minDate.setDate(minDate.getDate());

    const stationOpenTime = selectedStation?.heur_ouverture ? String(selectedStation.heur_ouverture).substring(0, 5) : '00:00';
    const stationCloseTime = selectedStation?.heur_fermeture ? String(selectedStation.heur_fermeture).substring(0, 5) : '23:59';

    const selectedBorne = availableBornes.find((borne) => String(borne.id_b) === String(selectedBorneId)) || null;

    return (
        <div className="time-slot-selector">
            <div className="selector-header">
                <h3>Select a time</h3>
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
                    <div className="date-time-row">
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

                        <div className="date-picker-section">
                            <label htmlFor="time-input" className="date-label">
                                Choose a time:
                            </label>
                            <input
                                id="time-input"
                                type="time"
                                value={selectedTime}
                                min={stationOpenTime}
                                max={stationCloseTime}
                                step="60"
                                onChange={(event) => {
                                    setSelectedTime(event.target.value);
                                    setAvailableBornes([]);
                                    setSelectedBorneId('');
                                    setBornesError(null);
                                }}
                                className="date-input"
                            />
                        </div>
                    </div>

                    {(selectedTime || availableBornes.length > 0) && (
                        <div className="slot-summary">
                            <div className="slot-summary-header">
                                <h4>Reservation summary</h4>
                                <div className="slot-summary-pill">
                                    {selectedTime ? 'Bornes refreshed for the selected time' : 'Choose a time to load bornes'}
                                </div>
                            </div>

                            <div className="summary-layout">
                                <div className="summary-details-panel">
                                    <div className="summary-item">
                                        <span className="summary-label">Station:</span>
                                        <span className="summary-value">{selectedStation.name}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-label">Date:</span>
                                        <span className="summary-value">{selectedDate.toLocaleDateString('en-GB')}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-label">Time:</span>
                                        <span className="summary-value">{selectedTime || '-'}</span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-label">Tariff:</span>
                                        <span className="summary-value">{getStationTariff(selectedStation).toFixed(2)} TND</span>
                                    </div>
                                    <div className="summary-item">
                                        <span className="summary-label">Opening hours:</span>
                                        <span className="summary-value">{stationOpenTime} - {stationCloseTime}</span>
                                    </div>
                                </div>

                                <div className="bornes-panel">
                                    <div className="bornes-panel-header">
                                        <div>
                                            <h5>Available bornes</h5>
                                            <p>
                                                {availableBornes.length > 0
                                                    ? `${availableBornes.length} borne${availableBornes.length > 1 ? 's' : ''} ready for booking`
                                                    : 'Select a time to load the available bornes'}
                                            </p>
                                        </div>
                                        
                                    </div>

                                    {selectedTime && (
                                        <div className="selected-borne-card">
                                            <span className="selected-borne-label">Selected borne</span>
                                            {bornesError ? (
                                                <p className="selected-borne-empty">
                                                    {selectedBorne
                                                        ? `Borne #${selectedBorne.id_b} selected, but the selected time is not available.`
                                                        : 'The selected time is not available.'}
                                                </p>
                                            ) : availableBornes.length === 0 ? (
                                                <p className="selected-borne-empty">
                                                    Choose another time to see available bornes
                                                </p>
                                            ) : selectedBorne ? (
                                                <div className="selected-borne-meta">
                                                    <strong>Borne #{selectedBorne.id_b}</strong>
                                                    <div>
                                                        {Number(selectedBorne.charging_speed_kw || 0)} kW
                                                        {' - '}
                                                        {Number(selectedBorne.average_duration_hours || 0)} h avg
                                                        {' - '}
                                                        {Number(selectedBorne.tariff || selectedBorne.tarif || 0).toFixed(2)} TND
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="selected-borne-empty">Pick one borne to continue</p>
                                            )}
                                        </div>
                                    )}

                                    {loadingBornes ? (
                                        <div className="bornes-state bornes-state-loading">Loading available bornes...</div>
                                    ) : bornesError ? null : availableBornes.length === 0 ? (
                                        <div className="bornes-state bornes-state-empty">
                                            No borne available at this time. Please choose another time.
                                        </div>
                                    ) : (
                                        <div className="borne-list">
                                            {availableBornes.map((borne) => (
                                                <button
                                                    key={borne.id_b}
                                                    type="button"
                                                    className={`borne-chip ${String(selectedBorneId) === String(borne.id_b) ? 'active' : ''}`}
                                                    onClick={() => setSelectedBorneId(String(borne.id_b))}
                                                >
                                                    <div className="borne-chip-top">
                                                        <strong>Borne #{borne.id_b}</strong>
                                                        <span className={`borne-chip-state ${String(selectedBorneId) === String(borne.id_b) ? 'selected' : ''}`}>
                                                            {String(selectedBorneId) === String(borne.id_b) ? 'Selected' : 'Select'}
                                                        </span>
                                                    </div>
                                                    <div className="borne-chip-meta">
                                                        <span>{Number(borne.charging_speed_kw || 0)} kW</span>
                                                        <span>{Number(borne.average_duration_hours || 0)} h avg</span>
                                                        <span>{Number(borne.tariff || borne.tarif || 0).toFixed(2)} TND</span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                className="confirm-button"
                                disabled={loading || loadingBornes || !selectedBorneId || availableBornes.length === 0}
                                onClick={() => {
                                    const chosenBorne = availableBornes.find(
                                        (borne) => String(borne.id_b) === String(selectedBorneId)
                                    );

                                    if (onSlotSelected && chosenBorne) {
                                        onSlotSelected(selectedDate, selectedTime, true, chosenBorne);
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
