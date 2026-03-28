const THEME_KEY = 'app-theme';

export const getStoredTheme = () => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    return savedTheme === 'light' ? 'light' : 'dark';
};

export const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: theme }));
};

export const initializeTheme = () => {
    applyTheme(getStoredTheme());
};
