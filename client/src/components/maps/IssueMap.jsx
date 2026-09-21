import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { HiOutlineLocationMarker } from 'react-icons/hi';

const getCategoryColor = (category) => {
  switch (category) {
    case 'WATER': return '#3b82f6';       // Blue
    case 'ELECTRICITY': return '#eab308'; // Yellow
    case 'ROAD': return '#ef4444';        // Red
    case 'STREET_LIGHT': return '#a855f7';// Purple
    case 'GARBAGE': return '#10b981';     // Green
    case 'DRAINAGE': return '#06b6d4';    // Cyan
    case 'PUBLIC_AREA': return '#ec4899'; // Pink
    default: return '#64748b';            // Slate
  }
};

// Component to dynamically fit map view to markers or center point
const MapBoundsController = ({ requests = [], defaultCenter }) => {
  const map = useMap();

  useEffect(() => {
    const validCoords = requests
      .filter(r => (
        r.location?.coordinates &&
        Array.isArray(r.location.coordinates) &&
        r.location.coordinates.length === 2 &&
        typeof r.location.coordinates[0] === 'number' &&
        typeof r.location.coordinates[1] === 'number' &&
        !isNaN(r.location.coordinates[0]) &&
        !isNaN(r.location.coordinates[1])
      ))
      .map(r => [r.location.coordinates[1], r.location.coordinates[0]]); // Leaflet [lat, lng]

    if (validCoords.length > 1) {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (validCoords.length === 1) {
      map.setView(validCoords[0], 14, { animate: true });
    } else if (defaultCenter && Array.isArray(defaultCenter) && defaultCenter.length === 2) {
      map.setView(defaultCenter, 12, { animate: true });
    }
  }, [requests, defaultCenter, map]);

  return null;
};

const IssueMap = ({ requests = [], center = [16.3067, 80.4365], height = "480px", isHeatmapMode = false }) => {
  // Extract all valid mapped requests
  const mappedRequests = requests.filter(req => (
    req.location?.coordinates &&
    Array.isArray(req.location.coordinates) &&
    req.location.coordinates.length === 2 &&
    typeof req.location.coordinates[0] === 'number' &&
    typeof req.location.coordinates[1] === 'number' &&
    !isNaN(req.location.coordinates[0]) &&
    !isNaN(req.location.coordinates[1])
  ));

  const hasMappedRequests = mappedRequests.length > 0;

  return (
    <div style={{ height }} className="w-full rounded-2xl overflow-hidden border border-slate-700/80 shadow-xl relative">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsController requests={mappedRequests} defaultCenter={center} />

        {isHeatmapMode
          ? mappedRequests.map((req) => {
              const [lng, lat] = req.location.coordinates;
              const color = getCategoryColor(req.category);
              const radius = req.priority === 'CRITICAL' ? 26 : req.priority === 'HIGH' ? 20 : 14;

              return (
                <CircleMarker
                  key={req._id}
                  center={[lat, lng]}
                  radius={radius}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: 0.55,
                    color: color,
                    weight: 1.5
                  }}
                >
                  <Popup>
                    <div className="p-1 text-slate-900 min-w-[180px]">
                      <div className="font-bold text-xs text-slate-900">{req.requestId || 'REQ'}</div>
                      <div className="text-xs font-semibold text-slate-800 line-clamp-1">{req.title}</div>
                      <div className="text-[10px] text-slate-600 mt-1">
                        <span className="font-semibold">{req.category}</span> • <span className="font-semibold">{req.priority}</span> Priority
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Status: <span className="font-bold">{req.status}</span>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })
          : mappedRequests.map((req) => {
              const [lng, lat] = req.location.coordinates;
              const color = getCategoryColor(req.category);

              const customIcon = L.divIcon({
                className: 'custom-map-pin',
                html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.6);"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7]
              });

              return (
                <Marker key={req._id} position={[lat, lng]} icon={customIcon}>
                  <Popup>
                    <div className="p-1 max-w-xs text-slate-900">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-xs text-blue-900">{req.requestId || 'REQ'}</span>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {req.status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="font-bold text-xs text-slate-900 mt-1 line-clamp-1">{req.title}</div>
                      {req.address && (
                        <p className="text-[11px] text-slate-600 line-clamp-2 my-1">
                          📍 {req.address}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                        <span>Category: <strong>{req.category}</strong></span>
                        <span>Priority: <strong>{req.priority}</strong></span>
                      </div>
                      {req.createdAt && (
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          Reported: {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                      )}
                      <div className="mt-2 pt-1 border-t border-slate-200 text-right">
                        <Link to={`/requests/${req.requestId || req._id}`} className="text-blue-600 font-bold hover:underline text-[11px]">
                          View Full Details →
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
      </MapContainer>

      {/* Honest Empty State Overlay */}
      {!hasMappedRequests && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-slate-950/75 backdrop-blur-[2px] pointer-events-none p-4">
          <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 text-center max-w-sm shadow-2xl space-y-2">
            <HiOutlineLocationMarker className="w-10 h-10 text-slate-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">No Mapped Service Requests</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              No mapped service requests available in this jurisdiction matching the active criteria.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueMap;

