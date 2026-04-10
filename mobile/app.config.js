const IS_DEV = process.env.APP_VARIANT === 'development';

export default {
  expo: {
    name: IS_DEV ? 'Prontivus (Dev)' : 'Prontivus',
    slug: 'prontivus-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'prontivus',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: IS_DEV ? 'com.prontivus.mobile.dev' : 'com.prontivus.mobile',
    },
    android: {
      package: IS_DEV ? 'com.prontivus.mobile.dev' : 'com.prontivus.mobile',
      adaptiveIcon: {
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
    },
    plugins: ['expo-router', 'expo-secure-store'],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:3000',
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
      eas: {
        projectId: process.env.EAS_PROJECT_ID ?? '1b3b4556-3a8b-4497-87c1-ac74309b6c17',
      },
    },
  },
};
