// VisePanda i18n — English-only compatibility layer
const I18N = {
    en: {
        title: 'VisePanda — AI China Travel Planner 🇨🇳',
        metaDesc: 'Plan your China trip with AI. Get personalized itineraries, local food recommendations, hotel tips. Beijing, Shanghai, Chengdu, Yunnan — tell us where and how long.',
        signIn: 'Sign in',
        signOut: 'Sign out',
        googleLogin: 'Google',
        emailLogin: 'Email',
        continueWithGoogle: 'Continue with Google',
        googleNote: 'For users outside mainland China',
        emailPlaceholder: 'Email address',
        passwordPlaceholder: 'Password (6+ characters)',
        passwordHint: 'At least 6 characters',
        signInEmail: 'Sign in with Email',
        signUpEmail: 'Create Account',
        signUpInstead: 'Create account instead',
        signInInstead: 'Sign in instead',
        noAccount: 'No account?',
        keepAsGuest: 'Continue as guest',
        fillFields: 'Please enter email and password',
        loadingAuth: 'Please wait…',
        authError: 'Authentication failed. Please try again.',
        networkError: 'Network error. Check your connection.',
        phoneLogin: 'Phone',
        phonePlaceholder: 'Phone number',
        codePlaceholder: '6-digit code',
        sendCode: 'Send Code',
        signInPhone: 'Login with SMS',
        fillPhone: 'Please enter phone number',
        codeSent: 'Code sent! Check your phone',
        recentTrips: 'Your recent trips',
        heroTitle: 'Plan your China trip 🐼',
        heroSub: 'AI-powered travel planner for China. Just say where and how long.',
        inputPlaceholder: 'e.g. Beijing 5 days, food+history, relaxed pace…',
        startBtn: 'Start',
        guestHint: 'Email · Phone · Google · Continue as guest',
        footer: 'Try without login — last 3 trips saved locally. Login to sync across devices.',
        chatTitle: 'Chat · VisePanda — AI China Travel Planner',
        chatMeta: 'Chat with VisePanda AI to plan your China trip. Get day-by-day itineraries, food guides, and practical travel tips.',
        tripsBtn: 'Trips',
        clearBtn: 'Clear',
        homeBtn: 'Home',
        welcomeTitle: '👋 Welcome to VisePanda',
        welcomeSub: 'Your AI travel planner for China. Ask me anything!',
        inputMsgPlaceholder: 'Type a message…',
        sendBtn: 'Send',
        connFailed: 'Connection failed. Check your network.',
        retry: 'Retry',
        error: 'Error',
        loading: 'Loading services… please wait or ',
        refresh: 'refresh',
        tripsTitle: 'My Trips · VisePanda',
        tripsHeading: 'My Trips',
        noTrips: 'No trips yet.',
        startPlanning: 'Start Planning',
        failedLoad: 'Failed to load trips.',
        shareBtn: '🔗 Share',
        renameBtn: '✏️ Rename',
        deleteBtn: '🗑 Delete',
        sharePrompt: 'Share link:',
        shareFailed: 'Failed to share',
        renamePrompt: 'Rename trip:',
        deleteConfirm: 'Delete this trip and all messages?',
        messages: 'messages',
        homeLink: 'Home',
        signingIn: 'Signing in…',
        redirecting: 'Redirecting…',
        shareTitleSuffix: '· VisePanda',
        shareAI: 'AI-planned trip',
        planYourOwn: 'Plan your own trip',
        notFoundTitle: '404 — VisePanda',
        notFound: 'Page not found',
        backHome: 'Back home',
        langLabel: 'EN',
    }
};

let LANG = 'en';

function t(key) {
    return I18N.en[key] || key;
}

function setLang() {
    LANG = 'en';
    localStorage.setItem('vp_lang', 'en');
    location.reload();
}

function i18nInit() {
    localStorage.setItem('vp_lang', 'en');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', i18nInit);
} else {
    i18nInit();
}
