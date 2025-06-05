import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { HashRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Login from './login';
import Register from './register';
import Dashboard from './dashboard';
import Profile from './profile';
import PasswordChange from './change password';
import Logout from './logout';
import ProtectedRoute from './Protected Route';
import UserManagement from './user-management';
import TicketManagement from './tickets';
import Chat from './chat';


function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <Routes>
            {/* Redirect to Login page if no specific route is provided */}
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path='/password' element={<ProtectedRoute><PasswordChange /></ProtectedRoute>} />
            <Route path='/logout' element={<ProtectedRoute><Logout /></ProtectedRoute>} />
            <Route path='/user' element={<ProtectedRoute requiredRole="admin"><UserManagement /></ProtectedRoute>} />
            <Route path="/ticket" element={<ProtectedRoute><TicketManagement /></ProtectedRoute>} />
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />           
          </Routes>
        </header>
      </div>
    </Router>
  );
}

export default App;