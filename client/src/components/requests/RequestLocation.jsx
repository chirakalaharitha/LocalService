import React from 'react';
import { HiOutlineLocationMarker, HiOutlineGlobe, HiOutlineOfficeBuilding } from 'react-icons/hi';
import MapView from '../location/MapView';

/**
 * RequestLocation Component
 * Displays the reported service request location and read-only interactive map
 * centered strictly on the issue's stored coordinates.
 */
const RequestLocation = ({ location, address, city, state, pincode }) => {
  const coords = location?.coordinates || [];
  // GeoJSON format: coordinates[0] is longitude, coordinates[1] is latitude
  const longitude = coords[0] !== undefined ? Number(coords[0]) : null;
  const latitude = coords[1] !== undefined ? Number(coords[1]) : null;

  const hasCoordinates =
    latitude !== null &&
    longitude !== null &&
    !isNaN(latitude) &&
    !isNaN(longitude);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 text-white font-bold text-base">
          <HiOutlineLocationMarker className="text-blue-400 text-xl" />
          <h2>Incident Location Information</h2>
        </div>
        {hasCoordinates && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <span>📍</span>
            <span>Reported Location</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Address Card */}
        <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold">
            <HiOutlineOfficeBuilding className="text-blue-400 text-sm" />
            <span>Reported Street Address</span>
          </div>

          <div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Address</div>
            <div className="font-semibold text-slate-200 text-sm mt-0.5 break-words">
              {address || 'No specific street address provided'}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">City</div>
              <div className="font-medium text-slate-300 truncate">{city || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">State</div>
              <div className="font-medium text-slate-300 truncate">{state || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-semibold">Pincode</div>
              <div className="font-mono text-slate-300 truncate">{pincode || '—'}</div>
            </div>
          </div>
        </div>

        {/* Coordinates Card */}
        <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-xs">
            <HiOutlineGlobe className="text-teal-400 text-base" />
            <span>Geographic Coordinates</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono">
              <div className="text-[10px] text-slate-500 uppercase">Latitude</div>
              <div className="text-blue-400 font-bold">
                {latitude !== null ? latitude.toFixed(6) : 'N/A'}
              </div>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono">
              <div className="text-[10px] text-slate-500 uppercase">Longitude</div>
              <div className="text-teal-400 font-bold">
                {longitude !== null ? longitude.toFixed(6) : 'N/A'}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 italic pt-1">
            📍 Coordinates gathered from citizen report. Marker on the map below represents the exact reported location.
          </p>
        </div>
      </div>

      {/* Read-Only Map View of Reported Location */}
      {hasCoordinates ? (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">
              Reported Location Map
            </span>
            <span className="text-[11px] text-slate-500">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </span>
          </div>
          <MapView
            position={{ lat: latitude, lng: longitude }}
            readOnly={true}
            label="Reported Issue Location"
            subLabel={address}
            height="320px"
            zoom={16}
            pinColor="#0d9488"
          />
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
          No GPS coordinates were stored for this request.
        </div>
      )}
    </div>
  );
};

export default RequestLocation;
