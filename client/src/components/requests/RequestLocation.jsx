import React from 'react';
import { HiOutlineLocationMarker, HiOutlineGlobe, HiOutlineOfficeBuilding } from 'react-icons/hi';
import MapView from '../location/MapView';

/**
 * RequestLocation Component
 * Displays the reported service request location and read-only interactive map
 * centered strictly on the issue's stored coordinates.
 */
const RequestLocation = ({ location, address, city, district, state, pincode, municipality }) => {
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
    <div className="bg-white border border-[#EFE7E0] rounded-3xl p-6 sm:p-8 space-y-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#EFE7E0] pb-4">
        <div className="flex items-center gap-2 text-[#29252A] font-black text-base">
          <HiOutlineLocationMarker className="text-[#C65F63] text-xl" />
          <h2>Incident Location Information</h2>
        </div>
        {hasCoordinates && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDECEF] border border-[#C65F63]/20 text-[#C65F63] text-xs font-bold">
            <span>📍</span>
            <span>Reported Location</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Address Card */}
        <div className="space-y-3 bg-[#FAF5F0] p-4 rounded-2xl border border-[#EFE7E0]">
          <div className="flex items-center justify-between text-[#6B666E] text-[11px] font-bold">
            <div className="flex items-center gap-1.5">
              <HiOutlineOfficeBuilding className="text-[#C65F63] text-sm" />
              <span>Reported Street Address</span>
            </div>
            {municipality?.name && (
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#E8D7E6] text-[#6B4E71] font-bold">
                🏛️ {municipality.name}
              </span>
            )}
          </div>

          <div>
            <div className="text-[10px] text-[#9E98A2] uppercase font-bold">Address</div>
            <div className="font-bold text-[#29252A] text-sm mt-0.5 break-words">
              {address || 'No specific street address provided'}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#EFE7E0]">
            <div>
              <div className="text-[10px] text-[#9E98A2] uppercase font-bold">City</div>
              <div className="font-semibold text-[#29252A] truncate">{city || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#9E98A2] uppercase font-bold">District</div>
              <div className="font-semibold text-[#29252A] truncate">{district || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#9E98A2] uppercase font-bold">State</div>
              <div className="font-semibold text-[#29252A] truncate">{state || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#9E98A2] uppercase font-bold">Pincode</div>
              <div className="font-mono font-bold text-[#C65F63] truncate">{pincode || '—'}</div>
            </div>
          </div>
        </div>

        {/* Coordinates Card */}
        <div className="space-y-3 bg-[#FAF5F0] p-4 rounded-2xl border border-[#EFE7E0]">
          <div className="flex items-center gap-1.5 text-[#6B666E] font-bold text-xs">
            <HiOutlineGlobe className="text-[#6B4E71] text-base" />
            <span>Geographic Coordinates</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-white p-2.5 rounded-xl border border-[#EFE7E0] font-mono">
              <div className="text-[10px] text-[#9E98A2] uppercase">Latitude</div>
              <div className="text-[#C65F63] font-bold">
                {latitude !== null ? latitude.toFixed(6) : 'N/A'}
              </div>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-[#EFE7E0] font-mono">
              <div className="text-[10px] text-[#9E98A2] uppercase">Longitude</div>
              <div className="text-[#6B4E71] font-bold">
                {longitude !== null ? longitude.toFixed(6) : 'N/A'}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-[#6B666E] italic pt-1">
            📍 Coordinates gathered from citizen report. Marker on the map below represents the exact reported location.
          </p>
        </div>
      </div>

      {/* Read-Only Map View of Reported Location */}
      {hasCoordinates ? (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-[#6B666E]">
            <span className="font-bold uppercase tracking-wider text-[11px] text-[#29252A]">
              Reported Location Map
            </span>
            <span className="text-[11px] text-[#9E98A2] font-mono">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </span>
          </div>
          <div className="rounded-2xl overflow-hidden border border-[#EFE7E0] shadow-sm">
            <MapView
              position={{ lat: latitude, lng: longitude }}
              readOnly={true}
              label="Reported Issue Location"
              subLabel={address}
              height="320px"
              zoom={16}
              pinColor="#C65F63"
            />
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-[#FAF5F0] border border-[#EFE7E0] text-center text-xs text-[#6B666E]">
          No GPS coordinates were stored for this request.
        </div>
      )}
    </div>
  );
};

export default RequestLocation;
