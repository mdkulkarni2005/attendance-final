// Device fingerprinting utilities for browser
export function generateDeviceFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx!.textBaseline = 'top';
  ctx!.font = '14px Arial';
  ctx!.fillText('Device fingerprint', 2, 2);
  
  // Get hardware concurrency (CPU cores)
  const hardwareConcurrency = navigator.hardwareConcurrency || 0;
  
  // Get memory info if available (Chrome)
  const memory = (navigator as any).deviceMemory || 0;
  
  // Get connection info if available
  const connection = (navigator as any).connection;
  const connectionType = connection ? connection.effectiveType : 'unknown';
  
  return {
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
    hardwareConcurrency,
    deviceMemory: memory,
    connectionType,
    canvasFingerprint: canvas.toDataURL(),
    // Add more persistent identifiers
    screenPixelRatio: window.devicePixelRatio,
    availableScreenSize: `${screen.availWidth}x${screen.availHeight}`,
  };
}

export function getDeviceInfo() {
  const ua = navigator.userAgent.toLowerCase();
  
  // Detect device type and browser
  let device = "Unknown Device";
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  
  // Operating System detection
  if (ua.includes('windows')) os = "Windows";
  else if (ua.includes('macintosh')) os = "macOS";
  else if (ua.includes('linux')) os = "Linux";
  else if (ua.includes('android')) os = "Android";
  else if (ua.includes('iphone') || ua.includes('ipad')) os = "iOS";
  
  // Device detection
  if (ua.includes('iphone')) device = "iPhone";
  else if (ua.includes('ipad')) device = "iPad";
  else if (ua.includes('android')) {
    if (ua.includes('mobile')) device = "Android Phone";
    else device = "Android Tablet";
  }
  else if (ua.includes('windows')) device = "Windows PC";
  else if (ua.includes('macintosh')) device = "Mac";
  else if (ua.includes('linux')) device = "Linux PC";
  
  // Browser detection
  if (ua.includes('chrome') && !ua.includes('edg')) browser = "Chrome";
  else if (ua.includes('firefox')) browser = "Firefox";
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = "Safari";
  else if (ua.includes('edg')) browser = "Edge";
  else if (ua.includes('opera')) browser = "Opera";
  
  return {
    deviceName: `${browser} on ${device}`,
    browser,
    device,
    os,
    isMobile: /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua),
  };
}

// Generate a comprehensive device-specific ID that's hard to spoof
export function generateClientDeviceId(): string {
  const fingerprint = generateDeviceFingerprint();
  
  // Combine multiple hardware and software characteristics
  const components = [
    fingerprint.userAgent,
    fingerprint.screenResolution,
    fingerprint.timezone,
    fingerprint.platform,
    fingerprint.hardwareConcurrency.toString(),
    fingerprint.deviceMemory.toString(),
    fingerprint.screenPixelRatio.toString(),
    fingerprint.availableScreenSize,
    fingerprint.canvasFingerprint.slice(-20), // Last 20 chars of canvas fingerprint
    // Add browser-specific entropy
    window.navigator.cookieEnabled.toString(),
    window.navigator.doNotTrack || 'null',
    window.screen.orientation?.type || 'unknown',
  ];
  
  // Create a more complex hash
  const combined = components.join('|');
  let hash = 0;
  
  // Better hash function
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Add timestamp component to make it unique per first registration
  const timestamp = Date.now().toString(36);
  
  return `device_${Math.abs(hash).toString(36)}_${timestamp}`;
}

// Store device ID in multiple locations for persistence
export function getStoredDeviceId(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Check multiple storage locations
  const fromLocalStorage = localStorage.getItem('device_id');
  const fromSessionStorage = sessionStorage.getItem('device_id');
  
  // Return the first available ID
  return fromLocalStorage || fromSessionStorage;
}

export function setStoredDeviceId(deviceId: string): void {
  if (typeof window === 'undefined') return;
  
  // Store in multiple locations for redundancy
  localStorage.setItem('device_id', deviceId);
  sessionStorage.setItem('device_id', deviceId);
  
  // Also store in a cookie as backup
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1); // 1 year
  document.cookie = `device_fingerprint=${deviceId}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

// Clear all device data (for testing/debugging only)
export function clearDeviceData(): void {
  if (typeof window === 'undefined') return;
  
  localStorage.removeItem('device_id');
  sessionStorage.removeItem('device_id');
  document.cookie = 'device_fingerprint=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

// Check if device data has been tampered with
export function validateStoredDeviceId(): boolean {
  if (typeof window === 'undefined') return false;
  
  const localId = localStorage.getItem('device_id');
  const sessionId = sessionStorage.getItem('device_id');
  
  // If both exist, they should match
  if (localId && sessionId && localId !== sessionId) {
    console.warn('🚨 Device ID mismatch detected - possible tampering');
    return false;
  }
  
  return true;
}
