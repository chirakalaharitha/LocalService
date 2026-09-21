import React from 'react';
import { HiOutlineCheckCircle, HiOutlineExclamationCircle, HiOutlineGlobe, HiOutlineOfficeBuilding } from 'react-icons/hi';

/**
 * LocationSummary
 * Displays dynamic summary of selected location:
 * Address, City, State, Pincode, Latitude, Longitude, and confirmation badge.
 */
const LocationSummary = ({
  location = null, // { lat, lng, address, city, state, pincode, accuracy }
  isConfirmed = false
}) => {
  const hasCoordinates = location && location.lat !== null && location.lat !== undefined && location.lng !== null && location.lng !== undefined;

  return (
    <div className="space-y-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
      {/* Confirmation Status Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Location Details & Verification
        </div>

        {isConfirmed && hasCoordinates ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs shadow-sm">
            <HiOutlineCheckCircle className="text-sm" />
            <span>Location Confirmed ✓</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium text-xs">
            <HiOutlineExclamationCircle className="text-sm" />
            <span>Please select the location of the issue</span>
          </span>
        )}
      </div>

      {hasCoordinates ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
          {/* Street & Postal Information */}
          <div className="space-y-2.5 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[11px]">
              <HiOutlineOfficeBuilding className="text-blue-400 text-sm" />
              <span>Resolved Address</span>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Address</div>
              <div className="font-semibold text-slate-200 mt-0.5 break-words">
                {location.address || 'Manual location selected on map'}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">City</div>
                <div className="font-medium text-slate-300 truncate">{location.city || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">State</div>
                <div className="font-medium text-slate-300 truncate">{location.state || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Pincode</div>
                <div className="font-mono text-slate-300 truncate">{location.pincode || '—'}</div>
              </div>
            </div>
          </div>

          {/* Coordinates Information */}
          <div className="space-y-2.5 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 font-medium text-[11px]">
              <div className="flex items-center gap-1.5">
                <HiOutlineGlobe className="text-teal-400 text-sm" />
                <span>GPS Coordinates</span>
              </div>
              {location.accuracy !== undefined && location.accuracy !== null && (
                <span className="text-[10px] text-emerald-400 font-mono">
                  ±{location.accuracy}m
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Latitude</div>
                <div className="text-blue-400 font-mono font-bold text-xs mt-0.5">
                  {typeof location.lat === 'number' ? location.lat.toFixed(6) : location.lat}
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/80">
                <div className="text-[10px] text-slate-500 uppercase font-bold">Longitude</div>
                <div className="text-teal-400 font-mono font-bold text-xs mt-0.5">
                  {typeof location.lng === 'number' ? location.lng.toFixed(6) : location.lng}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 italic">
              Exact coordinates will be attached to the service request for field staff dispatch.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
          No location selected yet. Use "Detect My Location", search a place, or click on the interactive map below.
        </div>
      )}
    </div>
  );
};

export default LocationSummary;
