import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Nav from 'react-bootstrap/Nav';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Button from 'react-bootstrap/Button';
import logo from './logo.png';

function ChangePassword() {
    const [showOffcanvas, setShowOffcanvas] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const userRole = localStorage.getItem("userRole");

    useEffect(() => {
        if (successMessage || errorMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
                setErrorMessage('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, errorMessage]);

    const handleClose = () => setShowOffcanvas(false);
    const handleShow = () => setShowOffcanvas(true);
    const userName = localStorage.getItem('userName');

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setErrorMessage('New password and confirmation do not match.');
            return;
        }

        if (currentPassword === newPassword) {
            setErrorMessage('The new password cannot be the same as the current password.');
            return;
        }

        try {
            const authToken = localStorage.getItem('authToken'); // Assuming JWT token is stored in localStorage

            // Send the request to the backend
            const res = await axios.post(
                `${process.env.REACT_APP_BASE_URL}/registration/change-password`,
                { currentPassword, newPassword },
                {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                    },
                }
            );

            if (res.data.success) {
                setSuccessMessage('Password changed successfully!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (error) {
            setErrorMessage(error.response?.data?.error || 'An error occurred while changing password');
        }
    };


    return (
        <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>

            {/* Left Navigation */}
            <Nav
                className="flex-column text-white p-4 d-none d-md-block"
                style={{ backgroundColor: '#1d2531', width: '20vw', height: '100%', overflowY: 'auto' }}
            >
                <h3 className="text-white mt-5">Menu</h3>
                <Nav.Link as={Link} to="/dashboard" className="text-white mb-4">
                    <i className="bi bi-speedometer2 text-white me-2"></i>
                    <span className="d-none d-sm-inline">Dashboard</span>
                </Nav.Link>

                <Nav.Link as={Link} to="/chat" className="text-white mb-4">
                    <i className="bi bi-chat text-white me-2"></i>
                    <span className="d-none d-sm-inline">Chat</span>
                </Nav.Link>
                <Nav.Link as={Link} to="/ticket" className="text-white mb-4">
                    <i className="bi bi-ticket text-white me-2"></i>
                    <span className="d-none d-sm-inline">Ticket</span>
                </Nav.Link>
                {userRole === 'admin' && (
                    <Nav.Link as={Link} to="/user" className="text-light mb-4 d-flex align-items-center">
                        <i className="bi bi-folder-fill me-2"></i>
                        <span className="d-none d-sm-inline">User Management</span>
                    </Nav.Link>
                )}
                <Nav.Link as={Link} to="/password" className="text-white mb-4">
                    <i className="bi bi-key-fill text-white me-2"></i>
                    <span className="d-none d-sm-inline">Change Password</span>
                </Nav.Link>
                <Nav.Link as={Link} to="/logout" className="text-white mb-4">
                    <i className="bi bi-arrow-left text-white me-2"></i>
                    <span className="d-none d-sm-inline">Log Out</span>
                </Nav.Link>
                <Nav.Link as={Link} to="/profile" className="text-white mb-4">
                    <i className="bi bi-person text-white me-2"></i>
                    <span className="d-none d-sm-inline">Profile</span>
                </Nav.Link>
            </Nav>

            <Offcanvas show={showOffcanvas} onHide={handleClose} placement="start" style={{ width: "250px" }}>
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>Menu</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    <Nav className="flex-column">
                        <Nav.Link as={Link} to="/dashboard" onClick={handleClose}>
                            <i className="bi bi-speedometer2 me-2"></i> Dashboard
                        </Nav.Link>

                        <Nav.Link as={Link} to="/chat" onClick={handleClose}>
                            <i className="bi bi-chat me-2"></i> Chat
                        </Nav.Link>
                        <Nav.Link as={Link} to="/ticket" onClick={handleClose}>
                            <i className="bi bi-ticket me-2"></i> Ticket
                        </Nav.Link>
                        {userRole === 'admin' && (<Nav.Link as={Link} to="/user" onClick={handleClose}>
                            <i className="bi bi-folder-fill me-2"></i> User Management
                        </Nav.Link>)}
                        <Nav.Link as={Link} to="/password" onClick={handleClose}>
                            <i className="bi bi-key-fill me-2"></i> Change Password
                        </Nav.Link>
                        <Nav.Link as={Link} to="/logout" onClick={handleClose}>
                            <i className="bi bi-arrow-right me-2"></i> Log Out
                        </Nav.Link>
                        <Nav.Link as={Link} to="/profile" onClick={handleClose}>
                            <i className="bi bi-person me-2"></i> Profile
                        </Nav.Link>
                    </Nav>
                </Offcanvas.Body>
            </Offcanvas>

            {/* Main Content Area */}
            <div
                className="flex-grow-1"
                style={{ backgroundColor: '#f2f7fb', position: 'relative', overflowY: 'auto' }}
            >
                {/* Top Bar */}
                <div
                    className="text-white d-flex align-items-center justify-content-between px-3"
                    style={{
                        padding: '0.5rem',
                        fontSize: '25px',
                        backgroundColor: '#6B6A03',
                        position: 'fixed',
                        height: '75px',
                        top: 0,
                        left: 0,
                        right: 0,
                        width: '100%',
                        zIndex: 1000,
                    }}
                >
                    <Button
                        variant="link"
                        className="text-white d-md-none"
                        onClick={handleShow}
                        style={{
                            fontSize: '1rem',
                            padding: '5px',
                            width: '40px',
                            height: '40px',
                        }}
                    >
                        <i className="bi bi-three-dots"></i>
                    </Button>
                    <div className="d-flex justify-content-start align-items-start p-2">
                        <img
                            src={logo}
                            alt="User Illustration"
                            className="img-fluid"
                            style={{ width: '50%', height: 'auto' }}
                        />
                    </div>
                    <div className="d-flex align-items-center">
                        <i className="bi bi-person text-white me-2"></i>
                        <h6
                            className="mb-0 text-uppercase"
                            style={{
                                fontSize: '15px',
                                marginRight: '25px',
                            }}
                        >
                            {userName}
                        </h6>
                    </div>
                </div>

                {/* Change Password Section */}
                <div className="mt-4 ms-1 me-1 justify-content-centre bg-light border border-black rounded shadow d-flex" style={{ paddingTop: '55px' }}>
                    <div className="w-100">
                        <h4
                            className="text-dark p-1 rounded shadow w-100"
                            style={{ backgroundColor: ' #87A419' }}
                        >
                            Change Password
                        </h4>
                        {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}
                        {successMessage && <div className="alert alert-success">{successMessage}</div>}
                        <form onSubmit={handlePasswordChange}>
                            <div className="mt-3 ms-2 mb-3">
                                <label htmlFor="password" className="form-label">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    id="currentPassword"
                                    className="form-control"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mt-3 ms-2 mb-3">
                                <label htmlFor="password" className="form-label">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    className="form-control"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="mt-3 ms-2 mb-3">
                                <label htmlFor="confirmPassword" className="form-label">
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    className="form-control"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary w-100 mt-3">
                                Change Password
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChangePassword;
