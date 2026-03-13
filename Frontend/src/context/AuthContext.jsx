import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Initialize from localStorage on load
    useEffect(() => {
        const initializeAuth = async () => {
            const token = localStorage.getItem('access_token');
            const role = localStorage.getItem('role');
            
            if (token && role) {
                try {
                    // Always try to get fresh user data on load
                    const res = await api.get('/api/auth/me', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    localStorage.setItem('user', JSON.stringify(res.data));
                    setUser({ token, role, ...res.data });
                } catch (err) {
                    console.error("Failed to fetch user session", err);
                    // Fallback to basic auth state if network fails
                    const storedUser = localStorage.getItem('user');
                    if (storedUser) {
                        setUser({ token, role, ...JSON.parse(storedUser) });
                    } else {
                        setUser({ token, role });
                    }
                }
            }
            setLoading(false);
        };
        initializeAuth();
    }, []);

    const login = async (username, password) => {
        try {
            // FastAPI explicitly expects form-urlencoded data for OAuth2
            const params = new URLSearchParams();
            params.append('username', username);
            params.append('password', password);

            const response = await api.post('/api/auth/login', params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });

            const { access_token, role } = response.data;

            localStorage.setItem('access_token', access_token);
            localStorage.setItem('role', role || 'unknown');

            // Fetch full profile immediately after login
            const userRes = await api.get('/api/auth/me', {
                headers: { Authorization: `Bearer ${access_token}` }
            });
            localStorage.setItem('user', JSON.stringify(userRes.data));

            setUser({ token: access_token, role: role || 'unknown', ...userRes.data });
            return { success: true };
        } catch (error) {
            console.error("Login failed:", error);
            return {
                success: false,
                error: error.response?.data?.detail || "An error occurred during login."
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('role');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
