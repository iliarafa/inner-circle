import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.innercircle.app',
  appName: 'inner circle',
  webDir: 'dist',
  server: {
    // During development, point to your local Vite dev server
    // url: 'http://YOUR_LOCAL_IP:5173',
    // cleartext: true,
  },
};

export default config;
