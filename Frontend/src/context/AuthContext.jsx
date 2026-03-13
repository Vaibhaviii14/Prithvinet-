import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Initialize from localStorage on load
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const role = localStorage.getItem('role');

        if (token && role) {
            setUser({ token, role });
        }
        setLoading(false);
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

            // Since FastAPI typically just returns access_token and token_type in OAuth2 spec,
            // it's possible role is also sent if customized.
            // If role isn't from the backend, we might want to decode token or just use what we have.
            // We will assume the custom response contains both access_token and user role.

            localStorage.setItem('access_token', access_token);
            localStorage.setItem('role', role || 'unknown');

            setUser({ token: access_token, role: role || 'unknown' });
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
