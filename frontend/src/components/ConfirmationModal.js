import React, { useState } from 'react';
import './styles/ConfirmationModal.css';

const ConfirmationModal = ({ isOpen, reservation, onClose, onConfirm }) => {
    const [copying, setCopying] = useState(false);

    if (!isOpen || !reservation) return null;

    const handleCopyToClipboard = () => {
        const text = `
Réservation Confirmée
Station: ${reservation.stationName}
Véhicule: ${reservation.vehicleMatricule}
Date et Heure: ${new Date(reservation.dateTime).toLocaleString('fr-FR')}
Tarif: ${reservation.tariff} TND
        `;
        navigator.clipboard.writeText(text);
        setCopying(true);
        setTimeout(() => setCopying(false), 2000);
    };

    const handlePrintQR = () => {
        const printWindow = window.open('', '', 'width=600,height=400');
        printWindow.document.write(`
            <html>
                <head>
                    <title>QR Code Réservation</title>
                    <style>
                        body {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            font-family: Arial, sans-serif;
                            padding: 20px;
                        }
                        h1 { color: #007bff; }
                        .info { margin: 20px 0; font-size: 14px; }
                        img { max-width: 400px; }
                    </style>
                </head>
                <body>
                    <h1>Votre QR Code de Réservation</h1>
                    <img src="${reservation.qrCode}" />
                    <div class="info">
                        <p><strong>Station:</strong> ${reservation.stationName}</p>
                        <p><strong>Véhicule:</strong> ${reservation.vehicleMatricule}</p>
                        <p><strong>Date/Heure:</strong> ${new Date(reservation.dateTime).toLocaleString('fr-FR')}</p>
                        <p><strong>Tarif:</strong> ${reservation.tariff} TND</p>
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
        link.download = `qr-code-${reservation.id}.png`;
        link.click();
    };

    return (
        <div className="confirmation-modal-overlay" onClick={onClose}>
            <div className="confirmation-modal" onClick={(e) => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>×</button>

                <div className="modal-header">
                    <h2>✓ Réservation Confirmée!</h2>
                    <p className="confirmation-message">
                        Votre réservation a été créée avec succès
                    </p>
                </div>

                <div className="modal-content">
                    <div className="qr-code-section">
                        <h3>Votre Code QR</h3>
                        <p className="qr-instruction">
                            Présentez ce code à la station pour un service plus rapide
                        </p>
                        {reservation.qrCode && (
                            <div className="qr-code-container">
                                <img
                                    src={reservation.qrCode}
                                    alt="QR Code de réservation"
                                    className="qr-code-image"
                                />
                            </div>
                        )}
                    </div>

                    <div className="reservation-details">
                        <h3>Détails de la Réservation</h3>
                        <div className="detail-item">
                            <span className="detail-label">Référence:</span>
                            <span className="detail-value">{reservation.id.substring(0, 8).toUpperCase()}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Station:</span>
                            <span className="detail-value">{reservation.stationName}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Véhicule:</span>
                            <span className="detail-value">{reservation.vehicleMatricule}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Date & Heure:</span>
                            <span className="detail-value">
                                {new Date(reservation.dateTime).toLocaleString('fr-FR')}
                            </span>
                        </div>
                        <div className="detail-item highlight">
                            <span className="detail-label">Tarif:</span>
                            <span className="detail-value">{reservation.tariff} TND</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Status:</span>
                            <span className="detail-value status-pending">En attente</span>
                        </div>
                    </div>

                    <div className="action-buttons">
                        <button
                            className="btn btn-print"
                            onClick={handlePrintQR}
                            title="Imprimer le QR Code"
                        >
                            🖨️ Imprimer
                        </button>
                        <button
                            className="btn btn-download"
                            onClick={handleDownloadQR}
                            title="Télécharger le QR Code"
                        >
                            ⬇️ Télécharger
                        </button>
                        <button
                            className={`btn btn-copy ${copying ? 'copied' : ''}`}
                            onClick={handleCopyToClipboard}
                        >
                            {copying ? '✓ Copié!' : '📋 Copier'}
                        </button>
                    </div>

                    <div className="info-box">
                        <h4>📌 Instructions Importantes:</h4>
                        <ul>
                            <li>Présentez ce QR Code à la station à votre heure de réservation</li>
                            <li>Arrivez 5-10 minutes avant l'heure prévue</li>
                            <li>Le paiement se fera à 75% de charge de la batterie</li>
                            <li>Consultez "Historique des Réservations" pour plus de détails</li>
                        </ul>
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        Fermer
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={onConfirm}
                    >
                        ✓ Confirmer & Continuer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;