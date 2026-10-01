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
    <div className="space-y-3 bg-white border border-[#EFE7E0] rounded-2xl p-4 shadow-sm">
      {/* Confirmation Status Header */}
      <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-3">
        <div className="text-xs font-semibold text-[#29252A] uppercase tracking-wider">
          Location Details & Verification
        </div>

        {isConfirmed && hasCoordinates ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs shadow-sm">
            <HiOutlineCheckCircle className="text-sm" />
            <span>Location Confirmed ✓</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 font-medium text-xs">
            <HiOutlineExclamationCircle className="text-sm" />
            <span>Please select the location of the issue</span>
          </span>
        )}
      </div>

      {hasCoordinates ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
          {/* Street & Postal Information */}
          <div className="space-y-2.5 bg-[#FAF5F0] p-3.5 rounded-xl border border-[#EFE7E0]">
            <div className="flex items-center gap-1.5 text-[#6B4E71] font-medium text-[11px]">
              <HiOutlineOfficeBuilding className="text-[#C65F63] text-sm" />
              <span>Resolved Address</span>
            </div>

            <div>
              <div className="text-[10px] text-[#6B4E71]/70 uppercase font-bold">Address</div>
              <div className="font-semibold text-[#29252A] mt-0.5 break-words">
                {location.address || 'Manual location selected on map'}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#EFE7E0] text-[11px]">
              <div>
                <div className="text-[10px] text-[#6B4E71]/70 uppercase font-semibold">City</div>
                <div className="font-medium text-[#29252A] truncate">{location.city || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#6B4E71]/70 uppercase font-semibold">State</div>
                <div className="font-medium text-[#29252A] truncate">{location.state || '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-[#6B4E71]/70 uppercase font-semibold">Pincode</div>
                <div className="font-mono text-[#29252A] truncate">{location.pincode || '—'}</div>
              </div>
            </div>
          </div>

          {/* Coordinates Information */}
          <div className="space-y-2.5 bg-[#FAF5F0] p-3.5 rounded-xl border border-[#EFE7E0]">
            <div className="flex items-center justify-between text-[#6B4E71] font-medium text-[11px]">
              <div className="flex items-center gap-1.5">
                <HiOutlineGlobe className="text-[#C65F63] text-sm" />
                <span>GPS Coordinates</span>
              </div>
              {location.accuracy !== undefined && location.accuracy !== null && (
                <span className="text-[10px] text-emerald-700 font-mono">
                  ±{location.accuracy}m
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-[#EFE7E0]">
                <div className="text-[10px] text-[#6B4E71]/70 uppercase font-bold">Latitude</div>
                <div className="text-[#C65F63] font-mono font-bold text-xs mt-0.5">
                  {typeof location.lat === 'number' ? location.lat.toFixed(6) : location.lat}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-[#EFE7E0]">
                <div className="text-[10px] text-[#6B4E71]/70 uppercase font-bold">Longitude</div>
                <div className="text-[#6B4E71] font-mono font-bold text-xs mt-0.5">
                  {typeof location.lng === 'number' ? location.lng.toFixed(6) : location.lng}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-[#6B4E71]/80 italic">
              Exact coordinates will be attached to the service request for field staff dispatch.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-xs text-[#6B4E71] bg-[#FAF5F0] rounded-xl border border-dashed border-[#EFE7E0]">
          No location selected yet. Use "Detect My Location", search a place, or click on the interactive map below.
        </div>
      )}
    </div>
  );
};

export default LocationSummary;
