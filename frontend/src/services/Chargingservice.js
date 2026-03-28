const API_BASE_URL = 'http://localhost:5000/api/reservations';

const STATUS_TO_PROGRESS = {
    pending: 0,
    charging_25: 25,
    charging_50: 50,
    charging_75: 75,
    completed: 100
};

const parseResponse = async (response) => {
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(payload?.message || `HTTP error! status: ${response.status}`);
    }

    return payload?.data ?? [];
};

export const mapReservationStatusToProgress = (status) => STATUS_TO_PROGRESS[status] ?? 0;

export const estimateTimeRemaining = (chargingProgress, stationDurationHours = 2) => {
    const totalMinutes = Math.round(Number(stationDurationHours || 2) * 60);
    const remainingPercent = Math.max(0, 100 - Number(chargingProgress || 0));
    return Math.round(totalMinutes * (remainingPercent / 100));
};

export const getAllCharging = async () => {
    const response = await fetch(`${API_BASE_URL}/charging`);
    const sessions = await parseResponse(response);

    return sessions.map((session) => ({
        ...session,
        charging_progress:
            typeof session.charging_progress === 'number'
                ? session.charging_progress
                : mapReservationStatusToProgress(session.status),
        charging_time_minutes: Math.round(Number(session.average_duration_hours || 2) * 60)
    }));
};
