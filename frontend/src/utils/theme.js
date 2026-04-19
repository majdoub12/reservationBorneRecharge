const THEME_KEY = 'app-theme';
let themeTransitionTimer = null;

export const getStoredTheme = () => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    return savedTheme === 'light' ? 'light' : 'dark';
};

export const applyTheme = (theme, options = {}) => {
    const { instant = false } = options;

    if (!instant) {
        document.documentElement.setAttribute('data-theme-transitioning', 'true');
        if (themeTransitionTimer) {
            clearTimeout(themeTransitionTimer);
        }
        themeTransitionTimer = window.setTimeout(() => {
            document.documentElement.removeAttribute('data-theme-transitioning');
            themeTransitionTimer = null;
        }, 450);
    }

    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: theme }));
};

export const initializeTheme = () => {
    applyTheme(getStoredTheme(), { instant: true });
};
