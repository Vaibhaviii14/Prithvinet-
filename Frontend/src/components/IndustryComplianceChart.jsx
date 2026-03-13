import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../api/axios'; // Add this import

const PARAMETER_MAP = {
  Air: ['SO2', 'PM2.5', 'NO2', 'CO', 'O3', 'PM10'],
  Water: ['pH', 'BOD', 'TSS', 'COD', 'TDS', 'DO'],
  Noise: ['Noise_dB', 'Leq']
};

const IndustryComplianceChart = () => {
  const [category, setCategory] = useState("Air");
  const [parameter, setParameter] = useState("SO2");
  const [days, setDays] = useState(7);

  const [data, setData] = useState([]);
  const [dbLimits, setDbLimits] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [availableParams, setAvailableParams] = useState(PARAMETER_MAP[category] || []);

  // Fetch limits from DB on mount
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const res = await api.get('/api/master/limits');
        const limitMap = {};
        res.data.forEach(limit => {
          limitMap[limit.parameter] = limit.max_allowed_value;
        });
        setDbLimits(limitMap);
      } catch (err) {
        console.error("Failed fetching limits", err);
      }
    };
    fetchLimits();
  }, []);

  // When category changes, reset the parameter to the first one available in that category
  useEffect(() => {
    setAvailableParams(PARAMETER_MAP[category] || []);
    if (PARAMETER_MAP[category]) {
      setParameter(PARAMETER_MAP[category][0]);
    }
  }, [category]);

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await api.get(`/api/ingestion/logs?category=${category}`);
      const responseData = response.data;
      
      // Extract any uniquely logged custom parameters to append to dropdown
      const uniqueParams = new Set(PARAMETER_MAP[category] || []);
      responseData.forEach(item => {
        if (item.parameters) {
          Object.keys(item.parameters).forEach(k => uniqueParams.add(k));
        }
      });
      setAvailableParams(Array.from(uniqueParams));

      // Transform raw ingestion logs for recharts
      let transformedData = responseData
        .filter(item => item.parameters && item.parameters[parameter] !== undefined)
        .map(item => ({
          date: new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' }),
          value: item.parameters[parameter]
        }));

      // Since backend returns latest first, we take the top `days` (as quantity limit) and reverse to render chronologically
      transformedData = transformedData.slice(0, days).reverse();

      setData(transformedData);
    } catch (err) {
      console.error(err);
      setError('An error occurred while fetching data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, parameter, days]);

  const currentLimit = dbLimits[parameter];
  const hasViolation = data.some(d => d.value > currentLimit);

  return (
    <div className="bg-[#1a2327] border border-[#263238] rounded-2xl p-6 shadow-sm flex flex-col w-full">
      
      {/* Controls Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-white">Compliance Analytics</h2>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Toggle Buttons */}
          <div className="flex bg-[#0b1114] border border-[#263238] rounded-lg p-1">
            {Object.keys(PARAMETER_MAP).map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                  category === cat
                    ? 'bg-[#263238] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Parameter Dropdown */}
          <select
            value={parameter}
            onChange={(e) => setParameter(e.target.value)}
            className="bg-[#0b1114] border border-[#263238] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            {availableParams.map(param => (
              <option key={param} value={param}>{param}</option>
            ))}
          </select>

          {/* Time Range Dropdown */}
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="bg-[#0b1114] border border-[#263238] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value={7}>Last 7 Readings</option>
            <option value={14}>Last 14 Readings</option>
            <option value={30}>Last 30 Readings</option>
          </select>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6 flex">
        {currentLimit === undefined ? (
          <div className="flex items-center gap-2 bg-slate-500/10 border border-slate-500/20 text-slate-400 px-4 py-2 rounded-lg font-bold text-sm">
            <AlertTriangle className="w-5 h-5" /> Base Limit Not Set
          </div>
        ) : hasViolation ? (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-2 rounded-lg font-bold text-sm">
            <AlertTriangle className="w-5 h-5" /> ⚠️ Violation Detected
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-4 py-2 rounded-lg font-bold text-sm">
            <CheckCircle className="w-5 h-5" /> ✅ Compliant
          </div>
        )}
      </div>

      {/* Chart Section */}
      <div className="w-full bg-[#0b1114] border border-[#263238] rounded-xl p-4 min-h-[400px]">
        {isLoading ? (
          <div className="w-full h-[400px] flex flex-col items-center justify-center text-slate-400">
            <Activity className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
            <p>Loading analytics data...</p>
          </div>
        ) : error ? (
          <div className="w-full h-[400px] flex items-center justify-center text-red-400 font-medium">
            {error}
          </div>
        ) : data.length === 0 ? (
          <div className="w-full h-[400px] flex items-center justify-center text-slate-500 font-medium">
            No data available for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: -10, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#263238" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                tick={{ fill: '#64748b', fontSize: 11 }} 
                axisLine={false} 
                tickLine={false} 
                dy={15} 
                angle={-25}
                textAnchor="end"
              />
              <YAxis 
                stroke="#64748b" 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#1a2327', 
                  borderColor: '#263238', 
                  color: '#e2e8f0', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' 
                }}
                itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                labelStyle={{ color: '#94a3b8', marginBottom: '4px', fontSize: '13px' }}
                formatter={(value) => [value, parameter]}
              />
              
              {currentLimit && (
                <ReferenceLine 
                  y={currentLimit} 
                  stroke="#ef4444" 
                  strokeDasharray="3 3" 
                  label={{ 
                    position: 'top', 
                    value: 'Prescribed Limit', 
                    fill: '#ef4444', 
                    fontSize: 12,
                    fontWeight: 600
                  }} 
                />
              )}
              
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#1a2327', strokeWidth: 2 }} 
                activeDot={{ r: 8, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
};

export default IndustryComplianceChart;
