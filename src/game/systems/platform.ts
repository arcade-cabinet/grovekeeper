/**
 * Platform Detection & Native Integration
 * 
 * Handles Capacitor integration for native features:
 * - Device detection (iOS, Android, Web)
 * - Haptic feedback
 * - Safe area insets
 */

import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// ============================================
// Platform Types
// ============================================

export type PlatformType = 'ios' | 'android' | 'web';

export interface DeviceInfo {
  platform: PlatformType;
  isNative: boolean;
  model: string;
  osVersion: string;
  manufacturer: string;
  isVirtual: boolean;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

// ============================================
// Platform State
// ============================================

let deviceInfo: DeviceInfo | null = null;
let hapticsEnabled = true;
let safeAreaInsets: SafeAreaInsets = { top: 0, bottom: 0, left: 0, right: 0 };

// ============================================
// Initialization
// ============================================

export const initializePlatform = async (): Promise<DeviceInfo> => {
  const platform = Capacitor.getPlatform() as PlatformType;
  const isNative = Capacitor.isNativePlatform();
  
  let info: DeviceInfo = {
    platform,
    isNative,
    model: 'Unknown',
    osVersion: 'Unknown',
    manufacturer: 'Unknown',
    isVirtual: false,
  };
  
  try {
    if (isNative) {
      const deviceDetails = await Device.getInfo();
      info = {
        platform,
        isNative,
        model: deviceDetails.model,
        osVersion: deviceDetails.osVersion,
        manufacturer: deviceDetails.manufacturer,
        isVirtual: deviceDetails.isVirtual,
      };
    } else {
      // Web fallback - detect from user agent
      const ua = navigator.userAgent;
      const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
      const isIOS = /iPhone|iPad|iPod/i.test(ua);
      
      info = {
        platform: 'web',
        isNative: false,
        model: isMobile ? (isIOS ? 'iOS Browser' : 'Android Browser') : 'Desktop Browser',
        osVersion: navigator.platform,
        manufacturer: 'Browser',
        isVirtual: false,
      };
    }
  } catch (error) {
    console.warn('Failed to get device info:', error);
  }
  
  deviceInfo = info;
  
  // Get safe area insets
  updateSafeAreaInsets();
  
  return info;
};

const updateSafeAreaInsets = () => {
  // Read CSS env variables for safe area
  const computedStyle = getComputedStyle(document.documentElement);
  
  // Use fallback values if CSS env vars are not supported
  safeAreaInsets = {
    top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10) || 
         (deviceInfo?.platform === 'ios' ? 44 : 0),
    bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10) ||
            (deviceInfo?.platform === 'ios' ? 34 : 0),
    left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10) || 0,
    right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10) || 0,
  };
};

// ============================================
// Getters
// ============================================

export const getDeviceInfo = (): DeviceInfo | null => deviceInfo;
export const getPlatform = (): PlatformType => deviceInfo?.platform ?? 'web';
export const isNative = (): boolean => deviceInfo?.isNative ?? false;
export const isIOS = (): boolean => deviceInfo?.platform === 'ios';
export const isAndroid = (): boolean => deviceInfo?.platform === 'android';
export const isWeb = (): boolean => deviceInfo?.platform === 'web';
export const getSafeAreaInsets = (): SafeAreaInsets => safeAreaInsets;

// ============================================
// Haptics
// ============================================

export const setHapticsEnabled = (enabled: boolean) => {
  hapticsEnabled = enabled;
};

export const isHapticsEnabled = (): boolean => hapticsEnabled;

/**
 * Light haptic feedback - for UI interactions
 */
export const hapticLight = async (): Promise<void> => {
  if (!hapticsEnabled) return;
  
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  } catch (_error) {
    // Haptics not supported, silently fail
  }
};

/**
 * Medium haptic feedback - for important actions
 */
export const hapticMedium = async (): Promise<void> => {
  if (!hapticsEnabled) return;
  
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  } catch (_error) {
    // Haptics not supported, silently fail
  }
};

/**
 * Heavy haptic feedback - for significant events
 */
export const hapticHeavy = async (): Promise<void> => {
  if (!hapticsEnabled) return;
  
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } else if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  } catch (_error) {
    // Haptics not supported, silently fail
  }
};

/**
 * Selection haptic - for selection changes
 */
export const hapticSelection = async (): Promise<void> => {
  if (!hapticsEnabled) return;
  
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.selectionStart();
      await Haptics.selectionChanged();
      await Haptics.selectionEnd();
    } else if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  } catch (_error) {
    // Haptics not supported, silently fail
  }
};

/**
 * Success notification haptic
 */
export const hapticSuccess = async (): Promise<void> => {
  if (!hapticsEnabled) return;
  
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({ type: NotificationType.Success });
    } else if ('vibrate' in navigator) {
      navigator.vibrate([20, 50, 20]);
    }
  } catch (_error) {
    // Haptics not supported, silently fail
  }
};

/**
 * Warning notification haptic
 */
export const hapticWarning = async (): Promise<void> => {
  if (!hapticsEnabled) return;
  
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({ type: NotificationType.Warning });
    } else if ('vibrate' in navigator) {
      navigator.vibrate([30, 30, 30]);
    }
  } catch (_error) {
    // Haptics not supported, silently fail
  }
};

/**
 * Error notification haptic
 */
export const hapticError = async (): Promise<void> => {
  if (!hapticsEnabled) return;
  
  try {
    if (Capacitor.isNativePlatform()) {
      await Haptics.notification({ type: NotificationType.Error });
    } else if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50, 30, 50]);
    }
  } catch (_error) {
    // Haptics not supported, silently fail
  }
};

// ============================================
// Responsive Helpers
// ============================================

export const getResponsiveScale = (): number => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const minDimension = Math.min(width, height);
  
  // Scale factor based on screen size
  if (minDimension < 375) return 0.85;
  if (minDimension < 414) return 0.9;
  if (minDimension < 768) return 1.0;
  if (minDimension < 1024) return 1.1;
  return 1.2;
};

export const isMobileDevice = (): boolean => {
  if (deviceInfo?.isNative) return true;
  return window.innerWidth < 768 || 'ontouchstart' in window;
};

export const isTabletDevice = (): boolean => {
  const width = window.innerWidth;
  return width >= 768 && width < 1024;
};

export const isDesktopDevice = (): boolean => {
  return window.innerWidth >= 1024;
};
