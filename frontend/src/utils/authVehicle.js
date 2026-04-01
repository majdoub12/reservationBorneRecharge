const decodeTokenPayload = (token) => {
    if (!token) {
        return null;
    }

    try {
        const parts = token.split('.');
        if (parts.length < 2) {
            return null;
        }

        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

export const isTokenSessionValid = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        return false;
    }

    const payload = decodeTokenPayload(token);
    if (!payload) {
        return false;
    }

    if (payload.exp && Number.isFinite(payload.exp)) {
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (nowSeconds >= payload.exp) {
            return false;
        }
    }

    const vehicleId = payload.vehicleId || payload.email;
    return Boolean(vehicleId);
};

export const getVehicleFromToken = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        return null;
    }

    try {
        const parsed = decodeTokenPayload(token);
        if (!parsed) {
            return null;
        }

        if (parsed.exp && Number.isFinite(parsed.exp)) {
            const nowSeconds = Math.floor(Date.now() / 1000);
            if (nowSeconds >= parsed.exp) {
                return null;
            }
        }

        console.log('Decoded token payload:', parsed);
        const vehicleId = parsed.vehicleId || parsed.email;
        const matricule =
            parsed.immatricul ||
            parsed.immatricule ||
            parsed.plate ||
            parsed.matricule ||
            'Vehicule Autorise';
        const model =
            parsed.model ||
            parsed.vehicleModel ||
            parsed.carModel ||
            null;

        if (!vehicleId) {
            return null;
        }

        return {
            id: vehicleId,
            matricule,
            model,
            payload: parsed
        };
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};
