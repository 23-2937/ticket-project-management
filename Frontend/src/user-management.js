import React, { useEffect, useState, useCallback } from "react";
import { Link } from 'react-router-dom';
import axios from 'axios';
import Nav from 'react-bootstrap/Nav';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Button from 'react-bootstrap/Button';
import logo from './logo.png';




function UserManagement() {
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [roles] = useState(['customer', 'admin', 'support agent']);
    const handleClose = () => setShowOffcanvas(false);
    const handleShow = () => setShowOffcanvas(true);
    const [showDeactivateModal, setShowDeactivateModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [showRoleModal, setShowRoleModal] = useState(false);
    const [newRole, setNewRole] = useState('')
    const [selectedUser, setSelectedUser] = useState(null);
    const [showOffcanvas, setShowOffcanvas] = useState(false);
    const userRole = localStorage.getItem("userRole");


    const userName = localStorage.getItem('userName')

    useEffect(() => {
        if (successMessage || errorMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
                setErrorMessage('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, errorMessage]);


    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/registration`, {
                params: { search, role: roleFilter }
            });
            setUsers(response.data.users);
        } catch (error) {
            console.error('Error fetching users:', error);
            setErrorMessage('There was an error fetching users. Please try again later.');
        } finally {
            setLoading(false);
        }
    }, [search, roleFilter]);


    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleRoleChangeClick = (id, currentRole, user) => {
        setSelectedUser(user);
        setNewRole(currentRole); // Store current role
        setShowRoleModal(true); // Open modal
    };

    const handleRoleChange = async (id, selectedRole) => {
        try {
            setErrorMessage('');
            setSuccessMessage('');

            const response = await axios.put(
                `${process.env.REACT_APP_BASE_URL}/registration/${id}/role`,
                { role: selectedRole } // Use selected role from dropdown
            );

            if (response.status === 200) {
                setSuccessMessage("Role updated successfully!");
                setShowRoleModal(false); // Close modal
                await fetchUsers(); // Refresh user list
            }

        } catch (err) {
            setErrorMessage(err.response?.data?.message || "Something went wrong");
        }
    };


    const handleDeactivateClick = (user) => {
        setSelectedUser(user);
        setShowDeactivateModal(true); // Open modal
    };

    const handleDeactivate = async () => {
        if (!selectedUser) return;

        try {
            const response = await axios.put(`${process.env.REACT_APP_BASE_URL}/registration/${selectedUser.id}/deactivate`);
            setSuccessMessage(response.data.message);
            setErrorMessage('');
            setShowDeactivateModal(false); // Close modal
            await fetchUsers(); // Refresh user list
        } catch (err) {
            setErrorMessage(err.response?.data?.message || 'Error deactivating account');
        }
    };

    const handleDeleteClick = (user) => {
        setSelectedUser(user);
        setShowDeleteModal(true); // Open modal
    };

    const handleDelete = async (id) => {
        try {
            const response = await axios.delete(`${process.env.REACT_APP_BASE_URL}/registration/${id}`);
            setSuccessMessage(response.data.message);
            setErrorMessage('');
            setShowDeleteModal(false);
            await fetchUsers(); // Refresh user list
        } catch (err) {
            setErrorMessage(err.response?.data?.message || 'Error deleting user');
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
                            User Management
                        </h4>
                        {successMessage && <div className="alert alert-success">{successMessage}</div>}
                        {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}

                        <div className="me-3  d-flex justify-content-end border-black rounded">
                            <input
                                type="text"
                                placeholder="Search by name"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="mb-2 ms-2">
                            <select onChange={(e) => setRoleFilter(e.target.value)} value={roleFilter}>
                                <option value=''>All roles</option>
                                {roles.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                        {loading ? <p>loading ...</p> : (
                            <div className="table-responsive">
                                <table className="table ms-2">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(user => (
                                            <tr key={user.id}>
                                                <td>{user.name}</td>
                                                <td>{user.email}</td>
                                                <td>{user.role}</td>
                                                <td>{user.status === 'inactive' ? 'Inactive' : 'Active'}</td>
                                                <td>
                                                    {/* Add actions if needed */}
                                                    <span onClick={() => handleRoleChangeClick(user.id, user.role, user)}
                                                        style={{ cursor: "pointer", marginRight: '10px' }}>
                                                        <i className="bi bi-pencil text-primary me-2" style={{ marginRight: '5px' }}
                                                        ></i>
                                                        Role
                                                    </span>
                                                    <span onClick={() => handleDeactivateClick(user)} style={{ cursor: "pointer", marginRight: '10px' }}>
                                                        <i className={`bi ${user.status === 'inactive' ? 'bi-person-x text-danger' : 'bi-person-check text-success'}`} style={{ marginRight: '5px' }}></i>
                                                        Deactivate
                                                    </span>

                                                    <span onClick={() => handleDeleteClick(user)}
                                                        style={{ cursor: "pointer", marginRight: '10px' }}>

                                                        <i className="bi bi-trash ms-2" style={{ marginRight: '5px' }}></i>
                                                        Delete
                                                    </span>

                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {showDeactivateModal && selectedUser && (
                                    <div className="modal fade show d-block" tabIndex="-1">
                                        <div className="modal-dialog">
                                            <div className="modal-content">
                                                <div className="modal-header">
                                                    <h5 className="modal-title">Confirm Action</h5>
                                                    <button type="button" className="btn-close" onClick={() => setShowDeactivateModal(false)}></button>
                                                </div>
                                                <div className="modal-body">
                                                    <p>Are you sure you want to change the status of <strong>{selectedUser.name}</strong>?</p>
                                                </div>
                                                <div className="modal-footer">
                                                    <button className="btn btn-secondary" onClick={() => setShowDeactivateModal(false)}>Cancel</button>
                                                    <button className="btn btn-danger" onClick={handleDeactivate}>Yes, Change Status</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {showRoleModal && selectedUser && (
                                    <div className="modal fade show d-block" tabIndex="-1">
                                        <div className="modal-dialog">
                                            <div className="modal-content">
                                                <div className="modal-header">
                                                    <h5 className="modal-title">Change Role</h5>
                                                    <button type="button" className="btn-close" onClick={() => setShowRoleModal(false)}></button>
                                                </div>
                                                <div className="modal-body">
                                                    <p>Change role for <strong>{selectedUser.name}</strong>:</p>
                                                    <select
                                                        className="form-select"
                                                        value={newRole}
                                                        onChange={(e) => setNewRole(e.target.value)}
                                                    >
                                                        <option value="support agent">Support Agent</option>
                                                        <option value="admin">Admin</option>
                                                    </select>
                                                </div>
                                                <div className="modal-footer">
                                                    <button className="btn btn-secondary" onClick={() => setShowRoleModal(false)}>Cancel</button>
                                                    <button className="btn btn-success" onClick={() => handleRoleChange(selectedUser.id, newRole)}>Save Changes</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {showDeleteModal && selectedUser && (
                                    <div className="modal fade show d-block" tabIndex="-1">
                                        <div className="modal-dialog">
                                            <div className="modal-content">
                                                <div className="modal-header">
                                                    <h5 className="modal-title">Confirm Action</h5>
                                                    <button type="button" className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
                                                </div>
                                                <div className="modal-body">
                                                    <p>Are you sure you want to delete the account for <strong>{selectedUser.name}</strong>?</p>
                                                </div>
                                                <div className="modal-footer">
                                                    <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                                                    <button className="btn btn-danger" onClick={() => handleDelete(selectedUser.id)}>
                                                        Yes, delete Account
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagement;