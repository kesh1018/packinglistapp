import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';
import './index.css';
import App from './App';

// Android 16 is always edge-to-edge: the app draws behind the system bars and
// pads itself with the safe-area insets Capacitor injects. Light icons on our dark UI.
if (Capacitor.isNativePlatform()) {
  SystemBars.setStyle({ style: SystemBarsStyle.Dark }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
