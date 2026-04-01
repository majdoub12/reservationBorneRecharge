import { getAuthHeaders, getReservationApiBaseUrl } from '../utils/auth';

const API_BASE_URL = getReservationApiBaseUrl();

const STATUS_TO_PROGRESS = {
    pending: 0,
    charging_25: 25,
    charging_50: 50,
    charging_75: 75,
    completed: 75
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

const parseReservationDateTime = (dateReserve, heurReserve) => {
    const timeValue = typeof heurReserve === 'string' ? heurReserve.substring(0, 8) : `${heurReserve}`.substring(0, 8);
    return new Date(`${dateReserve}T${timeValue}`);
};

const computeDynamicProgress = (session) => {
    const startDateTime = parseReservationDateTime(session.date_reserve, session.heur_reserve);
    if (Number.isNaN(startDateTime.getTime())) {
        return mapReservationStatusToProgress(session.status);
    }

    const durationMinutes = Number(session.average_duration_hours || 2) * 60;
    const elapsedMinutes = (Date.now() - startDateTime.getTime()) / 60000;

    if (elapsedMinutes <= 0) {
        return mapReservationStatusToProgress(session.status);
    }

    const progress = Math.min(100, Math.round((elapsedMinutes / durationMinutes) * 100));
    return Math.max(mapReservationStatusToProgress(session.status), progress);
};

export const getAllCharging = async () => {
    const response = await fetch(`${API_BASE_URL}/charging`, {
        headers: getAuthHeaders()
    });
    const sessions = await parseResponse(response);

    return sessions.map((session) => ({
        ...session,
        charging_progress: computeDynamicProgress(session),
        charging_time_minutes: Math.round(Number(session.average_duration_hours || 2) * 60),
        charging_status_label: (() => {
            const dynamicProgress = computeDynamicProgress(session);
            if (session.status === 'completed') return 'Payment required';
            if (dynamicProgress >= 75) return 'Charging - 75%';
            if (dynamicProgress >= 50) return 'Charging - 50%';
            if (dynamicProgress >= 25) return 'Charging - 25%';
            return 'Preparing charge';
        })()
    }));
};
