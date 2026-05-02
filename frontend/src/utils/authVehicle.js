const decodeTokenPayload = (token) => {
    if (!token) return null;

    try {
        const parts = token.split('.');
        if (parts.length < 2) return null;

        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map((c) =>
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join('')
        );

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};

export const isTokenSessionValid = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    const payload = decodeTokenPayload(token);
    if (!payload) return false;

    // Check expiry
    if (payload.exp && Number.isFinite(payload.exp)) {
        const nowSeconds = Math.floor(Date.now() / 1000);
        if (nowSeconds >= payload.exp) return false;
    }

    // ✅ Keycloak tokens have preferred_username (matricule)
    // Old custom tokens had vehicleId
    // localStorage always has vehicleId after our OTP fix
    const hasIdentity =
        payload.preferred_username ||  // Keycloak token
        payload.vehicleId ||           // old custom token (foreign flow)
        localStorage.getItem('vehicleId'); // stored after OTP verification

    return Boolean(hasIdentity);
};

export const getVehicleFromToken = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        const parsed = decodeTokenPayload(token);
        if (!parsed) return null;

        // Check expiry
        if (parsed.exp && Number.isFinite(parsed.exp)) {
            const nowSeconds = Math.floor(Date.now() / 1000);
            if (nowSeconds >= parsed.exp) return null;
        }

        console.log('Decoded token payload:', parsed);

        // ✅ Try localStorage first (most reliable after OTP verification)
        const storedVehicleId = localStorage.getItem('vehicleId');

        // ✅ Keycloak token fields
        const isKeycloakToken = Boolean(parsed.preferred_username);

        const vehicleId =
            storedVehicleId ||           // stored after OTP success ← most reliable
            parsed.vehicleId ||          // old custom JWT (foreign flow)
            null;

        const matricule =
            parsed.preferred_username?.toUpperCase() || // Keycloak ← matricule
            parsed.immatricul ||
            parsed.immatricule ||
            parsed.plate ||
            parsed.matricule ||
            'Véhicule Autorisé';

        const model =
            parsed.model ||
            parsed.vehicleModel ||
            parsed.carModel ||
            null;

        if (!vehicleId && !matricule) return null;

        return {
            id: vehicleId,
            matricule,
            model,
            isKeycloak: isKeycloakToken,
            payload: parsed
        };
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};