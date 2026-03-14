import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  BarChart3,
  User,
  Lock,
  ArrowRight,
  Globe,
  Leaf,
  Briefcase,
  Eye,
  Factory,
  ShieldCheck
} from 'lucide-react';

import { AuthContext } from '../context/AuthContext';
import bgImage from "../assets/bg/prithvinet-bg.png";

const Login = () => {

  const [selectedRole, setSelectedRole] = useState('super_admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(username, password);

    setIsLoading(false);

    if (result.success) {
      if (selectedRole === 'super_admin') navigate('/admin-dashboard');
      else if (selectedRole === 'ro') navigate('/ro-dashboard');
      else if (selectedRole === 'monitoring_team') navigate('/monitoring-dashboard');
      else if (selectedRole === 'industry') navigate('/industry');
      else navigate('/');
    } else {
      setError(result.error || 'Failed to login. Please check your credentials.');
    }
  };

  const roles = [
    { id: 'super_admin', label: 'SUPER ADMIN', icon: ShieldCheck },
    { id: 'ro', label: 'REGIONAL OFF.', icon: Briefcase },
    { id: 'monitoring_team', label: 'MONITORING', icon: Eye },
    { id: 'industry', label: 'INDUSTRY', icon: Factory },
  ];

  return (
    <div className="min-h-screen bg-[#0b1114] text-slate-300 flex flex-col font-sans relative overflow-hidden">

      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={bgImage}
          alt="background"
          className="w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1114]/70 via-[#0b1114]/60 to-[#0b1114]/80 backdrop-blur-[1px]"></div>
      </div>

      {/* Navbar */}
      <nav className="absolute top-0 left-0 w-full h-[72px] bg-[#1a2327]/90 backdrop-blur-md border-b border-[#263238] flex justify-between items-center px-8 z-10">

        <div className="flex items-center gap-3">

          <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-emerald-500">
            <Globe className="w-5 h-5" />
          </div>

          <div>
            <h2 className="font-bold text-lg text-white">PrithviNet</h2>
            <p className="text-xs text-emerald-500 font-medium">
              Authentication Portal
            </p>
          </div>

        </div>

        <div className="flex items-center gap-6 text-sm font-medium">
          <a href="#" className="hover:text-emerald-400 text-slate-300">Help</a>
          <a href="#" className="hover:text-emerald-400 text-slate-300">English</a>
        </div>

      </nav>

      {/* MAIN */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-6 lg:px-12 pt-32 lg:pt-24 pb-20 items-center justify-between relative z-10">

        {/* LEFT SECTION */}
        <div className="w-full lg:w-[45%] mb-12 lg:mb-0">

          <div className="bg-[#0f1a1f]/70 backdrop-blur-lg border border-emerald-500/20 rounded-2xl p-10 shadow-[0_0_40px_rgba(16,185,129,0.08)]">

            <div className="w-14 h-14 bg-emerald-900/40 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 mb-8">
              <Leaf className="w-7 h-7" />
            </div>

            <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
              Environmental <br /> Monitoring Portal
            </h1>

            <p className="text-lg text-slate-300 mb-12 max-w-md font-semibold leading-relaxed">
              Official gateway for the
              <span className="text-emerald-400 font-bold"> Chhattisgarh Environment Conservation Board</span>.
              Ensuring sustainable industrial growth through digital oversight.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">

              <div className="flex-1 bg-[#0f1a1f]/70 backdrop-blur-md border border-emerald-500/15 rounded-xl p-5 hover:border-emerald-500/30 transition-all">

                <Shield className="w-6 h-6 text-emerald-400 mb-3" />

                <h3 className="text-white font-semibold mb-1">
                  Secure Access
                </h3>

                <p className="text-xs text-slate-400">
                  256-bit SSL Encrypted
                </p>

              </div>

              <div className="flex-1 bg-[#0f1a1f]/70 backdrop-blur-md border border-emerald-500/15 rounded-xl p-5 hover:border-emerald-500/30 transition-all">

                <BarChart3 className="w-6 h-6 text-emerald-400 mb-3" />

                <h3 className="text-white font-semibold mb-1">
                  Real-time Data
                </h3>

                <p className="text-xs text-slate-400">
                  Live Industry Feeds
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* LOGIN CARD */}
        <div className="w-full lg:w-[45%] max-w-[480px]">

          <div className="bg-[#0f1a1f]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-8 shadow-[0_0_40px_rgba(16,185,129,0.08)]">

            <h2 className="text-2xl text-white font-bold mb-6 text-center">
              Sign In to Your Account
            </h2>

            <form onSubmit={handleLogin} className="space-y-6">

              {/* ROLE SELECTOR */}
              <div className="space-y-3">

                <label className="text-sm font-medium text-slate-300">
                  Select Your Role
                </label>

                <div className="grid grid-cols-2 gap-3">

                  {roles.map((role) => {

                    const Icon = role.icon;

                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${
                          selectedRole === role.id
                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                            : 'border-slate-700 bg-[#0f1a1f]/60 text-slate-400 hover:bg-[#0f1a1f]'
                        }`}
                      >

                        <Icon className="w-5 h-5 mb-1.5" />

                        {role.label}

                      </button>
                    );

                  })}

                </div>

              </div>

              {/* ERROR */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-center">
                  {error}
                </div>
              )}

              {/* USERNAME */}
              <div className="space-y-1.5">

                <label className="text-sm font-medium text-slate-300">
                  Username or Email
                </label>

                <div className="relative">

                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-500" />
                  </div>

                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your credentials"
                    className="block w-full pl-11 pr-4 py-3 bg-[#0f1a1f]/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />

                </div>

              </div>

              {/* PASSWORD */}
              <div className="space-y-1.5">

                <div className="flex justify-between items-center">

                  <label className="text-sm font-medium text-slate-300">
                    Password
                  </label>

                  <a href="#" className="text-xs text-emerald-500 hover:text-emerald-400">
                    Forgot Password?
                  </a>

                </div>

                <div className="relative">

                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500" />
                  </div>

                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-11 pr-4 py-3 bg-[#0f1a1f]/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />

                </div>

              </div>

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              >

                {isLoading ? 'Signing In...' : 'Sign In'}

                {!isLoading && <ArrowRight className="w-5 h-5" />}

              </button>

              <div className="border-t border-slate-800"></div>

              {/* PUBLIC PORTAL */}
              <button
                type="button"
                onClick={() => navigate('/public-portal')}
                className="w-full flex items-center justify-center gap-2 bg-[#0f1a1f]/70 hover:bg-[#132328] border border-emerald-500/20 text-slate-200 font-semibold py-3 px-4 rounded-xl transition-all"
              >

                <Globe className="w-5 h-5 text-emerald-500" />

                Public Access (Citizens)

              </button>

              <p className="text-xs text-center text-slate-500 mt-4">
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </p>

            </form>

          </div>

        </div>

      </main>

    </div>
  );
};

export default Login;