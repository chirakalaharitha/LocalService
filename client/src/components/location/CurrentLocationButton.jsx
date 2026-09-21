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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
        <div className="space-y-0.5 max-w-lg">
          <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <HiOutlineLocationMarker className="text-blue-400 text-sm" />
            <span>Use My Current Location</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            We use your device location to pinpoint where the civic issue is located. Your location is only attached to the service request when you submit it.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDetect}
          disabled={detecting || disabled}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <HiOutlineCheckCircle className="text-base shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <HiOutlineExclamation className="text-base shrink-0 mt-0.5 text-rose-400" />
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
