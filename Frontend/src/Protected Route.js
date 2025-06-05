import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, requiredRole }) {
  const authToken = localStorage.getItem('authToken');
  const sessionExpiryTime = parseInt(localStorage.getItem('sessionExpiryTime'), 10);
  const userRole = localStorage.getItem('userRole'); // Get the stored user role

  useEffect(() => {
    const checkSession = () => {
      const currentTime = Date.now();
      if (sessionExpiryTime && currentTime > sessionExpiryTime) {
        localStorage.clear();
        localStorage.setItem('sessionExpiredMessage', 'Your session has expired. Please log in again.');
        window.location.href = '/login';
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 1000);

    return () => clearInterval(interval); 
  }, [sessionExpiryTime]);

  if (!authToken) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}

export default ProtectedRoute;
