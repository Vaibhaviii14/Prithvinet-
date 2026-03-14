import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { Search, MapPin, Activity, Wind, AlertTriangle, ShieldCheck, ClipboardList, ChevronRight, LogOut } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import bgDark from '../../assets/bg/prithvinet-bg.png';

const API_BASE = 'http://localhost:8000/api/public';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCustomIcon = (status) => {
  const colorMap = { Good: 'bg-emerald-500', Moderate: 'bg-amber-400', Poor: 'bg-orange-500', Severe: 'bg-rose-600 animate-pulse' };
  const bg = colorMap[status] || 'bg-slate-400';
  return L.divIcon({
    className: 'custom-div-icon bg-transparent border-0',
    html: `<div class="w-6 h-6 rounded-full border-2 border-white shadow-md ${bg}"></div>`,
    iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -12]
  });
};

const getMarkerColor = (status) => ({ Good: '#10b981', Moderate: '#fbbf24', Poor: '#f97316', Severe: '#e11d48' }[status] || '#94a3b8');

const getAqiConfig = (aqi) => {
  if (aqi <= 50)  return { color: 'text-emerald-500', level: 'Good' };
  if (aqi <= 100) return { color: 'text-amber-400',   level: 'Moderate' };
  if (aqi <= 200) return { color: 'text-orange-500',  level: 'Poor' };
  return { color: 'text-rose-600', level: 'Severe' };
};

const HealthAdvisory = ({ aqi }) => {
  const configs = [
    { max: 50,  bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-600', Icon: ShieldCheck, msg: 'Air quality is excellent. Great time for outdoor activities!' },
    { max: 100, bg: 'bg-amber-400/10',   border: 'border-amber-400/30',   text: 'text-amber-500',   Icon: Activity,    msg: 'Air quality is acceptable. Sensitive individuals should limit prolonged outdoor exertion.' },
    { max: 200, bg: 'bg-orange-500/10',  border: 'border-orange-500/30',  text: 'text-orange-500',  Icon: Wind,        msg: 'Advisory: Reduce prolonged heavy exertion outdoors. Keep windows closed.' },
    { max: Infinity, bg: 'bg-rose-600/10', border: 'border-rose-600/30', text: 'text-rose-500', Icon: AlertTriangle, msg: 'SEVERE ADVISORY: Avoid all outdoor physical activity. N95 Mask highly recommended.' },
  ];
  const cfg = configs.find(c => aqi <= c.max);
  return (
    <div className={`flex items-center gap-4 ${cfg.bg} border ${cfg.border} ${cfg.text} p-5 rounded-xl`}>
      <cfg.Icon size={28} className="shrink-0" />
      <p className="text-sm font-medium">{cfg.msg}</p>
    </div>
  );
};

export default function CitizenPortal() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const [locationStatus, setLocationStatus] = useState('idle');
  const [localAqiData, setLocalAqiData]     = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [mapData, setMapData]               = useState([]);
  const [mapStatus, setMapStatus]           = useState('loading');

  useEffect(() => {
    axios.get(`${API_BASE}/map-data`)
      .then(r => { setMapData(r.data); setMapStatus('success'); })
      .catch(() => { setMapData([]); setMapStatus('error'); });
  }, []);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await axios.get(`${API_BASE}/predict-aqi`, { params: { lat: latitude, lng: longitude } });
          setLocalAqiData(res.data); setLocationStatus('success');
        } catch { setLocationStatus('error'); }
      },
      () => { alert('Unable to retrieve your location'); setLocationStatus('error'); }
    );
  };

  const handleCitySearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLocationStatus('loading');
    try {
      const isPincode = /^\d{6}$/.test(searchQuery.trim());
      const params = { format: 'json', limit: 1, countrycodes: 'in' };
      if (isPincode) params.postalcode = searchQuery.trim(); else params.q = searchQuery.trim();
      const osmRes = await axios.get('https://nominatim.openstreetmap.org/search', { params });
      if (!osmRes.data.length) { alert('Location not found.'); setLocationStatus('error'); return; }
      const { lat, lon, display_name } = osmRes.data[0];
      const predictRes = await axios.get(`${API_BASE}/predict-aqi`, { params: { lat: parseFloat(lat), lng: parseFloat(lon) } });
      predictRes.data.location_type = display_name.split(',')[0];
      setLocalAqiData(predictRes.data); setLocationStatus('success');
    } catch { setLocationStatus('error'); }
  };

  return (
    <div className="relative min-h-screen overflow-hidden font-sans" style={{ color: 'var(--text-secondary)' }}>

      {/* Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img src={bgDark} alt="" className="w-full h-full object-cover scale-105" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1114]/70 via-[#0b1114]/60 to-[#0b1114]/80 backdrop-blur-[1px]" />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md transition-all duration-300"
              style={{ backgroundColor: 'var(--sidebar-bg)', borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/30 text-emerald-500">
              <Wind size={22} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>PrithviNet Public</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm hidden sm:block" style={{ color: 'var(--text-secondary)' }}>Citizen Environmental Portal</span>
            {user ? (
              <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-500/10 hover:text-red-500 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                <LogOut size={16} /> Sign Out
              </button>
            ) : (
              <button onClick={() => navigate('/login')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-emerald-600 hover:bg-emerald-500/10 transition-colors">
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-12 space-y-16">

        {/* Section 1: Hero & Local AQI */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight" style={{ color: 'var(--text-primary)' }}>
                Breathable <span className="text-emerald-500">Insights</span>,<br />Right in Your Area.
              </h2>
              <p className="text-lg max-w-md" style={{ color: 'var(--text-secondary)' }}>
                Real-time, anonymized environmental health data. We put your safety first, without the overwhelming jargon.
              </p>
            </div>

            <div className="flex flex-col">
              <button onClick={handleLocateMe} disabled={locationStatus === 'loading'}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-full font-semibold transition-all disabled:opacity-75">
                <MapPin size={20} />
                {locationStatus === 'loading' ? 'Locating...' : 'Use My Location'}
              </button>

              <div className="flex items-center my-6 font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex-1 border-t" style={{ borderColor: 'var(--border-accent)' }} />
                <span className="px-4">OR</span>
                <div className="flex-1 border-t" style={{ borderColor: 'var(--border-accent)' }} />
              </div>

              <form onSubmit={handleCitySearch} className="w-full flex rounded-full overflow-hidden border backdrop-blur-sm"
                    style={{ backgroundColor: 'var(--glass-bg)', borderColor: 'var(--border-accent)' }}>
                <input type="text" placeholder="Enter City/Pincode" value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 py-4 px-6 text-base bg-transparent focus:outline-none"
                  style={{ color: 'var(--text-primary)' }} />
                <button type="submit" disabled={locationStatus === 'loading'}
                  className="px-6 text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                  <Search size={20} />
                </button>
              </form>
              <p className="text-sm mt-3 ml-4" style={{ color: 'var(--text-secondary)' }}>Search by city (e.g., Raipur) or 6-digit pincode</p>
            </div>

            {locationStatus === 'error' && (
              <p className="text-rose-500 font-medium">Could not fetch location data. Please try again.</p>
            )}
          </div>

          <div className="flex justify-center md:justify-end h-full">
            {!localAqiData ? (
              <div className="glass-card neon-border w-full h-80 flex flex-col items-center justify-center p-8 text-center gap-4">
                <Wind size={48} className="text-emerald-500/40" />
                <p style={{ color: 'var(--text-secondary)' }}>Enter your location to see real-time<br />environmental health data for your area.</p>
              </div>
            ) : (
              <div className="glass-card neon-border w-full overflow-hidden">
                <div className="p-8 pb-6 flex flex-col items-center text-center space-y-4">
                  {localAqiData.ml_used && (
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 px-4 py-1.5 rounded-full border border-emerald-500/30 text-xs font-bold">
                      ✨ AI Predicted for your exact location
                    </div>
                  )}
                  <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    Zone: {localAqiData.location_type || localAqiData.location}
                  </div>
                  {localAqiData.confidence_note && (
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{localAqiData.confidence_note}</div>
                  )}
                  <div className={`relative flex items-center justify-center w-44 h-44 rounded-full border-8 ${getAqiConfig(localAqiData.aqi).color.replace('text-', 'border-')} shadow-inner`}>
                    <div className="flex flex-col items-center">
                      <span className={`text-6xl font-black tabular-nums ${getAqiConfig(localAqiData.aqi).color}`}>{localAqiData.aqi}</span>
                      <span className="font-bold uppercase tracking-widest text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>AQI</span>
                    </div>
                  </div>
                  {localAqiData.dominant_pollutant && (
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'var(--text-secondary)' }}>Main Pollutant:</span>
                      <span className="font-bold bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs">{localAqiData.dominant_pollutant}</span>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t" style={{ borderColor: 'var(--border-accent)' }}>
                  <HealthAdvisory aqi={localAqiData.aqi} />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Map */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Regional Health Map</h3>
              <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Anonymized public zones and their current air quality statuses.</p>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Good</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-400" /> Mod</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-500" /> Poor</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-600" /> Severe</span>
            </div>
          </div>

          <div className="w-full h-[600px] rounded-2xl overflow-hidden border relative z-0 neon-border"
               style={{ borderColor: 'var(--border-accent)' }}>
            {mapStatus === 'loading' && mapData.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-sm z-[400] text-center p-8"
                   style={{ backgroundColor: 'var(--glass-bg)' }}>
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mb-4" />
                <h4 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Map data is syncing.</h4>
                <p style={{ color: 'var(--text-secondary)' }} className="mt-2">Please check back later.</p>
              </div>
            )}
            <MapContainer center={[23.2599, 77.4126]} zoom={6} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false}>
              <TileLayer attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              {mapData.map((station) => (
                <Marker key={station.id} position={[station.lat, station.lng]} icon={createCustomIcon(station.health_status)}>
                  <Popup className="rounded-xl overflow-hidden border-0 shadow-lg">
                    <div className="p-4 bg-white min-w-[200px]">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Public Zone</div>
                      <div className="text-base font-bold text-slate-800 mb-3">Zone: {station.zone_name}</div>
                      <div className="space-y-2 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-sm">Current AQI:</span>
                          <span className="font-bold text-slate-800">{station.aqi}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 text-sm">Status:</span>
                          <span className="font-bold text-xs px-2.5 py-1 rounded-md"
                                style={{ backgroundColor: `${getMarkerColor(station.health_status)}20`, color: getMarkerColor(station.health_status) }}>
                            {station.health_status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </section>

        {/* Section 3: Report CTA */}
        <section className="glass-card neon-border p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30 text-emerald-500">
                <ClipboardList size={22} />
              </div>
              <h3 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Spotted Pollution?</h3>
            </div>
            <p className="max-w-md text-base" style={{ color: 'var(--text-secondary)' }}>
              Report illegal dumping, air or water pollution, or any environmental hazard. Your report goes directly to local authorities.
            </p>
            <ul className="text-sm space-y-1 text-emerald-500">
              <li>✓ Anonymous submission available</li>
              <li>✓ Upload photo or video evidence</li>
              <li>✓ Get a tracking ID for your report</li>
            </ul>
          </div>
          <button onClick={() => navigate('/report-incident')}
            className="shrink-0 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 rounded-2xl transition-colors shadow-md text-base">
            <ClipboardList size={20} />
            Report an Incident
            <ChevronRight size={18} />
          </button>
        </section>

      </main>

      <footer className="relative z-10 py-8 mt-8 border-t" style={{ borderColor: 'var(--border-accent)' }}>
        <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          © {new Date().getFullYear()} PrithviNet Gov. Anonymized Public Data Portal. Built for Citizen Safety.
        </p>
      </footer>
    </div>
  );
}
