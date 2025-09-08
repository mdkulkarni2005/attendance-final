import { useEffect, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { generateDeviceFingerprint, getStoredDeviceId, setStoredDeviceId, generateClientDeviceId, validateStoredDeviceId } from '@/utils/deviceFingerprint';

export function useDeviceSecurity(studentId: string | null) {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);

  const registerDevice = useMutation(api.deviceSecurity.registerDevice);
  const checkDeviceSecurity = useMutation(api.deviceSecurity.checkDeviceSecurity);
  const validateDeviceOwnership = useMutation(api.deviceSecurity.validateDeviceOwnership);
  const detectSimultaneousUsage = useMutation(api.deviceSecurity.detectSimultaneousDeviceUsage);
  
  const securityAlerts = useQuery(api.deviceSecurity.getSecurityAlerts, 
    studentId ? { studentId: studentId as any } : "skip"
  );
  const studentDevices = useQuery(api.deviceSecurity.getStudentDevices,
    studentId ? { studentId: studentId as any } : "skip"
  );

  useEffect(() => {
    if (!studentId) return;

    async function initializeDevice() {
      setIsRegistering(true);
      setSecurityError(null);
      
      try {
        // STEP 1: Validate stored device data integrity
        if (!validateStoredDeviceId()) {
          throw new Error("Device data tampering detected. Please clear browser data and try again.");
        }

        // STEP 2: Check for stored device ID
        let storedDeviceId = getStoredDeviceId();
        
        // STEP 3: Generate device fingerprint
        const fingerprint = generateDeviceFingerprint();
        
        if (!storedDeviceId) {
          // Generate new device ID if not stored
          storedDeviceId = generateClientDeviceId();
          setStoredDeviceId(storedDeviceId);
        }

        // STEP 4: CRITICAL - Register device and check for ownership violations
        // This will now prevent logout-login abuse by checking persistent device ownership
        const result = await registerDevice({
          studentId: studentId as any,
          deviceData: {
            userAgent: fingerprint.userAgent,
            screenResolution: fingerprint.screenResolution,
            timezone: fingerprint.timezone,
            language: fingerprint.language,
            platform: fingerprint.platform,
          },
        });

        // STEP 5: Validate device ownership (redundant check)
        await validateDeviceOwnership({
          studentId: studentId as any,
          deviceId: result.deviceId,
        });

        // STEP 6: Check for simultaneous device usage
        const simultaneousCheck = await detectSimultaneousUsage({
          studentId: studentId as any,
          currentDeviceId: result.deviceId,
        });

        if (simultaneousCheck.violation) {
          alert(`⚠️ SECURITY WARNING\n\n${simultaneousCheck.message}\n\nDeactivated devices: ${simultaneousCheck.deactivatedDevices}`);
        }

        setDeviceId(result.deviceId);
        setDeviceInfo({
          isNew: result.isNew,
          isTrusted: result.isTrusted,
          deviceOwner: result.deviceOwner,
          ...fingerprint,
        });

        // Update stored device ID with server response
        setStoredDeviceId(result.deviceId);

      } catch (error: any) {
        console.error('Critical device security error:', error);
        setSecurityError(error.message);
        
        // ENHANCED: Clear ALL session data on security violation
        if (error.message.includes('DEVICE PERMANENTLY LOCKED') || 
            error.message.includes('DEVICE SECURITY VIOLATION') || 
            error.message.includes('UNAUTHORIZED DEVICE ACCESS') ||
            error.message.includes('CRITICAL VIOLATION')) {
          
          // Clear all stored credentials and session data
          sessionStorage.removeItem('student');
          localStorage.removeItem('device_id');
          sessionStorage.removeItem('device_id');
          
          // Clear cookies
          document.cookie = 'student-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'device_fingerprint=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          
          // Show error message and redirect
          alert(`🚫 ACCESS DENIED\n\n${error.message}\n\nRedirecting to login page...`);
          
          // Force page reload to login screen after delay
          setTimeout(() => {
            window.location.href = '/student/login';
          }, 2000);
        }
      } finally {
        setIsRegistering(false);
      }
    }

    initializeDevice();
  }, [studentId, registerDevice, validateDeviceOwnership, detectSimultaneousUsage]);

  const checkDevice = async (sessionId?: string, location?: { latitude: number; longitude: number }) => {
    if (!deviceId || !studentId) return null;

    try {
      // Always validate ownership before any operation
      await validateDeviceOwnership({
        studentId: studentId as any,
        deviceId,
      });

      // Check for simultaneous usage
      const simultaneousCheck = await detectSimultaneousUsage({
        studentId: studentId as any,
        currentDeviceId: deviceId,
      });

      if (simultaneousCheck.violation) {
        throw new Error(`Multiple device usage detected. This is strictly prohibited for security reasons.`);
      }

      return await checkDeviceSecurity({
        studentId: studentId as any,
        deviceId,
        sessionId: sessionId as any,
        location,
      });
    } catch (error) {
      console.error('Device security check failed:', error);
      throw error;
    }
  };

  const unreadAlerts = securityAlerts?.filter(alert => !alert.isRead) || [];
  const hasSecurityIssues = unreadAlerts.length > 0 || !!securityError;

  return {
    deviceId,
    deviceInfo,
    isRegistering,
    securityAlerts,
    studentDevices,
    unreadAlerts,
    hasSecurityIssues,
    securityError,
    checkDevice,
  };
}
