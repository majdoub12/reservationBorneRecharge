import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'vehicle-app',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'frontend-spa',
};

export const keycloak = new Keycloak(keycloakConfig);

export const initKeycloak = async () => {
  try {
    const authenticated = await keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
      pkceMethod: 'S256',
    });

    if (authenticated) {
      console.log('✅ User authenticated:', keycloak.tokenParsed);
      
      // Store token for API calls
      localStorage.setItem('token', keycloak.token);
      localStorage.setItem('immatricule', keycloak.tokenParsed.preferred_username);
      
      // Setup token refresh
      keycloak.onTokenExpired = () => {
        keycloak.updateToken(30).then(() => {
          localStorage.setItem('token', keycloak.token);
        });
      };
    }

    return authenticated;
  } catch (error) {
    console.error('❌ Keycloak init failed:', error);
    return false;
  }
};

export default keycloak;