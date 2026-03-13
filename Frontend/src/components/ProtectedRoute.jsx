import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles = [] }) => {
    const { user, loading } = useContext(AuthContext);

    // TEMPORARY BYPASS FOR DEVELOPMENT: allow access without login
    return <Outlet />;

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-[#0b1114]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    // Not logged in
    if (!user || !user.token) {
        return <Navigate to="/login" replace />;
    }

    // Active role not allowed
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
