import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const createStatusIcon = (status) => {
    let baseClass = "h-4 w-4 rounded-full border-2 border-white shadow-md relative";
    let pingClass = "";
    
    if (status === "UNRESOLVED") {
        baseClass += " bg-red-500 absolute top-0 left-0";
        pingClass = `<div class="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></div>`;
    } else if (status === "INSPECTION_PENDING") {
        baseClass += " bg-blue-500 absolute top-0 left-0";
        pingClass = `<div class="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></div>`;
    } else if (status === "ACTION_TAKEN") {
        baseClass += " bg-yellow-500";
    } else {
        baseClass += " bg-green-500";
    }

    const html = (status === "UNRESOLVED" || status === "INSPECTION_PENDING")
        ? `<div class="relative h-4 w-4">${pingClass}<div class="${baseClass}"></div></div>`
        : `<div class="${baseClass}"></div>`;

    return L.divIcon({
        className: 'bg-transparent border-0', // Prevent Leaflet's default white square
        html: html,
        iconSize: [20, 20],
iconAnchor: [10, 10],
        popupAnchor: [0, -10]
    });
};

const StatusMap = ({ data = [], center = [23.2599, 77.4126], zoom = 7 }) => {
    
    // Memoize the mapping so the map isn't completely redrawn on unrelated renders
    const markers = useMemo(() => {
        return data.map(loc => (
            <Marker 
    key={loc.id} 
    position={[Number(loc.lat), Number(loc.lng)]}
    icon={createStatusIcon(loc.marker_status)}
>
                <Popup className="custom-popup">
                    <div className="text-slate-900 min-w-[200px] p-1 font-sans">
                        <h3 className="font-bold border-b border-slate-200 pb-2 mb-2 text-base">{loc.name}</h3>
                        <div className="flex gap-2 mb-3 items-center">
                            <span className="text-xs font-semibold uppercase text-slate-500">Status:</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                loc.marker_status === 'UNRESOLVED' ? 'bg-red-100 text-red-700 border border-red-200' :
                                loc.marker_status === 'INSPECTION_PENDING' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                loc.marker_status === 'ACTION_TAKEN' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                'bg-green-100 text-green-700 border border-green-200'
                            }`}>
                                {loc.marker_status || 'COMPLIANT'}
                            </span>
                        </div>
                        
                        {loc.latest_param ? (
                            <div className="bg-slate-50 rounded p-2 border border-slate-100 text-xs">
                                <p className="font-semibold text-slate-500 mb-1.5 uppercase text-[9px] tracking-widest">Active Breach</p>
                                <div className="flex justify-between items-center bg-white px-1.5 py-0.5 rounded border border-slate-100">
                                    <span className="font-medium text-slate-500">{loc.latest_param}:</span>
                                    <span className="font-bold text-slate-700">{loc.latest_value}</span>
                                </div>
                            </div>
                        ) : loc.latest_reading ? (
                            <div className="bg-slate-50 rounded p-2 border border-slate-100 text-xs">
                                <p className="font-semibold text-slate-500 mb-1.5 uppercase text-[9px] tracking-widest">Latest Reading</p>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                    {Object.entries(loc.latest_reading).slice(0, 6).map(([k, v]) => (
                                        <div key={k} className="flex justify-between items-center bg-white px-1.5 py-0.5 rounded border border-slate-100">
                                            <span className="font-medium text-slate-500">{k}:</span>
                                            <span className="font-bold text-slate-700">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic">No telemetry data available.</p>
                        )}
                    </div>
                </Popup>
            </Marker>
        ));
    }, [data]);

    return (
        <MapContainer 
            center={center} 
            zoom={zoom} 
            scrollWheelZoom={true}
            className="w-full h-full z-10" 
            style={{ backgroundColor: '#0b1114' }}
        >
            {/* CartoDB Positron - Light and clean to let colors pop */}
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
            />
            {markers}
        </MapContainer>
    );
};

export default StatusMap;
