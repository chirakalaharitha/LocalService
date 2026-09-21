import React, { useState, useRef, useEffect } from 'react';
import CurrentLocationButton from './CurrentLocationButton';
import LocationSearch from './LocationSearch';
import MapView from './MapView';
import LocationSummary from './LocationSummary';
import { reverseGeocode } from '../../services/locationService';
import { HiOutlinePencilAlt, HiOutlineMap, HiOutlineCheck } from 'react-icons/hi';

/**
 * LocationPicker Component
 * Comprehensive interactive location selector for service request creation.
 */
const LocationPicker = ({
  location = null, // { lat, lng, address, city, state, pincode, accuracy }
  onChange = null,
  disabled = false
}) => {
  const [geocoding, setGeocoding] = useState(false);
  const [manualEdit, setManualEdit] = useState(false);
  const reverseAbortRef = useRef(null);

  // Trigger reverse geocoding for coordinates
  const handleCoordinatesSelected = async (lat, lng, accuracy = null) => {
    // Cancel prior reverse geocode request
    if (reverseAbortRef.current) {
      reverseAbortRef.current.abort();
    }
    reverseAbortRef.current = new AbortController();

    setGeocoding(true);

    try {
      const geoResult = await reverseGeocode(lat, lng, reverseAbortRef.current.signal);
      if (geoResult && onChange) {
        onChange({
          lat,
          lng,
          address: geoResult.address || location?.address || '',
          city: geoResult.city || location?.city || '',
          state: geoResult.state || location?.state || '',
          pincode: geoResult.pincode || location?.pincode || '',
          accuracy: accuracy !== null ? accuracy : location?.accuracy || null
        });
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Reverse geocoding failed, keeping selected coordinates:', err);
        // Still keep the coordinates even if reverse geocoding had network issues
        if (onChange) {
          onChange({
            lat,
            lng,
            address: location?.address || 'Selected location on map',
            city: location?.city || '',
            state: location?.state || '',
            pincode: location?.pincode || '',
            accuracy: accuracy !== null ? accuracy : location?.accuracy || null
          });
        }
      }
    } finally {
      setGeocoding(false);
    }
  };

  // Called when user selects result from Nominatim Search
  const handleSearchResultSelected = (item) => {
    if (onChange) {
      onChange({
        lat: item.lat,
        lng: item.lng,
        address: item.address || item.displayName,
        city: item.city || '',
        state: item.state || '',
        pincode: item.pincode || '',
        accuracy: null
      });
    }
  };

  // Called when user clicks or drags marker on map
  const handleMapPositionChange = ({ lat, lng }) => {
    handleCoordinatesSelected(lat, lng, null);
  };

  // Called when current browser location is detected
  const handleLocationDetected = ({ lat, lng, accuracy }) => {
    handleCoordinatesSelected(lat, lng, accuracy);
  };

  // Manual field updates
  const handleManualFieldChange = (field, value) => {
    if (onChange) {
      onChange({
        ...(location || { lat: null, lng: null, accuracy: null }),
        [field]: value
      });
    }
  };

  const isConfirmed = Boolean(
    location &&
    location.lat !== null &&
    location.lat !== undefined &&
    location.lng !== null &&
    location.lng !== undefined &&
    location.address &&
    location.address.trim().length > 0
  );

  return (
    <div className="space-y-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <HiOutlineMap className="text-blue-400 text-lg" />
            <span>Location of Issue *</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Identify the accurate location using device GPS, address search, or by clicking the map.
          </p>
        </div>

        {location && (
          <button
            type="button"
            onClick={() => setManualEdit(!manualEdit)}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
          >
            <HiOutlinePencilAlt className="text-sm text-blue-400" />
            <span>{manualEdit ? 'Hide Manual Edit' : 'Edit Address Details'}</span>
          </button>
        )}
      </div>

      {/* Geolocation Button */}
      <CurrentLocationButton
        onLocationDetected={handleLocationDetected}
        disabled={disabled || geocoding}
      />

      {/* Search Input */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Search Location by Name or Landmark
        </label>
        <LocationSearch
          onSelectLocation={handleSearchResultSelected}
          disabled={disabled || geocoding}
        />
      </div>

      {/* Reverse Geocoding Status Loading Indicator */}
      {geocoding && (
        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2 animate-pulse">
          <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span>Finding address details for selected coordinates...</span>
        </div>
      )}

      {/* Interactive Map */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-semibold uppercase tracking-wider">Interactive Map</span>
          <span>Click anywhere to place or drag marker</span>
        </div>
        <MapView
          position={
            location && location.lat !== null && location.lng !== null
              ? { lat: location.lat, lng: location.lng }
              : null
          }
          onPositionChange={handleMapPositionChange}
          readOnly={disabled}
          label="Reported Issue Location"
          subLabel={location?.address || ''}
          height="320px"
        />
      </div>

      {/* Location Confirmation & Summary */}
      <LocationSummary location={location} isConfirmed={isConfirmed} />

      {/* Manual Address Edit Form (Always available or toggled) */}
      {manualEdit && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 pt-3">
          <div className="text-xs font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>Manual Address Corrections</span>
            <span className="text-[10px] text-slate-500 font-normal">Edit if GPS resolved incompletely</span>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Street / Area / Landmark *</label>
            <input
              type="text"
              value={location?.address || ''}
              onChange={(e) => handleManualFieldChange('address', e.target.value)}
              placeholder="e.g. Near Community Hall, Main Bazar Road"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">City / Town</label>
              <input
                type="text"
                value={location?.city || ''}
                onChange={(e) => handleManualFieldChange('city', e.target.value)}
                placeholder="City"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">State</label>
              <input
                type="text"
                value={location?.state || ''}
                onChange={(e) => handleManualFieldChange('state', e.target.value)}
                placeholder="State"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Pincode</label>
              <input
                type="text"
                value={location?.pincode || ''}
                onChange={(e) => handleManualFieldChange('pincode', e.target.value)}
                placeholder="Pincode"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
