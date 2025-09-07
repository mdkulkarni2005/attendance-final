"use client";

import { useEffect, useState } from "react";

interface LocationPopupProps {
  isOpen: boolean;
  onLocationCaptured: (latitude: number, longitude: number, accuracy: number) => void;
  onError: (error: string) => void;
  onClose: () => void;
  title?: string;
  message?: string;
}

export default function LocationPopup({
  isOpen,
  onLocationCaptured,
  onError,
  onClose,
  title = "📍 Location Required",
  message = "We need your location to verify your presence for attendance."
}: LocationPopupProps) {
  const [status, setStatus] = useState<'requesting' | 'success' | 'error' | 'permission-denied'>('requesting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [locationData, setLocationData] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      captureLocation();
    }
  }, [isOpen]);

  async function captureLocation() {
    setStatus('requesting');
    setErrorMessage('');

    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported by this browser");
      }

      console.log('📍 Automatically requesting location...');

      // Request location with enhanced mobile support
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const options = {
          enableHighAccuracy: true,
          timeout: 15000, // 15 seconds
          maximumAge: 30000 // 30 seconds cache
        };

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log('📍 Location captured successfully:', pos.coords);
            resolve(pos);
          },
          (error) => {
            console.error('📍 Location error:', error);
            reject(error);
          },
          options
        );
      });

      const { latitude, longitude, accuracy } = position.coords;
      
      setLocationData({ latitude, longitude, accuracy });
      setStatus('success');
      
      // Call the success callback after a brief delay to show success state
      setTimeout(() => {
        onLocationCaptured(latitude, longitude, accuracy);
      }, 1500);

    } catch (error: any) {
      console.error('Failed to get location:', error);
      setStatus('error');
      
      let errorMsg = '';
      if (error.code === 1) { // PERMISSION_DENIED
        setStatus('permission-denied');
        errorMsg = 'Location permission was denied. Please enable location access in your browser settings.';
      } else if (error.code === 2) { // POSITION_UNAVAILABLE
        errorMsg = 'Location is unavailable. Please check your GPS settings and try again.';
      } else if (error.code === 3) { // TIMEOUT
        errorMsg = 'Location request timed out. Please ensure you have a good signal and try again.';
      } else {
        errorMsg = error.message || 'Failed to get location. Please try again.';
      }
      
      setErrorMessage(errorMsg);
      onError(errorMsg);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-auto shadow-2xl">
        <div className="text-center">
          {/* Header */}
          <div className="mb-4">
            {status === 'requesting' && (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            )}
            
            {status === 'success' && (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            
            {(status === 'error' || status === 'permission-denied') && (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.084 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            )}

            <h2 className="text-xl font-semibold mb-2">
              {status === 'requesting' && '📍 Getting Your Location...'}
              {status === 'success' && '✅ Location Captured!'}
              {status === 'error' && '❌ Location Error'}
              {status === 'permission-denied' && '🚫 Permission Required'}
            </h2>
          </div>

          {/* Content */}
          <div className="mb-6">
            {status === 'requesting' && (
              <div>
                <p className="text-slate-600 mb-4">{message}</p>
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <p className="text-sm text-slate-500 mt-2">Please allow location access when prompted</p>
              </div>
            )}

            {status === 'success' && locationData && (
              <div>
                <p className="text-green-600 mb-4">Location captured successfully!</p>
                <div className="text-sm text-slate-600 space-y-1">
                  <p>📍 Accuracy: ±{Math.round(locationData.accuracy)} meters</p>
                  <p>✅ Proceeding with attendance...</p>
                </div>
              </div>
            )}

            {(status === 'error' || status === 'permission-denied') && (
              <div>
                <p className="text-red-600 mb-4">{errorMessage}</p>
                {status === 'permission-denied' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <h3 className="font-medium text-yellow-800 mb-2">💡 How to enable location:</h3>
                    <ol className="text-sm text-yellow-700 text-left space-y-1">
                      <li>1. Look for a location icon in your browser's address bar</li>
                      <li>2. Click it and select "Allow"</li>
                      <li>3. Or go to Settings → Privacy → Location Services</li>
                      <li>4. Refresh this page and try again</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {status === 'requesting' && (
              <button
                onClick={onClose}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 text-slate-600"
              >
                Cancel
              </button>
            )}

            {(status === 'error' || status === 'permission-denied') && (
              <div className="space-y-2">
                <button
                  onClick={captureLocation}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  🔄 Try Again
                </button>
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            )}

            {status === 'success' && (
              <div className="flex items-center justify-center text-sm text-slate-500">
                <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
