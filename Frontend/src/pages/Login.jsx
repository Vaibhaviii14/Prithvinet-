import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, BarChart3, User, Lock, ArrowRight, Globe, Leaf, Briefcase, Eye, Factory, ShieldCheck } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

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
            // Redirect based on the selectedRole that presumably matches their account
            if (selectedRole === 'super_admin') navigate('/admin-dashboard');
            else if (selectedRole === 'ro') navigate('/ro-dashboard');
            else if (selectedRole === 'monitoring_team') navigate('/monitoring-dashboard');
            else if (selectedRole === 'industry') navigate('/industry-dashboard');
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

            {/* Background ambient light */}
            <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-900/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

            {/* Header/Nav - minimal */}
            <nav className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
                <div className="flex items-center gap-2">
                    <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20 text-emerald-500">
                        <Globe className="w-6 h-6" />
                    </div>
                    <span className="text-white font-bold text-xl tracking-tight">PrithviNet</span>
                </div>
                <div className="flex items-center gap-6 text-sm font-medium">
                    <a href="#" className="hover:text-emerald-400 transition-colors">Help</a>
                    <a href="#" className="hover:text-emerald-400 transition-colors">English</a>
                </div>
            </nav>

            {/* Main Content Content */}
            <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full px-6 lg:px-12 pt-32 lg:pt-24 pb-20 items-center justify-between z-10 relative">

                {/* Left Section */}
                <div className="w-full lg:w-[45%] mb-12 lg:mb-0">
                    <div className="w-14 h-14 bg-emerald-900/30 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-500 mb-8">
                        <Leaf className="w-7 h-7" />
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
                        Environmental <br /> Monitoring Portal
                    </h1>
                    <p className="text-lg text-slate-400 mb-12 max-w-md leading-relaxed">
                        Official gateway for the <span className="text-emerald-500 font-semibold">Chhattisgarh Environment Conservation Board</span>. Ensuring sustainable industrial growth through digital oversight.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 backdrop-blur-sm">
                            <Shield className="w-6 h-6 text-emerald-500 mb-3" />
                            <h3 className="text-white font-semibold mb-1">Secure Access</h3>
                            <p className="text-xs text-slate-400">256-bit SSL Encrypted</p>
                        </div>
                        <div className="flex-1 bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 backdrop-blur-sm">
                            <BarChart3 className="w-6 h-6 text-emerald-500 mb-3" />
                            <h3 className="text-white font-semibold mb-1">Real-time Data</h3>
                            <p className="text-xs text-slate-400">Live Industry Feeds</p>
                        </div>
                    </div>
                </div>

                {/* Right Section - Auth Card */}
                <div className="w-full lg:w-[45%] max-w-[480px]">
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
                        <h2 className="text-2xl text-white font-bold mb-6 text-center">Sign In to Your Account</h2>

                        <form onSubmit={handleLogin} className="space-y-6">

                            {/* Role Selection */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-slate-300">Select Your Role</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {roles.map((role) => {
                                        const Icon = role.icon;
                                        return (
                                            <button
                                                key={role.id}
                                                type="button"
                                                onClick={() => setSelectedRole(role.id)}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all ${selectedRole === role.id
                                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                                                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                                    }`}
                                            >
                                                <Icon className="w-5 h-5 mb-1.5" />
                                                {role.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Login Error */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-center">
                                    {error}
                                </div>
                            )}

                            {/* Input Fields */}
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-slate-300">Username or Email</label>
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
                                            className="block w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-medium text-slate-300">Password</label>
                                        <a href="#" className="text-xs font-medium text-emerald-500 hover:text-emerald-400 transition-colors">
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
                                            className="block w-full pl-11 pr-4 py-3 bg-slate-950/50 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(0,230,118,0.3)] hover:shadow-[0_0_25px_rgba(0,230,118,0.4)] disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Signing In...' : 'Sign In'}
                                {!isLoading && <ArrowRight className="w-5 h-5" />}
                            </button>

                            <div className="relative py-2">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-800"></div>
                                </div>
                            </div>

                            {/* Public Portal Route */}
                            <button
                                type="button"
                                onClick={() => navigate('/public-portal')}
                                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold py-3 px-4 rounded-xl transition-all"
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

            {/* Footer */}
            <footer className="w-full text-center p-6 text-sm text-slate-500 flex flex-col items-center gap-2 z-10 shrink-0">
                <p>© 2024 Chhattisgarh Environment Conservation Board (CECB). All rights reserved.</p>
                <p>Powered by CECB IT Cell</p>
            </footer>
        </div>
    );
};

export default Login;
