import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Bell,
  Map as MapIcon,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Car,
  Send,
  Sparkles
} from "lucide-react";

import bgImage from "../assets/bg/prithvinet-bg.png";

const RODashboard = () => {

  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    resolvedToday: 12,
    pendingInspections: 8,
    overdue: 3
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/alerts");
      setAlerts(response.data);
    } catch (error) {
      console.error(error);

      // fallback demo data
      setAlerts([
        {
          id: "PR-9402",
          industry_id: "Indus Steel Manufacturing",
          location: "Okhla Industrial Area",
          parameter: "PM2.5",
          exceeded_value: 185,
          allowed_value: 60,
          severity: "HIGH"
        }
      ]);
    }
  };

  const handleResolve = (alertId) => {
    setAlerts(alerts.filter((a) => a.id !== alertId));

    setStats((prev) => ({
      ...prev,
      resolvedToday: prev.resolvedToday + 1
    }));
  };

  return (

    <div className="relative min-h-screen text-gray-300 font-sans overflow-hidden">

      {/* Background Image */}
      <img
        src={bgImage}
        alt="background"
        className="absolute inset-0 w-full h-full object-cover -z-20"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-[#0b1114]/90 -z-10"></div>

      {/* Ambient Glow */}
      <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-emerald-500/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-emerald-500/10 blur-[140px] pointer-events-none"></div>


      {/* PAGE CONTENT */}
      <div className="relative z-10 pb-24">

        {/* HEADER */}
        <header className="flex justify-between items-center p-4 bg-[#11181c]/80 backdrop-blur-md border-b border-[#232f36] sticky top-0">

          <div className="flex items-center gap-2">
            <div className="bg-[#1ccb5b] p-1.5 rounded-md">
              <Sparkles className="w-4 h-4 text-black" />
            </div>

            <h1 className="text-white font-semibold text-lg">
              PrithviNet Officer
            </h1>
          </div>

          <div className="flex items-center gap-4">

            <Bell className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer" />

            <div className="w-8 h-8 rounded-full bg-[#1b2b22] text-[#1ccb5b] flex items-center justify-center font-bold text-sm">
              RO
            </div>

          </div>

        </header>



        {/* MAIN DASHBOARD */}
        <div className="p-6 space-y-6 max-w-3xl mx-auto">


          {/* SUMMARY */}
          <div className="bg-[#151c21]/85 backdrop-blur-md rounded-xl p-5 border border-[#232f36] shadow-lg">

            <div className="flex justify-between items-start">

              <p className="text-gray-400 text-sm">
                Total Active Alerts
              </p>

              <AlertTriangle className="w-4 h-4 text-red-500" />

            </div>

            <h2 className="text-white text-3xl font-bold mt-2">
              {alerts.length}
            </h2>

          </div>



          {/* STATS */}
          <div className="grid grid-cols-2 gap-4">

            <div className="bg-[#151c21]/85 backdrop-blur-md rounded-xl p-4 border border-[#232f36]">

              <p className="text-gray-400 text-xs">
                Resolved Today
              </p>

              <h2 className="text-white text-2xl font-bold">
                {stats.resolvedToday}
              </h2>

            </div>

            <div className="bg-[#151c21]/85 backdrop-blur-md rounded-xl p-4 border border-[#232f36]">

              <p className="text-gray-400 text-xs">
                Pending Inspections
              </p>

              <h2 className="text-white text-2xl font-bold">
                {stats.pendingInspections}
              </h2>

              <p className="text-amber-400 text-xs flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                {stats.overdue} overdue
              </p>

            </div>

          </div>



          {/* ALERTS */}
          <div className="space-y-4">

            {alerts.map((alert) => (

              <div
                key={alert.id}
                className="bg-[#151c21]/85 backdrop-blur-md rounded-xl p-5 border border-[#232f36]"
              >

                <div className="flex justify-between mb-2">

                  <span className="text-red-400 text-xs font-bold">
                    {alert.severity}
                  </span>

                  <span className="text-gray-500 text-xs">
                    {alert.id}
                  </span>

                </div>

                <h3 className="text-white font-bold">
                  {alert.industry_id}
                </h3>

                <p className="text-gray-400 text-xs flex items-center gap-1">
                  <MapIcon className="w-3 h-3" />
                  {alert.location}
                </p>

                <div className="mt-3 text-red-400 font-semibold">
                  {alert.parameter} : {alert.exceeded_value}
                </div>

                <div className="flex gap-2 mt-4">

                  <button className="flex-1 bg-[#1ccb5b] text-black px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1">
                    <Send className="w-4 h-4" />
                    Notice
                  </button>

                  <button className="flex-1 bg-[#1e2532] text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 border border-[#303d52]">
                    <Car className="w-4 h-4" />
                    Field Visit
                  </button>

                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    Dismiss
                  </button>

                </div>

              </div>

            ))}

          </div>

        </div>



        {/* BOTTOM NAV */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#11181c]/80 backdrop-blur-md border-t border-[#232f36] px-6 py-3 flex justify-between items-center">

          <button className="flex flex-col items-center gap-1 text-[#1ccb5b]">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-[10px]">Alerts</span>
          </button>

          <button className="flex flex-col items-center gap-1 text-gray-400">
            <MapIcon className="w-5 h-5" />
            <span className="text-[10px]">Map</span>
          </button>

          <button className="flex flex-col items-center gap-1 text-gray-400">
            <FileText className="w-5 h-5" />
            <span className="text-[10px]">Reports</span>
          </button>

        </div>

      </div>

    </div>
  );

};

export default RODashboard;