import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Bell, 
  Map as MapIcon, 
  FileText, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Car,
  Send,
  Plus,
  Minus,
  Sparkles,
  X,
  CloudRain,
  Droplets,
  Volume2
} from 'lucide-react';

const RODashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  // New States
  const [activeFilter, setActiveFilter] = useState('All');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamEmail, setTeamEmail] = useState('');
  const [teamPassword, setTeamPassword] = useState('');
  const [forecasts, setForecasts] = useState([]);
  const [showCopilot, setShowCopilot] = useState(false);
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotChat, setCopilotChat] = useState([]);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Mock initial dashboard stats
  const [stats, setStats] = useState({
    resolvedToday: 12,
    pendingInspections: 8,
    overdue: 3
  });

  useEffect(() => {
    fetchAlerts(activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    fetchForecasts();
  }, []);

  const fetchForecasts = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get('http://127.0.0.1:8000/api/data/forecasts', { headers });
      setForecasts(response.data);
    } catch (error) {
      console.error('Error fetching forecasts:', error);
      // Fallback
      setForecasts([
        {location: "Okhla Industrial Area", parameter: "SO2", predicted_value: 110, timeframe: "Next 24h", confidence: 85}
      ]);
    }
  };

  const handleDeployTeam = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post('http://127.0.0.1:8000/api/auth/ro/onboard-team', { email: teamEmail, password: teamPassword, role: 'monitoring_team' }, { headers });
      alert('Team member deployed successfully!');
      setShowTeamModal(false);
      setTeamEmail('');
      setTeamPassword('');
    } catch (error) {
      console.error('Error deploying team:', error);
      alert('Failed to deploy team member.');
    }
  };

  const handleCopilotSubmit = async (e) => {
    e.preventDefault();
    if (!copilotQuery.trim()) return;
    
    const newChat = [...copilotChat, { role: 'user', content: copilotQuery }];
    setCopilotChat(newChat);
    setCopilotQuery('');
    setCopilotLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.post('http://127.0.0.1:8000/api/copilot/ask', { query: copilotQuery }, { headers });
      setCopilotChat([...newChat, { role: 'ai', content: response.data.response }]);
    } catch (error) {
       console.error(error);
      setCopilotChat([...newChat, { role: 'ai', content: 'Simulation Error: Failed to reach AI.' }]);
    } finally {
      setCopilotLoading(false);
    }
  };

  const fetchAlerts = async (filterType = activeFilter) => {
    try {
      // Assuming authorization token is handled by an interceptor or similar
      // Or we send a mock token if running locally without auth fully set up
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      let url = 'http://127.0.0.1:8000/api/alerts';
      if (filterType !== 'All') {
        url += `?type=${filterType.toLowerCase()}`;
      }
      
      const response = await axios.get(url, { headers });
      setAlerts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setLoading(false);
      
      // Fallback mock data if backend isn't running or fails
      setAlerts([
        {
          id: 'PR-9402',
          industry_id: 'Indus Steel Manufacturing',
          location: 'Okhla Industrial Area, Phase III',
          parameter: 'PM2.5',
          exceeded_value: 185,
          allowed_value: 60,
          severity: 'HIGH',
          status: 'UNRESOLVED'
        },
        {
          id: 'PR-8821',
          industry_id: 'Greenway Chemical Plant',
          location: 'Noida Sector 62, Block C',
          parameter: 'SO2',
          exceeded_value: 95,
          allowed_value: 80,
          severity: 'MEDIUM',
          status: 'UNRESOLVED'
        }
      ]);
    }
  };

  const handleResolve = async (alertId) => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.put(`http://127.0.0.1:8000/api/alerts/${alertId}/resolve`, {}, { headers });
      
      // Remove or update the alert locally
      setAlerts(alerts.filter(a => a.id !== alertId));
      setStats(prev => ({ ...prev, resolvedToday: prev.resolvedToday + 1 }));
    } catch (error) {
      console.error('Error resolving alert:', error);
      // Optimistic update for UI even if backend fails (for demo purposes)
      setAlerts(alerts.filter(a => a.id !== alertId));
      setStats(prev => ({ ...prev, resolvedToday: prev.resolvedToday + 1 }));
    }
  };

  const triggerToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000); // clear after 3 seconds
  };

  const handleInitiateNotice = (industryName) => {
    triggerToast(`Notice Initiated for ${industryName}`);
  };

  const handleFieldVisit = (industryName) => {
    triggerToast(`Field Visit Scheduled for ${industryName}`);
  };

  // Local filtering based on UI parameter selection
  const filteredAlerts = alerts.filter(alert => {
    if (activeFilter === 'All') return true;
    const p = alert.parameter ? alert.parameter.toLowerCase() : '';
    
    if (activeFilter === 'Air') return ['pm2.5', 'so2', 'no2', 'co', 'aqi'].includes(p);
    if (activeFilter === 'Water') return ['ph', 'bod', 'cod', 'tss'].includes(p);
    if (activeFilter === 'Noise') return ['noise', 'db'].includes(p);
    
    return true;
  });

  return (
    <div className="bg-[#0b1114] min-h-screen text-gray-300 font-sans pb-20 relative">
      
      {/* Toast Notification Overlay */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-[#1a2d22] border border-[#1ccb5b]/50 text-[#1ccb5b] px-5 py-3 rounded-xl shadow-[0_0_20px_rgba(28,203,91,0.2)] flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold text-sm">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex justify-between items-center p-4 bg-[#11181c] sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-[#1ccb5b] p-1.5 rounded-md">
            <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-black">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-white font-semibold text-lg">PrithviNet Officer</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowTeamModal(true)}
            className="hidden sm:flex items-center gap-1 bg-[#1a2d22] text-[#1ccb5b] hover:bg-[#253f30] px-3 py-1.5 rounded-lg border border-[#2a3f32] text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" /> Deploy Team
          </button>
          <div className="relative cursor-pointer">
            <Bell className="w-5 h-5 text-gray-400 hover:text-white transition" />
            <span className="absolute -top-1 -right-1 bg-red-500 w-2.5 h-2.5 rounded-full border-2 border-[#11181c]"></span>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#1b2b22] text-[#1ccb5b] flex items-center justify-center font-bold text-sm border border-[#2a3f32]">
            RO
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        
        {/* Summary Cards */}
        <div className="bg-[#151c21] rounded-xl p-5 border border-[#232f36] shadow-lg">
          <div className="flex justify-between items-start mb-2">
            <p className="text-gray-400 text-sm">Total Active Alerts</p>
            <div className="bg-[#1a2d22] p-1.5 rounded-md text-[#1ccb5b]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-white text-3xl font-bold mb-2">{alerts.length}</h2>
          <p className="text-[#1ccb5b] text-xs flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            +5% from last hour
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#151c21] rounded-xl p-4 border border-[#232f36] shadow-lg flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-gray-400 text-xs">Resolved Today</p>
              <div className="bg-[#172433] p-1.5 rounded-md text-blue-400">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h2 className="text-white text-2xl font-bold">{stats.resolvedToday}</h2>
              <p className="text-gray-500 text-[10px] mt-1">Target: 20 per shift</p>
            </div>
          </div>

          <div className="bg-[#151c21] rounded-xl p-4 border border-[#232f36] shadow-lg flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-gray-400 text-xs">Pending Inspections</p>
              <div className="bg-[#2d2516] p-1.5 rounded-md text-amber-500">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h2 className="text-white text-2xl font-bold">{stats.pendingInspections < 10 ? `0${stats.pendingInspections}` : stats.pendingInspections}</h2>
              <p className="text-amber-500 text-[10px] flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                {stats.overdue} Overdue
              </p>
            </div>
          </div>
        </div>

        {/* Forecasted Risks */}
        <div className="mt-8">
          <h3 className="text-white font-semibold text-lg flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Forecasted Risks (Next 48h)
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {forecasts.map((forecast, idx) => (
              <div key={idx} className="bg-gradient-to-br from-[#1c182a] to-[#151c21] rounded-xl p-4 border border-[#30244d] min-w-[240px] shadow-lg flex-shrink-0">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-purple-400 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-900/30 border border-purple-500/20 uppercase">
                    {forecast.timeframe}
                  </span>
                  <span className="text-gray-500 text-xs">{forecast.confidence}% Conf.</span>
                </div>
                <h4 className="text-white font-bold text-md mb-1">{forecast.location}</h4>
                <p className="text-red-400 font-bold mb-1">
                  {forecast.parameter} <span className="text-gray-400 font-normal text-xs">expected at</span> {forecast.predicted_value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Breaches */}
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center mb-4 gap-3">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              Real-time Breaches
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            </h3>
            
            {/* Filter Pills */}
            <div className="flex gap-2 pb-1 overflow-x-auto w-full sm:w-auto scrollbar-hide">
              {['All', 'Air', 'Water', 'Noise'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border flex items-center gap-1.5 ${
                    activeFilter === filter 
                    ? 'bg-[#1ccb5b]/10 text-[#1ccb5b] border-[#1ccb5b]/50' 
                    : 'bg-[#151c21] text-gray-400 border-[#232f36] hover:text-white'
                  }`}
                >
                  {filter === 'Air' && <CloudRain className="w-3.5 h-3.5" />}
                  {filter === 'Water' && <Droplets className="w-3.5 h-3.5" />}
                  {filter === 'Noise' && <Volume2 className="w-3.5 h-3.5" />}
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {filteredAlerts.length === 0 ? (
              <p className="text-gray-500 text-center py-8 bg-[#151c21] rounded-xl border border-[#232f36]">No active breaches for {activeFilter} parameters.</p>
            ) : (
              filteredAlerts.map((alert, index) => (
                <div key={alert.id || index} className="bg-[#151c21] rounded-xl p-5 border border-[#232f36] shadow-lg transition-all hover:border-[#303d52]">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      alert.severity === 'HIGH' || (!alert.severity && alert.exceeded_value > alert.allowed_value * 1.5) 
                        ? 'bg-[#3d191c] text-red-500' 
                        : 'bg-[#3d2f19] text-amber-500'
                    }`}>
                      {alert.severity || (alert.exceeded_value > alert.allowed_value * 1.5 ? 'HIGH SEVERITY' : 'MEDIUM SEVERITY')}
                    </span>
                    <span className="text-gray-500 text-xs">ID:{alert.id?.slice(-6) || 'N/A'}</span>
                  </div>
                  
                  <h4 className="text-white font-bold text-lg mb-1">{alert.industry_id || 'Unknown Industry'}</h4>
                  <p className="text-gray-400 text-xs flex items-center gap-1 mb-4">
                    <MapIcon className="w-3 h-3" />
                    {alert.location || alert.location_id || 'Location unavailable'}
                  </p>

                  <div className="bg-[#1a2027] rounded-lg p-3 border border-[#2c3640] mb-4">
                    <p className="text-[10px] text-gray-400 font-semibold mb-1 uppercase">Breach Type</p>
                    <p className="text-red-400 font-bold text-lg">{alert.parameter} &gt; {alert.exceeded_value}</p>
                    <p className="text-gray-500 text-xs">Limit: {alert.allowed_value} µg/m³</p>
                  </div>

                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <button 
                      onClick={() => handleInitiateNotice(alert.industry_id || 'Unknown Industry')}
                      className="flex-1 min-w-[140px] bg-[#1ccb5b] hover:bg-[#18b34e] text-black font-semibold text-sm py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
                    >
                      <Send className="w-4 h-4" />
                      Initiate Notice
                    </button>
                    <button 
                      onClick={() => handleFieldVisit(alert.industry_id || 'Unknown Industry')}
                      className="flex-1 min-w-[140px] bg-[#1e2532] hover:bg-[#252f3f] text-white font-semibold text-sm py-2.5 rounded-lg border border-[#303d52] flex items-center justify-center gap-2 transition"
                    >
                      <Car className="w-4 h-4" />
                      Field Visit
                    </button>
                    <button 
                      onClick={() => handleResolve(alert.id)}
                      className="px-4 text-gray-400 hover:text-white text-sm transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* GIS Live View */}
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold text-lg flex items-center gap-2">
              <MapIcon className="w-5 h-5 text-[#1ccb5b]" />
              GIS Live View
            </h3>
            <span className="text-[10px] bg-[#1a2d22] text-[#1ccb5b] px-2 py-0.5 rounded border border-[#2a3f32] uppercase">
              Region: North
            </span>
          </div>

          <div className="bg-[#151c21] rounded-xl border border-[#232f36] overflow-hidden shadow-lg relative">
            <div className="absolute top-3 left-3 right-3 bg-[#11181c]/90 border border-red-900/50 backdrop-blur-sm rounded-md p-2 flex items-center gap-2 z-10">
               <span className="w-2 h-2 rounded-full bg-red-500"></span>
               <span className="text-xs text-white">3 High Severity Hotspots Detected</span>
            </div>
            
            {/* Mock Map Background */}
            <div className="h-64 bg-[#11181c] relative w-full overflow-hidden flex items-center justify-center" style={{
              backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")',
              backgroundSize: '100px'
            }}>
                {/* Mock heat spots */}
                <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-red-500/20 rounded-full blur-xl -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-red-500/40 rounded-full blur-md -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute top-1/2 left-1/2 w-4 h-4 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.8)] -translate-x-1/2 -translate-y-1/2 transform scale-150"></div>
                
                {/* Mock Markers */}
                <div className="absolute top-1/3 left-1/4">
                  <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                </div>
                <div className="absolute top-2/3 left-2/3">
                  <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                </div>

                {/* Map Controls */}
                <div className="absolute bottom-4 right-4 flex flex-col gap-1">
                  <button className="bg-[#1e2532] text-white p-2 rounded border border-[#303d52] hover:bg-[#252f3f]">
                    <Plus className="w-4 h-4" />
                  </button>
                  <button className="bg-[#1e2532] text-white p-2 rounded border border-[#303d52] hover:bg-[#252f3f]">
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
            </div>

            <div className="p-4 bg-[#151c21]">
              <p className="text-gray-400 text-xs italic mb-4">Showing cluster activity for current shift. Tap markers for detail.</p>
              <button 
                onClick={() => setIsMapExpanded(true)}
                className="w-full bg-[#11241a] hover:bg-[#1a3526] text-[#1ccb5b] font-semibold text-sm py-3 rounded-lg border border-[#1b3a26] transition transition-colors"
              >
                EXPAND GIS DASHBOARD
              </button>
            </div>
          </div>
        </div>

        {/* Regional Log */}
        <div className="mt-8 mb-8">
          <h3 className="text-white font-semibold text-lg mb-4">Regional Log</h3>
          <div className="bg-[#151c21] rounded-xl border border-[#232f36] p-4 shadow-lg">
            <div className="relative border-l border-[#232f36] ml-3 space-y-6">
              
              <div className="relative pl-6">
                <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-[#1ccb5b] border-2 border-[#151c21]"></span>
                <h4 className="text-white text-sm font-semibold">Inspection Complete</h4>
                <p className="text-gray-500 text-xs mt-0.5">Apex Refineries • 10:45 AM</p>
              </div>

              <div className="relative pl-6">
                <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-[#151c21]"></span>
                <h4 className="text-white text-sm font-semibold">Notice Served (Legal)</h4>
                <p className="text-gray-500 text-xs mt-0.5">Metro Gas Co • 09:12 AM</p>
              </div>

              <div className="relative pl-6 pb-2">
                <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-[#151c21]"></span>
                <h4 className="text-white text-sm font-semibold">New Plant Addition Pending</h4>
                <p className="text-gray-500 text-xs mt-0.5">Steelco Ind. • Yesterday</p>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#11181c] border-t border-[#232f36] px-6 py-3 flex justify-between items-center z-50">
        <button className="flex flex-col items-center gap-1 text-[#1ccb5b]">
          <AlertTriangle className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Alerts</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition">
          <MapIcon className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Map</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition">
          <FileText className="w-5 h-5" />
          <span className="text-[10px] font-semibold">Reports</span>
        </button>
        <button 
          onClick={() => setShowCopilot(true)}
          className="flex flex-col items-center gap-1 text-purple-400 hover:text-purple-300 transition group"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-[10px] font-semibold">AI Copilot</span>
        </button>
      </div>

      {/* Expanded Map Modal */}
      {isMapExpanded && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[150] flex flex-col p-4 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white text-2xl font-bold flex items-center gap-2">
              <MapIcon className="w-6 h-6 text-[#1ccb5b]" /> GIS Regional Oversight
            </h2>
            <button 
              onClick={() => setIsMapExpanded(false)}
              className="bg-[#151c21] hover:bg-[#232f36] text-white px-4 py-2 rounded-lg border border-[#303d52] font-semibold transition"
            >
              Close Map
            </button>
          </div>
          
          <div className="flex-1 bg-[#11181c] rounded-2xl border border-[#232f36] relative overflow-hidden flex flex-col items-center justify-center" style={{
              backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")',
              backgroundSize: '100px'
            }}>
             
             {/* Center massive hotspot */}
             <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-red-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
             
             <div className="absolute top-1/3 left-1/4 flex flex-col items-center">
                 <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/50 mb-1">
                     <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                 </div>
                 <div className="bg-[#151c21] px-3 py-1.5 rounded-lg border border-[#232f36] shadow-xl">
                    <p className="text-xs font-bold text-white">Apex Refineries</p>
                    <p className="text-[10px] text-red-400 leading-none mt-1">PM2.5: 185 µg/m³</p>
                 </div>
             </div>

             <div className="absolute top-2/3 right-1/4 flex flex-col items-center">
                 <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/50 mb-1">
                     <div className="w-3 h-3 bg-amber-500 rounded-full animate-ping"></div>
                 </div>
                 <div className="bg-[#151c21] px-3 py-1.5 rounded-lg border border-[#232f36] shadow-xl">
                    <p className="text-xs font-bold text-white">Metro Gas Co</p>
                    <p className="text-[10px] text-amber-400 leading-none mt-1">SO2: 95 µg/m³</p>
                 </div>
             </div>

             <div className="absolute bottom-6 right-6 flex flex-col gap-2">
                <button className="bg-[#151c21] hover:bg-[#232f36] p-4 rounded-xl border border-[#303d52] text-white">
                  <Plus className="w-6 h-6" />
                </button>
                <button className="bg-[#151c21] hover:bg-[#232f36] p-4 rounded-xl border border-[#303d52] text-white">
                  <Minus className="w-6 h-6" />
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Team Management Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 min-h-screen">
          <div className="bg-[#11181c] border border-[#232f36] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#232f36] flex justify-between items-center bg-[#151c21]">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#1ccb5b]" /> Deploy Monitoring Team
              </h3>
              <button onClick={() => setShowTeamModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleDeployTeam} className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={teamEmail}
                  onChange={e => setTeamEmail(e.target.value)}
                  className="w-full bg-[#151c21] border border-[#232f36] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#1ccb5b] transition-colors"
                  placeholder="agent@cecb.gov.in"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Temporary Password</label>
                <input 
                  type="password" 
                  required
                  value={teamPassword}
                  onChange={e => setTeamPassword(e.target.value)}
                  className="w-full bg-[#151c21] border border-[#232f36] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#1ccb5b] transition-colors"
                  placeholder="••••••••"
                />
              </div>
              <button 
                type="submit"
                className="w-full mt-4 bg-[#1ccb5b] hover:bg-[#18b34e] text-black font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors"
              >
               Deploy Team Member
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI Copilot Drawer */}
      {showCopilot && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-[#11181c] border-l border-[#30244d] shadow-[0_0_40px_rgba(0,0,0,0.8)] z-[100] flex flex-col transform transition-transform duration-300">
          <div className="p-4 border-b border-[#30244d] bg-gradient-to-r from-[#1c182a] to-[#11181c] flex justify-between items-center">
            <h3 className="text-purple-400 font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" /> Compliance Copilot
            </h3>
            <button onClick={() => setShowCopilot(false)} className="text-gray-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
            {/* Background glowing effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-900/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex items-start gap-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center shrink-0 border border-purple-500/30">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <div className="bg-[#1c182a] border border-[#30244d] rounded-2xl rounded-tl-none p-3 text-sm text-gray-300 shadow-xl">
                Hello Officer. I'm your AI assistant. I can run what-if scenarios, draft notices, or analyze compliance trends. How can I help?
              </div>
            </div>
            
            {copilotChat.map((msg, idx) => (
              <div key={idx} className={`flex items-start gap-3 relative z-10 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                  msg.role === 'user' 
                  ? 'bg-[#1a2d22] border-[#1ccb5b]/50 text-[#1ccb5b]' 
                  : 'bg-purple-900/50 border-purple-500/30 text-purple-400'
                }`}>
                  {msg.role === 'user' ? <span className="font-bold text-xs">RO</span> : <Sparkles className="w-4 h-4" />}
                </div>
                <div className={`rounded-2xl p-3 text-sm text-gray-200 shadow-xl max-w-[85%] whitespace-pre-wrap ${
                  msg.role === 'user'
                  ? 'bg-[#1a2d22] border border-[#2a3f32] rounded-tr-none'
                  : 'bg-[#1c182a] border border-[#30244d] rounded-tl-none leading-relaxed'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {copilotLoading && (
              <div className="flex items-start gap-3 relative z-10">
                <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center shrink-0 border border-purple-500/30">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                </div>
                <div className="bg-[#1c182a] border border-[#30244d] rounded-2xl rounded-tl-none p-4 shadow-xl flex items-center gap-1.5 h-[42px]">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            {/* Empty div for scroll to bottom if needed, though this basic version handles it gracefully */}
          </div>
          
          <div className="p-4 border-t border-[#30244d] bg-[#11181c] relative z-20">
            <form onSubmit={handleCopilotSubmit} className="flex gap-2 relative">
              <input 
                type="text" 
                value={copilotQuery}
                onChange={(e) => setCopilotQuery(e.target.value)}
                placeholder="Ask about compliance drifts..."
                className="flex-1 bg-[#151c21] border border-[#30244d] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder-gray-500"
              />
              <button 
                type="submit"
                disabled={copilotLoading || !copilotQuery.trim()}
                className="w-12 h-12 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex justify-center items-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(147,51,234,0.3)] hover:shadow-[0_0_20px_rgba(147,51,234,0.5)]"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default RODashboard;
