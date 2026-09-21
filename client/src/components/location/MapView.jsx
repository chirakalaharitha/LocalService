import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom pin icon with high visibility
const createPinIcon = (color = '#2563eb') => {
  return L.divIcon({
    className: 'localfix-custom-pin',
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <div style="
          width: 28px;
          height: 28px;
          background: ${color};
          border: 2.5px solid #ffffff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 8px; height: 8px; background: white; border-radius: 50%; transform: rotate(45deg);"></div>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 30],
    popupAnchor: [0, -28]
  });
};

/**
 * Child component to smoothly reposition map view when position prop updates
 */
const MapRecenter = ({ center, zoom }) => {
  const map = useMap();
  const prevCenterRef = useRef(null);

  useEffect(() => {
    if (!center) return;
    const [lat, lng] = center;
    if (
      !prevCenterRef.current ||
      prevCenterRef.current[0] !== lat ||
      prevCenterRef.current[1] !== lng
    ) {
      map.flyTo([lat, lng], zoom || Math.max(map.getZoom(), 15), {
        duration: 1.2
      });
      prevCenterRef.current = [lat, lng];
    }
  }, [center, zoom, map]);

  return null;
};

/**
 * Child component to listen to click events on map
 */
const MapClickHandler = ({ onPositionChange, disabled }) => {
  useMapEvents({
    click(e) {
      if (disabled || !onPositionChange) return;
      onPositionChange({
        lat: Number(e.latlng.lat.toFixed(6)),
        lng: Number(e.latlng.lng.toFixed(6))
      });
    }
  });

  return null;
};

/**
 * Reusable Leaflet Map View Component
 * Supports both interactive picking (drag/click) and read-only viewing.
 */
const MapView = ({
  position = null, // { lat: number, lng: number } | null
  onPositionChange = null, // ({ lat, lng }) => void
  readOnly = false,
  label = 'Selected Location',
  subLabel = '',
  height = '340px',
  zoom = 15,
  pinColor = '#2563eb'
}) => {
  // Neutral overview coordinates (center of India) when no coordinates are set yet
  const neutralCenter = useMemo(() => [20.5937, 78.9629], []);
  const initialCenter = position ? [position.lat, position.lng] : neutralCenter;
  const initialZoom = position ? zoom : 4;

  const markerRef = useRef(null);
  const pinIcon = useMemo(() => createPinIcon(pinColor), [pinColor]);

  // Marker drag event handler
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker && onPositionChange && !readOnly) {
          const latlng = marker.getLatLng();
          onPositionChange({
            lat: Number(latlng.lat.toFixed(6)),
            lng: Number(latlng.lng.toFixed(6))
          });
        }
      }
    }),
    [onPositionChange, readOnly]
  );

  return (
    <div
      style={{ height }}
      className="w-full rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 relative shadow-inner group"
    >
      <MapContainer
        center={initialCenter}
        zoom={initialZoom}
        scrollWheelZoom={!readOnly}
        style={{ height: '100%', width: '100%' }}
        className="z-10"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {position && (
          <>
            <Marker
              ref={markerRef}
              position={[position.lat, position.lng]}
              icon={pinIcon}
              draggable={!readOnly}
              eventHandlers={eventHandlers}
            >
              <Popup autoPan={false}>
                <div className="p-1 text-slate-900 text-xs">
                  <div className="font-bold text-sm text-blue-900 flex items-center gap-1">
                    <span>📍</span>
                    <span>{label}</span>
                  </div>
                  {subLabel && <div className="text-[11px] text-slate-600 mt-0.5">{subLabel}</div>}
                  <div className="text-[10px] text-slate-500 font-mono mt-1 border-t border-slate-200 pt-1">
                    {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                  </div>
                  {!readOnly && (
                    <div className="text-[10px] text-blue-600 font-semibold mt-1">
                      Drag marker to fine-tune location
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
            <MapRecenter center={[position.lat, position.lng]} zoom={zoom} />
          </>
        )}

        <MapClickHandler onPositionChange={onPositionChange} disabled={readOnly} />
      </MapContainer>

      {/* Interactive Helper Overlay Badges */}
      {!readOnly && (
        <div className="absolute bottom-2.5 left-2.5 z-[1000] pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-slate-200 text-[11px] font-medium px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span>
              {position
                ? 'Click anywhere or drag marker to adjust location'
                : 'Click map or use buttons above to pinpoint location'}
            </span>
          </div>
        </div>
      )}

      {/* Read-only Badge for Request Details */}
      {readOnly && (
        <div className="absolute top-2.5 right-2.5 z-[1000] pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 text-teal-300 text-[11px] font-semibold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5">
            <span>📍</span>
            <span>Reported Incident Spot</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
