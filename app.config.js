const path = require('path');

// Load .env from project root
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Also try loading from config folder if it exists
try {
  require('dotenv').config({ path: path.resolve(__dirname, 'src/config/.env') });
} catch (e) {
  // Ignore if config folder .env doesn't exist
}

const geminiApiKey = process.env.GEMINI_API_KEY || '';

if (!geminiApiKey) {
  console.warn('⚠️  GEMINI_API_KEY not found in .env file. AI features will not work.');
} else {
  console.log('✅ GEMINI_API_KEY loaded successfully');
}

module.exports = {
  expo: {
    name: 'HustleOn',
    slug: 'HustleOn',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      geminiApiKey: geminiApiKey,
    },
  },
};

