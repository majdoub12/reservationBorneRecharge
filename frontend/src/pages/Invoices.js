import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Invoices.css';
import AppSidebar from '../components/AppSidebar';
import { getVehicleFromToken } from '../utils/authVehicle';
import * as reservationService from '../services/reservationService_frontend';

const formatDateTime = (date, time, paidAt) => {
    const rawValue = paidAt || `${date}T${time}`;
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) {
        return rawValue;
    }

    return parsed.toLocaleString('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
};

const buildPrintableInvoice = (invoice, vehicleMatricule) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Invoice ${invoice.id.slice(0, 8).toUpperCase()}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 32px;
            color: #17242c;
            background: #ffffff;
        }
        .sheet {
            max-width: 760px;
            margin: 0 auto;
            border: 1px solid #d8e2e8;
            border-radius: 18px;
            padding: 28px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            border-bottom: 1px solid #d8e2e8;
            padding-bottom: 20px;
            margin-bottom: 24px;
        }
        .brand {
            font-size: 24px;
            font-weight: 700;
        }
        .muted {
            color: #5f7681;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }
        .amount {
            font-size: 30px;
            font-weight: 800;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
        }
        .card {
            padding: 16px;
            border-radius: 14px;
            background: #f6fafb;
        }
        .label {
            color: #68808a;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            margin-bottom: 6px;
        }
        .value {
            font-size: 16px;
            font-weight: 600;
        }
        .footer {
            margin-top: 28px;
            padding-top: 18px;
            border-top: 1px solid #d8e2e8;
            color: #5f7681;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="sheet">
        <div class="header">
            <div>
                <div class="brand">Tesla Charge ID</div>
                <div class="muted">Charging Invoice</div>
            </div>
            <div>
                <div class="muted">Amount Paid</div>
                <div class="amount">${invoice.amount} TND</div>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <div class="label">Invoice ID</div>
                <div class="value">${invoice.id}</div>
            </div>
            <div class="card">
                <div class="label">Reservation ID</div>
                <div class="value">${invoice.reservation_id}</div>
            </div>
            <div class="card">
                <div class="label">Station</div>
                <div class="value">${invoice.station_name}</div>
            </div>
            <div class="card">
                <div class="label">Vehicle</div>
                <div class="value">${vehicleMatricule || 'Unknown vehicle'}</div>
            </div>
            <div class="card">
                <div class="label">Reservation Slot</div>
                <div class="value">${formatDateTime(invoice.date_reserve, invoice.heur_reserve)}</div>
            </div>
            <div class="card">
                <div class="label">Paid At</div>
                <div class="value">${formatDateTime(null, null, invoice.paid_at)}</div>
            </div>
        </div>

        <div class="footer">
            This document confirms that the charging reservation was paid successfully.
        </div>
    </div>
</body>
</html>
`;

const Invoices = () => {
    const navigate = useNavigate();
    const [carInfo, setCarInfo] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

        const fetchInvoices = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await reservationService.getInvoicesByCarId(carInfo.id);
                setInvoices(data || []);
            } catch (err) {
                setError('Unable to load invoices right now.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchInvoices();
    }, [carInfo]);

    const handlePrintInvoice = (invoice) => {
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
            setError('Unable to open the print window. Please allow popups and try again.');
            return;
        }

        printWindow.document.open();
        printWindow.document.write(buildPrintableInvoice(invoice, carInfo?.matricule));
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    };

    return (
        <div className="invoices-page">
            <div className="invoices-layout">
                <AppSidebar />

                <div className="invoices-content">
                    <header className="invoices-hero">
                        <div>
                            <div className="invoices-kicker">Billing archive</div>
                            <h1>Invoices</h1>
                            <p>
                                Every paid reservation stays here as an invoice record. This gives the driver
                                a clean history without cluttering the active reservations page.
                            </p>
                        </div>
                    </header>

                    {error && (
                        <div className="invoices-error">
                            <span>{error}</span>
                            <button onClick={() => setError(null)}>Dismiss</button>
                        </div>
                    )}

                    {loading ? (
                        <div className="invoices-panel">
                            <div className="invoices-loading">Loading invoice history...</div>
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="invoices-panel invoices-empty">
                            <h2>No invoices yet</h2>
                            <p>
                                Once a completed reservation is paid, it will appear here with the amount and
                                payment date.
                            </p>
                        </div>
                    ) : (
                        <section className="invoice-list">
                            {invoices.map((invoice) => (
                                <article key={invoice.id} className="invoice-card">
                                    <div className="invoice-card-header">
                                        <div>
                                            <span className="invoice-badge">Paid</span>
                                            <h2>{invoice.station_name}</h2>
                                        </div>
                                        <div className="invoice-card-actions">
                                            <div className="invoice-amount">{invoice.amount} TND</div>
                                            <button
                                                className="invoice-print-button"
                                                onClick={() => handlePrintInvoice(invoice)}
                                            >
                                                Print invoice
                                            </button>
                                        </div>
                                    </div>

                                    <div className="invoice-meta">
                                        <div>
                                            <span className="invoice-label">Payment date</span>
                                            <strong>{formatDateTime(null, null, invoice.paid_at)}</strong>
                                        </div>
                                        <div>
                                            <span className="invoice-label">Reservation slot</span>
                                            <strong>{formatDateTime(invoice.date_reserve, invoice.heur_reserve)}</strong>
                                        </div>
                                        <div>
                                            <span className="invoice-label">Invoice ID</span>
                                            <strong>{invoice.id.slice(0, 8).toUpperCase()}</strong>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Invoices;
