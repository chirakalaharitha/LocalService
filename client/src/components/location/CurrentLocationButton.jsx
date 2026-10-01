import React, { useState } from 'react';
import { HiOutlineLocationMarker, HiOutlineCheckCircle, HiOutlineExclamation } from 'react-icons/hi';
import { getCurrentCoordinates } from '../../services/locationService';

/**
 * CurrentLocationButton
 * Requests current coordinates using the Browser Geolocation API
 * Displays permission UX explanation and explicit feedback for all permission/error states.
 */
const CurrentLocationButton = ({ onLocationDetected, disabled = false }) => {
  const [detecting, setDetecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // { type: 'success' | 'error', text: string, accuracy?: number }

  const handleDetect = async () => {
    if (detecting || disabled) return;
    setDetecting(true);
    setStatusMessage(null);

    try {
      const coords = await getCurrentCoordinates();
      setStatusMessage({
        type: 'success',
        text: 'Location detected successfully.',
        accuracy: coords.accuracy
      });

      if (onLocationDetected) {
        onLocationDetected(coords);
      }
    } catch (err) {
      console.warn('Geolocation error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Unable to determine your current location. Please search or select manually.'
      });
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#EFE7E0] p-3.5 rounded-2xl shadow-sm">
        <div className="space-y-0.5 max-w-lg">
          <div className="text-xs font-semibold text-[#29252A] flex items-center gap-1.5">
            <HiOutlineLocationMarker className="text-[#C65F63] text-sm" />
            <span>Use My Current Location</span>
          </div>
          <p className="text-[11px] text-[#29252A]/70 leading-relaxed">
            We use your device location to pinpoint where the civic issue is located. Your location is only attached to the service request when you submit it.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDetect}
          disabled={detecting || disabled}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#C65F63] hover:bg-[#b05256] text-white text-xs font-bold shadow-md shadow-[#C65F63]/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {detecting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Detecting your location...</span>
            </>
          ) : (
            <>
              <HiOutlineLocationMarker className="text-base" />
              <span>Detect My Location</span>
            </>
          )}
        </button>
      </div>

      {/* Dynamic Status Feedback */}
      {statusMessage && (
        <div
          className={`px-3.5 py-2.5 rounded-xl text-xs flex items-start gap-2 border transition ${
            statusMessage.type === 'success'
              ? 'bg-[#5C9A72]/10 border-[#5C9A72]/30 text-[#2E6F46]'
              : 'bg-[#B85450]/10 border-[#B85450]/30 text-[#8B3430]'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <HiOutlineCheckCircle className="text-base shrink-0 mt-0.5 text-[#5C9A72]" />
          ) : (
            <HiOutlineExclamation className="text-base shrink-0 mt-0.5 text-[#B85450]" />
          )}

          <div className="space-y-0.5 flex-1">
            <p className="font-medium">{statusMessage.text}</p>
            {statusMessage.accuracy !== undefined && statusMessage.accuracy !== null && (
              <p className="text-[11px] opacity-80 font-mono">
                Accuracy: approximately {statusMessage.accuracy} meters
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-[11px] opacity-70 hover:opacity-100 ml-1"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default CurrentLocationButton;
