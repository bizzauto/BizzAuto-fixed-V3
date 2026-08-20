import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.indiacrm.app',
  appName: 'IndiaCRM',
  webDir: 'dist/client',

  // Server URL - change this to your production API URL
  server: {
    // For development, use your local network IP
    // For production, use your actual domain
    // url: 'https://your-server.com',
    cleartext: true, // Allow HTTP in development
    androidScheme: 'https',
  },

  // Android specific
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },

  // iOS specific
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: true,
  },

  // Splash screen config
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      launchFadeOutDuration: 500,
      backgroundColor: '#0F172A',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#10B981',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0F172A',
      overlaysWebView: false,
    },
  },
};

export default config;
