import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.uptima.packingpal',
  appName: 'Packing Pal',
  webDir: 'dist',
  backgroundColor: '#111113',
  android: { backgroundColor: '#111113' },
  plugins: {
    // White suitcase status-bar icon (res/drawable/ic_stat_packingpal.xml) for packing reminders.
    LocalNotifications: {
      smallIcon: 'ic_stat_packingpal',
    },
    // Android 16 enforces edge-to-edge. Capacitor injects --safe-area-inset-* CSS
    // variables, which .safe-top / .safe-bottom use. Light icons on the dark UI.
    SystemBars: {
      insetsHandling: 'css',
      style: 'DARK',
      initialViewportFitValueHint: 'cover',
    },
  },
};

export default config;
