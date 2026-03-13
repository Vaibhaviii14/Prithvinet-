import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Component to handle map center updates safely
const ChangeView = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
};

const PollutionHeatmap = ({ data = [], center = [21.2514, 81.6296], zoom = 6 }) => {

    // Function to determine color based on intensity
    const getColor = (intensity) => {
        if (intensity > 100) return '#ef4444'; // Red (Critical)
        if (intensity > 50) return '#eab308'; // Yellow (Moderate)
        return '#00E676'; // Green (Good)
    };

    return (
        <div className="w-full h-full rounded-xl overflow-hidden border border-slate-700/50 shadow-lg relative z-0">
            <MapContainer
                center={center}
                zoom={zoom}
                style={{ height: '100%', width: '100%', background: '#0b1114' }}
                zoomControl={false}
            >
                <ChangeView center={center} zoom={zoom} />

                {/* CartoDB Dark Matter Tile Layer */}
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    subdomains="abcd"
                    maxZoom={19}
                />

                {data.map((point, index) => {
                    if (!point.lat || !point.lng) return null;
                    return (
                    <CircleMarker
                        key={index}
                        center={[point.lat, point.lng]}
                        radius={Math.max(10, Math.min(point.intensity_weight / 4, 30))} // Dynamic radius based on intensity
                        pathOptions={{
                            color: getColor(point.intensity_weight),
                            fillColor: getColor(point.intensity_weight),
                            fillOpacity: 0.6,
                            weight: 2,
                            className: point.has_active_alert ? 'pulse-marker' : ''
                        }}
                    >
                        <Popup className="custom-popup">
                            <div className="text-slate-900 font-sans p-1">
                                <h3 className="font-bold text-sm mb-1">{point.location_name}</h3>
                                <p className="text-xs mb-1">
                                    <span className="font-semibold">Intensity:</span> {point.intensity_weight.toFixed(2)}
                                </p>
                                {point.has_active_alert && (
                                    <span className="inline-block mt-1 px-2 py-0.5 bg-red-500/20 text-red-500 border border-red-500/30 rounded text-[10px] font-bold uppercase tracking-wider">
                                        Active Alert
                                    </span>
                                )}
                            </div>
                        </Popup>
                    </CircleMarker>
                    );
                })}
            </MapContainer>

            {/* Global styles for dark mode popup override if necessary */}
            <style>{`
                .leaflet-popup-content-wrapper, .leaflet-popup-tip {
                    background: #1a2327;
                    color: #e2e8f0;
                }
                .custom-popup .text-slate-900 {
                    color: #e2e8f0 !important;
                }
                .leaflet-container {
                    background: #0b1114;
                }
                
                @keyframes throb {
                    0% {
                        transform: scale(1);
                        fill-opacity: 0.6;
                        stroke-opacity: 1;
                        stroke-width: 2px;
                    }
                    50% {
                        transform: scale(1.3);
                        fill-opacity: 0.8;
                        stroke-opacity: 0.8;
                        stroke-width: 4px;
                    }
                    100% {
                        transform: scale(1);
                        fill-opacity: 0.6;
                        stroke-opacity: 1;
                        stroke-width: 2px;
                    }
                }

                .pulse-marker {
                    animation: throb 1.5s infinite ease-in-out;
                    transform-origin: center;
                    /* In SVG transform-origin doesn't strictly work without box bounding fixes, but Leaflet centers layers */
                }
            `}</style>
        </div>
    );
};

export default PollutionHeatmap;
