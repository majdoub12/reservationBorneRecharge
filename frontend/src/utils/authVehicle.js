export const getVehicleFromToken = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        return null;
    }

    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const parsed = JSON.parse(jsonPayload);
        console.log('Decoded token payload:', parsed);
        const vehicleId = parsed.vehicleId || parsed.email;

        if (!vehicleId) {
            return null;
        }

        return {
            id: vehicleId,
            matricule: parsed.immatricule ? parsed.immatricule : 'Vehicule Autorise',
            payload: parsed
        };
    } catch (error) {
        console.error('Error decoding token:', error);
        return null;
    }
};
