import React, { useState } from 'react';
import { BadgeCheck, CalendarDays, Copy, Download, Printer, X } from 'lucide-react';
import './styles/ConfirmationModal.css';

const ConfirmationModal = ({ isOpen, reservation, onClose, onConfirm }) => {
    const [copying, setCopying] = useState(false);

    if (!isOpen || !reservation) return null;

    const formatReservationSlot = (dateTime) => {
        if (!dateTime) {
            return '';
        }

        const rawValue = String(dateTime);
        const datePart = rawValue.includes('T') ? rawValue.split('T')[0] : rawValue;
        const timePart = rawValue.includes('T') ? rawValue.split('T')[1] : '';
        const [year, month, day] = datePart.split('-');

        if (!year || !month || !day) {
            return rawValue;
        }

        return `${day}/${month}/${year} ${String(timePart).slice(0, 5)}`;
    };

    const handleCopyToClipboard = () => {
        const text = [
            'Reservation confirmed',
            `Station: ${reservation.stationName || '-'}`,
            `Vehicle: ${reservation.vehicleMatricule || '-'}`,
            `Date and time: ${formatReservationSlot(reservation.dateTime)}`,
            `Tariff: ${reservation.tariff} TND`,
        ].join('\n');

        navigator.clipboard.writeText(text);
        setCopying(true);
        setTimeout(() => setCopying(false), 2000);
    };

    const handlePrintQR = () => {
        const printWindow = window.open('', '', 'width=600,height=400');
        if (!printWindow) {
            return;
        }

        printWindow.document.write(`
            <html>
                <head>
                    <title>Reservation QR Code</title>
                    <style>
                        body {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            font-family: Arial, sans-serif;
                            padding: 20px;
                        }
                        h1 { color: #e82127; }
                        .info { margin: 20px 0; font-size: 14px; }
                        img { max-width: 400px; }
                    </style>
                </head>
                <body>
                    <h1>Your reservation QR code</h1>
                    <img src="${reservation.qrCode}" alt="Reservation QR code" />
                    <div class="info">
                        <p><strong>Station:</strong> ${reservation.stationName || '-'}</p>
                        <p><strong>Vehicle:</strong> ${reservation.vehicleMatricule || '-'}</p>
                        <p><strong>Date/time:</strong> ${formatReservationSlot(reservation.dateTime)}</p>
                        <p><strong>Tariff:</strong> ${reservation.tariff} TND</p>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const handleDownloadQR = () => {
        const link = document.createElement('a');
        link.href = reservation.qrCode;
        link.download = `qr-code-${reservation.id || 'reservation'}.png`;
        link.click();
    };

    const reservationReference = String(reservation.id || '').substring(0, 8).toUpperCase();
    const statusLabel = String(reservation.status || 'Pending')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());

    return (
        <div className="confirmation-modal-overlay" onClick={onClose}>
            <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose} aria-label="Close confirmation modal">
                    <X size={18} />
                </button>

                <div className="modal-header">
                    <div className="modal-heading">
                        <span className="modal-kicker">Reservation confirmed</span>
                        <h2>Keep this QR ready at the station</h2>
                        <p className="confirmation-message">
                            Your reservation has been created successfully. Use the QR code below for a faster
                            check-in.
                        </p>
                    </div>

                    <div className="status-chip">
                        <BadgeCheck size={16} />
                        {statusLabel}
                    </div>
                </div>

                <div className="modal-content">
                    <section className="qr-summary">
                        <div className="qr-code-section">
                            <span className="section-label">QR code</span>
                            <p className="qr-instruction">
                                Present this code at the station when you arrive.
                            </p>
                            {reservation.qrCode && (
                                <div className="qr-code-container">
                                    <img
                                        src={reservation.qrCode}
                                        alt="Reservation QR code"
                                        className="qr-code-image"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="reservation-details">
                            <div className="section-header">
                                <div>
                                    <h3>Reservation snapshot</h3>
                                    <p>Everything you need, grouped into one quick glance.</p>
                                </div>
                                <span className="reference-pill">{reservationReference || '--------'}</span>
                            </div>

                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Station</span>
                                    <span className="detail-value">{reservation.stationName || '-'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Vehicle</span>
                                    <span className="detail-value">{reservation.vehicleMatricule || '-'}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Date & time</span>
                                    <span className="detail-value">{formatReservationSlot(reservation.dateTime)}</span>
                                </div>
                                <div className="detail-item highlight">
                                    <span className="detail-label">Tariff</span>
                                    <span className="detail-value">{reservation.tariff} TND</span>
                                </div>
                                <div className="detail-item detail-item-wide">
                                    <span className="detail-label">Status</span>
                                    <span className="detail-value status-pending">{statusLabel}</span>
                                </div>
                            </div>

                            <div className="reservation-note">
                                <CalendarDays size={14} />
                                Payment is processed at 75 percent battery charge.
                            </div>
                        </div>
                    </section>

                    <section className="action-panel">
                        <div className="action-panel-copy">
                            <h4>Quick actions</h4>
                            <p>Use the buttons below if you want a printed copy or a backup on your device.</p>
                        </div>
                        <div className="action-buttons">
                            <button
                                className="btn btn-print"
                                onClick={handlePrintQR}
                                title="Print QR code"
                                disabled={!reservation.qrCode}
                            >
                                <Printer size={16} />
                                Print
                            </button>
                            <button
                                className="btn btn-download"
                                onClick={handleDownloadQR}
                                title="Download QR code"
                                disabled={!reservation.qrCode}
                            >
                                <Download size={16} />
                                Download
                            </button>
                            <button
                                className={`btn btn-copy ${copying ? 'copied' : ''}`}
                                onClick={handleCopyToClipboard}
                            >
                                <Copy size={16} />
                                {copying ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </section>

                    <div className="info-box">
                        <h4>Good to know</h4>
                        <ul>
                            <li>Arrive 5 to 10 minutes early.</li>
                            <li>Keep the QR code visible at check-in.</li>
                            <li>Payment is processed at 75 percent battery charge.</li>
                        </ul>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        Close
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={onConfirm}
                    >
                        Confirm and continue
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
