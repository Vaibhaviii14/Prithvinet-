import React, { useState, useEffect } from 'react';
import { MapPin, ShieldCheck, AlertTriangle, Activity } from 'lucide-react';
import api from '../../api/axios';
import StatusMap from '../../components/maps/StatusMap';

const CitizenMap = () => {
    const [mapData, setMapData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPublicData = async () => {
            try {
                // Using the exact same endpoint as it handles RBAC. 
                // For a true public portal, we'd use a dedicated unauthenticated endpoint.
                // Assuming this is wrapped in a public route logically, we will use the master locations
                // for demonstration of public transparency map without revealing raw data.
                
                // Fetch basic locations publicly and mimic status
                const res = await api.get('/api/reports/map-data');
                // Strip out the exact telemetry readings for the public dashboard to maintain industrial secrecy
                const anonymizedData = res.data.map(loc => ({
                    ...loc,
                    latest_reading: null, // Hide raw data from public
                }));

                setMapData(anonymizedData);
            } catch (error) {
                console.error("Failed fetching public map data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPublicData();
    }, []);

    return (
        <div className="min-h-screen bg-[#0b1114] flex flex-col">
            {/* Public Header */}
            <div className="bg-[#1a2327] border-b border-[#263238] px-6 py-4 flex items-center justify-between z-20 shadow-md">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/10 p-2 rounded-lg">
                        <MapPin className="text-emerald-500 w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white tracking-tight">PrithviNet Public Citizen Portal</h1>
                        <p className="text-xs text-slate-400">Live Geo-Spatial Environmental Status Monitor</p>
                    </div>
                </div>
            </div>

            {/* Legend & Info */}
            <div className="bg-[#0b1114] px-6 py-4 border-b border-[#263238] flex gap-6 z-20">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></div>
                    <span className="text-sm text-slate-300 font-medium">Clear / Normal</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500 border border-white"></div>
                    <span className="text-sm text-slate-300 font-medium">Action Taken (Under Review)</span>
                </div>
                <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-red-500 border border-white relative">
                        <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-75"></div>
                     </div>
                    <span className="text-sm text-slate-300 font-medium">Unresolved Breach (Action Required)</span>
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 w-full relative">
                 {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center text-emerald-500">
                        <Activity className="w-8 h-8 animate-spin" />
                    </div>
                ) : (
                    <StatusMap data={mapData} center={[23.2599, 77.4126]} zoom={6} />
                )}
            </div>
            
            <div className="absolute bottom-6 right-6 z-30 bg-[#1a2327]/90 backdrop-blur-md border border-[#263238] p-4 rounded-xl shadow-2xl max-w-sm pointer-events-none">
                <h3 className="text-white font-bold mb-1 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500"/> Transparent Governance</h3>
                <p className="text-xs text-slate-400">
                    Industrial telemetric readings are classified. Marker status indicates current state-level administrative action codes based on automated parameter monitoring thresholds.
                </p>
            </div>
        </div>
    );
};

export default CitizenMap;
