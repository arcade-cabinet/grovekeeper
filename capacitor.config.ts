import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.grovekeeper.app',
  appName: 'Grove Keeper',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Haptics: {
      // Haptics plugin configuration
    },
    Device: {
      // Device plugin configuration  
    }
  }
};

export default config;
