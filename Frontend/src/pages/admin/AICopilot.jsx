import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, BrainCircuit, Activity, ChevronRight, Zap, MapPin, Factory } from 'lucide-react';

// Dummy 72-hour forecast data is removed; using dynamic state from Backend

const AICopilot = () => {
    const [prompt, setPrompt] = useState('');
    const [isSimulating, setIsSimulating] = useState(false);
    const [result, setResult] = useState(null);
    const [chartData, setChartData] = useState([]);
    const [scopeType, setScopeType] = useState('industry');
    const [scopeId, setScopeId] = useState('');
    const [availableEntities, setAvailableEntities] = useState([]);

    useEffect(() => {
        const fetchEntities = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const authHeaders = { 
                    'Authorization': `Bearer ${token}`, 
                    'Content-Type': 'application/json' 
                };

                let endpoint = '';
                if (scopeType === 'industry') {
                    endpoint = 'http://localhost:8000/api/master/industries';
                } else if (scopeType === 'region') {
                    endpoint = 'http://localhost:8000/api/master/regional-offices';
                }

                if (endpoint) {
                    const response = await fetch(endpoint, {
                        headers: authHeaders
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Endpoint returned status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    
                    // Master payload is already {id: 'string', name: 'string', ...}
                    setAvailableEntities(data);
                    
                    if (data && data.length > 0) {
                        setScopeId(data[0].id || data[0]._id);
                    } else {
                        setScopeId('');
                    }
                }
            } catch (error) {
                console.error("Failed to fetch entities:", error);
                setAvailableEntities([]);
                setScopeId('');
            }
        };

        fetchEntities();
    }, [scopeType]);

    const handleSimulation = async (e) => {
        e.preventDefault();
        if (!prompt) return;

        setIsSimulating(true);
        try {
            const response = await fetch('http://localhost:8000/api/copilot/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    query: prompt,
                    scope_type: scopeType,
                    scope_id: scopeId
                })
            });

            if (!response.ok) {
                throw new Error('Simulation failed. Server responded with an error.');
            }

            const data = await response.json();
            
            setResult({
                status: 'success',
                impact: data.impact,
                insight: data.insight
            });
            setChartData(data.chartData || []);
        } catch (error) {
            console.error('Simulation Error:', error);
            setResult({
                status: 'error',
                impact: 'Error',
                insight: 'Failed to generate scenario simulation due to a server connection issue.'
            });
            setChartData([]);
        } finally {
            setIsSimulating(false);
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="mb-8 border-b border-[#263238] pb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <BrainCircuit className="text-emerald-500 w-8 h-8" />
                        AI Copilot & Forecast
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">Machine Learning surrogate models for environmental oversight.</p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(0,230,118,0.2)]">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Engine Active
                </div>
            </div>

            {/* Top Chart Section */}
            <div className="bg-[#1a2327] border border-[#263238] rounded-2xl shadow-lg p-6 relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4"></div>

                <div className="flex items-center justify-between mb-6 relative z-10">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Activity className="text-emerald-500 w-5 h-5" /> Regional Risk Forecast (Next 72h)
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">Predicted average composite index with uncertainty bounds.</p>
                    </div>
                </div>

                <div className="h-[300px] w-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorUpper" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00E676" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#00E676" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#263238" vertical={false} />
                            <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#263238' }} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />

                            {/* Custom Tooltip */}
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a2327', borderColor: '#263238', borderRadius: '8px', color: '#fff' }}
                                itemStyle={{ color: '#00E676' }}
                                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                            />

                            {/* Uncertainty Bound */}
                            <Area type="monotone" dataKey="upper" stroke="none" fill="url(#colorUpper)" />
                            {/* Solid Predicted Line */}
                            <Area type="monotone" dataKey="point" stroke="#00E676" strokeWidth={3} fill="none" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* What-If Scenario Builder */}
            <div className="bg-[#1a2327] border border-[#263238] rounded-2xl shadow-lg overflow-hidden">
                <div className="bg-slate-900/50 p-6 border-b border-[#263238]">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="text-emerald-500 w-5 h-5" /> "What-If" Scenario Builder
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Query the surrogate model to test policy interventions.</p>
                </div>

                <div className="p-6">
                        <form onSubmit={handleSimulation} className="flex flex-col gap-4">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-slate-900 border border-[#263238] rounded-xl flex items-center justify-center">
                                    {scopeType === 'industry' ? (
                                        <Factory className="text-emerald-500 w-5 h-5" />
                                    ) : (
                                        <MapPin className="text-emerald-500 w-5 h-5" />
                                    )}
                                </div>
                                
                                <select 
                                    value={scopeType}
                                    onChange={(e) => setScopeType(e.target.value)}
                                    className="bg-[#0b1114] border border-[#263238] rounded-xl text-white px-4 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-sm flex-shrink-0"
                                >
                                    <option value="industry">Target Industry</option>
                                    <option value="region">Target Region</option>
                                </select>

                                <select 
                                    value={scopeId}
                                    onChange={(e) => setScopeId(e.target.value)}
                                    className="bg-[#0b1114] border border-[#263238] rounded-xl text-white px-4 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium text-sm flex-1"
                                >
                                    {availableEntities.map(entity => (
                                        <option key={entity.id} value={entity.id}>{entity.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="flex gap-4">
                                <div className="flex-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <ChevronRight className="h-5 w-5 text-emerald-500" />
                                    </div>
                                    <input
                                        type="text"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="e.g., If industry X reduces emissions by 30%, what is the expected change in regional risk?"
                                        className="block w-full pl-11 pr-4 py-4 bg-[#0b1114] border border-[#263238] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-mono text-sm shadow-inner"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!prompt || isSimulating}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-4 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(0,230,118,0.2)] hover:shadow-[0_0_25px_rgba(0,230,118,0.4)] disabled:opacity-50 disabled:cursor-not-allowed flex flex-shrink-0 items-center gap-2"
                                >
                                    {isSimulating ? 'Simulating...' : 'Simulate Intervention'}
                                    {!isSimulating && <Zap className="w-5 h-5" />}
                                </button>
                            </div>
                        </form>

                    {/* Result Card */}
                    <div className={`mt-6 rounded-xl border p-6 transition-all duration-500 ${result ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-[#0b1114] border-[#263238] border-dashed'}`}>
                        {!result ? (
                            <div className="text-center text-slate-500 py-8 flex flex-col items-center gap-3">
                                <Sparkles className="w-8 h-8 text-slate-600 opacity-50" />
                                Awaiting ML Engine Connection... <br /> Execute a prompt to visualize simulation parameters.
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-emerald-500 text-slate-950 p-1.5 rounded-md">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Simulation Complete</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="bg-[#0b1114] border border-emerald-500/20 rounded-lg p-4">
                                        <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Projected Impact</p>
                                        <p className="text-3xl font-black text-emerald-400">{result.impact}</p>
                                    </div>
                                    <div className="md:col-span-2 bg-[#0b1114] border border-[#263238] rounded-lg p-4">
                                        <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Engine Insight</p>
                                        <p className="text-sm text-slate-200 leading-relaxed font-medium">{result.insight}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AICopilot;
