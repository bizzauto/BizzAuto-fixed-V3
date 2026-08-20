// Mobile Capacitor App Utilities
// This file handles native mobile features when running inside Capacitor

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Share } from '@capacitor/share';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Check if running on native mobile
const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();

export const MobileApp = {
  isNative: () => isNative,
  platform: () => platform,
  isAndroid: () => platform === 'android',
  isIOS: () => platform === 'ios',

  // Initialize mobile app
  async init() {
    if (!isNative) return;

    try {
      // Set status bar style
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0F172A' });

      // Hide splash screen after app is ready
      await SplashScreen.hide();
    } catch (err) {
      console.log('Mobile init error:', err);
    }
  },

  // Share content
  async shareContent(title: string, text: string, url?: string) {
    if (!isNative) {
      // Fallback: use Web Share API
      if (navigator.share) {
        try {
          await navigator.share({ title, text, url });
        } catch (e) {
          // User cancelled
        }
      }
      return;
    }

    try {
      await Share.share({ title, text, url });
    } catch (err) {
      console.log('Share error:', err);
    }
  },

  // Take photo
  async takePhoto(): Promise<string | null> {
    if (!isNative) return null;

    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 80,
      });
      return photo.dataUrl || null;
    } catch (err) {
      console.log('Camera error:', err);
      return null;
    }
  },

  // Pick from gallery
  async pickImage(): Promise<string | null> {
    if (!isNative) return null;

    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        quality: 80,
      });
      return photo.dataUrl || null;
    } catch (err) {
      console.log('Gallery error:', err);
      return null;
    }
  },

  // Get safe area insets for notches
  getSafeAreaInsets() {
    const style = getComputedStyle(document.documentElement);
    return {
      top: parseInt(style.getPropertyValue('--sat') || '0'),
      bottom: parseInt(style.getPropertyValue('--sab') || '0'),
      left: parseInt(style.getPropertyValue('--sal') || '0'),
      right: parseInt(style.getPropertyValue('--sar') || '0'),
    };
  },
};

// Export for easy import
export default MobileApp;
