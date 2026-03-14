import { useState, useRef, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Wind, Droplets, Volume2, Trash2, MoreHorizontal,
  MapPin, Upload, X, CheckCircle2, Loader2,
  ArrowLeft, ClipboardList, ChevronRight, EyeOff, LogOut
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import bgDark from '../../assets/bg/prithvinet-bg.png';

const CATEGORIES = [
  { id: 'air',     label: 'Air Pollution',   icon: Wind,           color: 'emerald' },
  { id: 'water',   label: 'Water Pollution', icon: Droplets,       color: 'cyan'    },
  { id: 'noise',   label: 'Noise Pollution', icon: Volume2,        color: 'purple'  },
  { id: 'dumping', label: 'Illegal Dumping', icon: Trash2,         color: 'orange'  },
  { id: 'other',   label: 'Other',           icon: MoreHorizontal, color: 'slate'   },
];

const SEVERITY_LABELS = ['', 'Minor', 'Low', 'Moderate', 'High', 'Critical Hazard'];

const TIMELINE_STEPS = [
  { label: 'Report Received',            done: true  },
  { label: 'Routing to Local Authority', done: true  },
  { label: 'Under Investigation',        done: false },
  { label: 'Resolution & Closure',       done: false },
];

const colorMap = {
  emerald: { ring: 'ring-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/50' },
  cyan:    { ring: 'ring-cyan-500',    bg: 'bg-cyan-500/10',    text: 'text-cyan-500',    border: 'border-cyan-500/50'    },
  purple:  { ring: 'ring-purple-500',  bg: 'bg-purple-500/10',  text: 'text-purple-500',  border: 'border-purple-500/50'  },
  orange:  { ring: 'ring-orange-500',  bg: 'bg-orange-500/10',  text: 'text-orange-500',  border: 'border-orange-500/50'  },
  slate:   { ring: 'ring-slate-400',   bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-400/50'   },
};

const severityColor = ['', 'bg-emerald-400', 'bg-lime-400', 'bg-amber-400', 'bg-orange-500', 'bg-rose-600'];

// Shared background wrapper used by all views
function PageBg({ children }) {
  return (
    <div className="relative min-h-screen overflow-hidden font-sans" style={{ color: 'var(--text-secondary)' }}>
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img src={bgDark} alt="" className="w-full h-full object-cover scale-105" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1114]/70 via-[#0b1114]/60 to-[#0b1114]/80 backdrop-blur-[1px]" />
        <div className="absolute inset-0 bg-black/50" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default function IncidentReport() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const [view, setView]               = useState('form');
  const [category, setCategory]       = useState(null);
  const [location, setLocation]       = useState('');
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [files, setFiles]             = useState([]);
  const [dragging, setDragging]       = useState(false);
  const [severity, setSeverity]       = useState(3);
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous]     = useState(false);
  const [trackingId, setTrackingId]   = useState('');
  const fileInputRef = useRef(null);

  const handleGPS = () => {
    if (!navigator.geolocation) return alert('Geolocation not supported');
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLocation(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`); setGpsLoading(false); },
      () => { alert('Could not get location'); setGpsLoading(false); }
    );
  };

  const addFiles = (incoming) => {
    const valid = Array.from(incoming).filter(f => f.type.startsWith('image/') || f.type === 'video/mp4');
    setFiles(prev => [...prev, ...valid].slice(0, 5));
  };
  const onDrop = useCallback((e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category) return alert('Please select a pollution category.');
    if (!location.trim()) return alert('Please provide a location.');
    if (!description.trim()) return alert('Please describe the incident.');
    setView('processing');
    try {
      const res = await axios.post('http://localhost:8000/api/public/report-incident', { category, location, severity, description, anonymous });
      setTrackingId(res.data.tracking_id);
      setView('success');
    } catch { setView('form'); alert('Failed to submit report. Please try again.'); }
  };

  const resetForm = () => { setView('form'); setCategory(null); setLocation(''); setFiles([]); setSeverity(3); setDescription(''); setAnonymous(false); };

  // Shared header
  const Header = ({ showBack = true }) => (
    <header className="sticky top-0 z-50 backdrop-blur-md transition-all duration-300"
            style={{ backgroundColor: 'var(--sidebar-bg)', borderBottom: '1px solid var(--sidebar-border)' }}>
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
        {showBack ? (
          <button onClick={() => navigate('/public-portal')} className="flex items-center gap-2 text-sm font-medium hover:text-emerald-500 transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft size={18} /> Back to Portal
          </button>
        ) : <div />}
        <div className="flex items-center gap-2">
          <ClipboardList size={20} className="text-emerald-500" />
          <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Report an Incident</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <button onClick={logout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-500/10 hover:text-red-500 transition-colors" style={{ color: 'var(--text-secondary)' }}>
              <LogOut size={16} />
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );

  // ── PROCESSING ──
  if (view === 'processing') return (
    <PageBg>
      <Header showBack={false} />
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="glass-card neon-border p-12 flex flex-col items-center gap-6 max-w-sm w-full">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Submitting Report…</h2>
          <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>Encrypting your data and routing to the nearest authority.</p>
        </div>
      </div>
    </PageBg>
  );

  // ── SUCCESS ──
  if (view === 'success') return (
    <PageBg>
      <Header showBack={false} />
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
        <div className="glass-card neon-border p-10 max-w-md w-full space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-4 border-emerald-500/50 flex items-center justify-center">
              <CheckCircle2 size={40} className="text-emerald-500" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Report Submitted</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Your incident has been logged and forwarded.</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center">
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-widest mb-1">Tracking ID</p>
            <p className="text-2xl font-black text-emerald-400 tracking-wider">{trackingId}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Save this for future reference</p>
          </div>
          <div className="space-y-3">
            {TIMELINE_STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${step.done ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                  {step.done ? <CheckCircle2 size={14} className="text-white" /> : <span className="w-2 h-2 rounded-full bg-slate-400" />}
                </div>
                <span className={`text-sm font-medium ${step.done ? '' : 'opacity-50'}`} style={{ color: 'var(--text-primary)' }}>{step.label}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={resetForm} className="flex-1 py-3 rounded-xl border text-sm font-semibold hover:bg-emerald-500/10 transition-colors"
                    style={{ borderColor: 'var(--border-accent)', color: 'var(--text-secondary)' }}>
              Submit Another
            </button>
            <button onClick={() => navigate('/public-portal')}
              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors text-sm">
              Back to Portal
            </button>
          </div>
        </div>
      </div>
    </PageBg>
  );

  // ── FORM ──
  return (
    <PageBg>
      <Header />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8 space-y-1">
          <h1 className="text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Pollution Incident Report</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Help us protect the environment. All reports are reviewed by local authorities.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* 1. Category */}
          <div className="glass-card neon-border p-6 space-y-4">
            <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>1. Pollution Category <span className="text-rose-500">*</span></h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map(({ id, label, icon: Icon, color }) => {
                const c = colorMap[color];
                const selected = category === id;
                return (
                  <button key={id} type="button" onClick={() => setCategory(id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all font-medium text-sm
                      ${selected ? `${c.bg} ${c.border} ${c.text} ring-2 ${c.ring}` : 'border-slate-600/30 hover:border-emerald-500/30 hover:bg-emerald-500/5'}`}
                    style={!selected ? { color: 'var(--text-secondary)' } : {}}>
                    <Icon size={24} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Location */}
          <div className="glass-card neon-border p-6 space-y-4">
            <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>2. Incident Location <span className="text-rose-500">*</span></h2>
            <div className="flex gap-2">
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                placeholder="Address, landmark, or GPS coordinates"
                className="theme-input flex-1 rounded-xl px-4 py-3 text-sm" />
              <button type="button" onClick={handleGPS} disabled={gpsLoading}
                className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-60">
                {gpsLoading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
                GPS
              </button>
            </div>
          </div>

          {/* 3. Evidence */}
          <div className="glass-card neon-border p-6 space-y-4">
            <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>3. Evidence <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>(optional, max 5)</span></h2>
            <div onDrop={onDrop} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                ${dragging ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600/30 hover:border-emerald-500/40 hover:bg-emerald-500/5'}`}>
              <Upload size={28} className="mx-auto text-emerald-500/50 mb-2" />
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Drag & drop photos/videos here</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>or click to browse — JPG, PNG, MP4</p>
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/mp4" className="hidden" onChange={(e) => addFiles(e.target.files)} />
            </div>
            {files.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {files.map((f, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border aspect-square" style={{ borderColor: 'var(--border-accent)', backgroundColor: 'var(--bg-tertiary)' }}>
                    {f.type.startsWith('image/') ? (
                      <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>MP4</div>
                    )}
                    <button type="button" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Severity */}
          <div className="glass-card neon-border p-6 space-y-4">
            <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>4. Severity Level</h2>
            <div className="flex items-center gap-4">
              <input type="range" min={1} max={5} value={severity} onChange={(e) => setSeverity(Number(e.target.value))}
                className="flex-1 accent-emerald-500 h-2 cursor-pointer" />
              <span className={`px-3 py-1 rounded-full text-white text-xs font-bold ${severityColor[severity]}`}>
                {SEVERITY_LABELS[severity]}
              </span>
            </div>
            <div className="flex justify-between text-xs px-0.5" style={{ color: 'var(--text-secondary)' }}>
              <span>Minor</span><span>Critical</span>
            </div>
          </div>

          {/* 5. Description */}
          <div className="glass-card neon-border p-6 space-y-4">
            <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>5. Description <span className="text-rose-500">*</span></h2>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5}
              placeholder="Describe what you observed — smell, color, source, time of day, affected area…"
              className="theme-input w-full rounded-xl px-4 py-3 text-sm resize-none" />
            <p className="text-xs text-right" style={{ color: 'var(--text-secondary)' }}>{description.length} / 1000</p>
          </div>

          {/* 6. Anonymity */}
          <div className="glass-card neon-border p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Submit Anonymously</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Your identity will not be shared with authorities.</p>
              </div>
              <button type="button" onClick={() => setAnonymous(a => !a)}
                className={`relative w-12 h-6 rounded-full transition-colors ${anonymous ? 'bg-emerald-600' : 'bg-slate-600'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${anonymous ? 'translate-x-6' : ''}`} />
              </button>
            </div>
            {anonymous && (
              <div className="mt-3 flex items-center gap-2 text-xs bg-emerald-500/10 text-emerald-500 rounded-lg px-3 py-2">
                <EyeOff size={14} /> Your personal details will be stripped before submission.
              </div>
            )}
          </div>

          {/* Submit */}
          <button type="submit"
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-base transition-colors shadow-md flex items-center justify-center gap-2">
            <ChevronRight size={20} />
            Submit Incident Report
          </button>

        </form>
      </main>

      <footer className="py-8 mt-8 border-t" style={{ borderColor: 'var(--border-accent)' }}>
        <p className="text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
          © {new Date().getFullYear()} PrithviNet Gov. All reports are encrypted and handled confidentially.
        </p>
      </footer>
    </PageBg>
  );
}
