import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap-icons/font/bootstrap-icons.css';
import avatar from './avatar.jpg';
import logo from './logo.png';
import { Nav, Offcanvas, Button, Form, Modal } from 'react-bootstrap';


function UserProfile() {
    const [userProfile, setUserProfile] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [showOffcanvas, setShowOffcanvas] = useState(false);
    const handleClose = () => setShowOffcanvas(false);
    const handleShow = () => setShowOffcanvas(true);
    const [updatedProfile, setUpdatedProfile] = useState({ name: '', email: '' })
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem("userRole");


    useEffect(() => {
        const fetchUserprofile = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const email = localStorage.getItem('userEmail');
                if (!token || !email) {
                    console.error('No auth token found');
                    return;
                }
                const response = await fetch(`${process.env.REACT_APP_BASE_URL}/register/profile`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`, // Fixed string interpolation
                    },
                    body: JSON.stringify({ email }),

                });
                if (!response.ok) {
                    console.error(`Failed to fetch profile: ${response.status}`);
                    throw new Error(`Failed to fetch profile: ${response.status}`);
                }

                const data = await response.json();
                setUserProfile(data);
                setUpdatedProfile({ name: data.name, email: data.email }); // Set updatedProfile

            } catch (err) {

                setErrorMessage('error fetching profile:', err);
            }
        };
        fetchUserprofile();
    }, []);
    const handleInputChange = (e) => {
        setUpdatedProfile({ ...updatedProfile, [e.target.name]: e.target.value });
    };
    const handleEditClick = () => {
        if (userProfile) {
            setUpdatedProfile({ name: userProfile.name, email: userProfile.email }); // Pre-fill modal
            setShowModal(true);
        }
    };
    const handleProfileUpdate = async (e) => {
        e.preventDefault();


        if (!userProfile.name || !userProfile.email) {
            setErrorMessage("Name and Email are required.");
            return;
        }

        try {
            const authToken = localStorage.getItem("authToken");
            if (!authToken) {
                throw new Error("Unauthorized: Please log in again.");
            }

            console.log("Sending request to:", `${process.env.REACT_APP_BASE_URL}/registration/update`);
            console.log("Request Payload:", updatedProfile);

            const response = await fetch(`${process.env.REACT_APP_BASE_URL}/registration/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify(updatedProfile),
            });

            console.log("Response Status:", response.status);

            let data;
            try {
                data = await response.json();
                console.log("Server Response:", data);
            } catch (jsonError) {
                throw new Error("Unexpected server response. Please try again.");
            }

            if (!response.ok) {
                throw new Error(data.message || `Failed to update profile: ${response.status}`);
            }

            setSuccessMessage(data.message || "Profile updated successfully");
            setUserProfile(updatedProfile);
            setErrorMessage(null);

            setShowModal(false);
            setShowOffcanvas(false);

        } catch (error) {
            console.error("Profile update failed:", error);
            setErrorMessage(error.message);
        }
    };



    if (!userProfile) return <p>isLoading......</p>;

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


                {/* User Profile Section */}
                <div className=" mt-4 ms-1 me-1 justify-content-centre bg-light border border-black rounded shadow d-flex" style={{ paddingTop: '55px' }}>
                    <div className="w-100">
                        <h4
                            className="text-dark p-1 rounded shadow w-100"
                            style={{ backgroundColor: ' #87A419' }}
                        >
                            User Profile
                        </h4>
                        {!userProfile && <p>Loading...</p>}

                        {errorMessage && <p className="text-danger">{errorMessage}</p>}
                        {successMessage && <p className="text-success">{successMessage}</p>}


                        <div className="container mt-4">
                            <div className="card shadow-lg border-0 p-4 bg-light text-center">
                                {/* Avatar Section */}
                                <div className="col-md-3 d-flex align-items-center justify-content-start mb-2">
                                    <img
                                        src={avatar}
                                        alt="User Avatar"
                                        className="rounded-circle border border-dark shadow-sm"
                                        style={{ width: '70px', height: '70px', objectFit: 'cover' }}
                                    />
                                </div>

                                {/* User Details Section */}
                                <div className="row mt-3">
                                    {/* Left Column */}
                                    <div className="col-md-6 text-md-start">
                                        <p className="border-bottom pb-1">
                                            <strong>Name:</strong> <span className="badge bg-success mb-2 ms-5">{userProfile.name}</span>
                                        </p>
                                        <p className="border-bottom pb-1">
                                            <strong>Email:</strong> <span className="badge bg-success ms-5">{userProfile.email}</span>
                                        </p>
                                    </div>

                                    {/* Right Column */}
                                    <div className="col-md-6 text-md-start">
                                        <p className="border-bottom pb-1">
                                            <strong>Role:</strong> <span className="badge bg-success mb-2 ms-5">{userProfile.role}</span>
                                        </p>
                                        <p className="border-bottom pb-1">
                                            <strong>Account Status:</strong> <span className="badge bg-success ms-5">{userProfile.status}</span>
                                        </p>
                                    </div>

                                </div>
                            </div>
                        </div>



                    </div>
                </div>
                {/* Edit Profile  */}
                <Button variant="primary" className="mt-3 ms-2" onClick={handleEditClick}>Edit Profile</Button>

                {/* Edit Profile Modal */}
                <Modal show={showModal} onHide={() => setShowModal(false)}>
                    <Modal.Header closeButton>
                        <Modal.Title>Edit Profile</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form onSubmit={handleProfileUpdate}>
                            <Form.Group className="mb-3">
                                <Form.Label>Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="name"
                                    value={updatedProfile.name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Email</Form.Label>
                                <Form.Control
                                    type="email"
                                    name="email"
                                    value={updatedProfile.email}
                                    onChange={handleInputChange}
                                    required
                                />
                            </Form.Group>
                            <Button variant="success" type="submit">Save Changes</Button>
                        </Form>
                    </Modal.Body>
                </Modal>
            </div>
        </div>
    );
}
export default UserProfile;      