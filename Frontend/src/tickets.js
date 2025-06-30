import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from 'react-router-dom';
import axios from 'axios';
import Nav from 'react-bootstrap/Nav';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Button from 'react-bootstrap/Button';
import logo from './logo.png';

function TicketManagement() {
    const [showOffcanvas, setShowOffcanvas] = useState(false);
    const [tickets, setTickets] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [supportAgents, setSupportAgents] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [, setUpdatedTickets] = useState(tickets);
    const [currentPage, setCurrentPage] = useState(1);
    const [, setTotalPages] = useState(1);
    const [file, setFile] = useState(null);
    const [editingTicket, setEditingTicket] = useState([]);
    const handleClose = () => setShowOffcanvas(false);
    const handleShow = () => setShowOffcanvas(true);
    const userRole = localStorage.getItem('userRole');
    const userName = localStorage.getItem('userName');
    const authToken = localStorage.getItem('authToken');
    const [ticketData, setTicketData] = useState({
        user_id: "",
        title: "",
        description: "",
        priority: "medium",
    });

    const handleChange = (e) => {
        setTicketData({ ...ticketData, [e.target.name]: e.target.value });
    };

    const messageRef = useRef(null);

    useEffect(() => {
      if ((successMessage || errorMessage) && messageRef.current) {
        messageRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, [successMessage, errorMessage]);

    useEffect(() => {
        if (successMessage || errorMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
                setErrorMessage('');
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, errorMessage]);

    const handleCreateTicket = async () => {
        let userId = null;
        if (authToken) {
            try {
                const decoded = JSON.parse(atob(authToken.split('.')[1])); // Decode JWT
                userId = decoded.id;
            } catch (error) {
                setErrorMessage("Invalid authentication token.");
                return;
            }
        }

        try {
            const newTicket = {
                ...ticketData,
                user_id: userId
            };

            const response = await axios.post(
                `${process.env.REACT_APP_BASE_URL}/tickets`,
                newTicket,
                { timeout: 120000 }
            );

            if (response.status === 201) {
                setSuccessMessage(response.data.message || "Ticket created successfully!");
                setErrorMessage("");
                fetchTickets();
                setShowModal(false);
                setTicketData({ user_id: "", title: "", description: "", priority: "medium" });
            } else {
                throw new Error("Unexpected response from the server.");
            }
        } catch (error) {
            setSuccessMessage("");

            if (error.code === "ECONNABORTED") {
                setErrorMessage("Request timed out. Please try again.");
                return;
            }

            if (!error.response) {
                setErrorMessage("Network error: Unable to connect to the server.");
                return;
            }

            const errorMsg = error.response.data?.message || "Error creating ticket. Please try again.";
            setErrorMessage(errorMsg);
        }
    };

    const handleFileUpload = async () => {
        if (!file) {
            setErrorMessage('Please select a file.');
            return;
        }

        const authToken = localStorage.getItem('authToken');
        let userId = null;

        if (authToken) {
            try {
                const decoded = JSON.parse(atob(authToken.split('.')[1])); // Decode JWT
                userId = decoded.id;
            } catch (error) {
                setErrorMessage("Invalid authentication token.");
                return;
            }
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', userId); // ✅ Send user_id in the formData

        try {
            const response = await axios.post(
                `${process.env.REACT_APP_BASE_URL}/tickets/bulk`,
                formData,
                {
                    headers: {
                        "Authorization": `Bearer ${authToken}`,
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (response.status === 201) {
                setSuccessMessage(response.data.message);
                setErrorMessage("");
                fetchTickets(); // Refresh tickets list
            } else {
                setErrorMessage('Unexpected response from the server.');
            }
        } catch (error) {
            setSuccessMessage('');
            if (!error.response) {
                setErrorMessage("Network error: Unable to connect to the server.");
                return;
            }

            setErrorMessage(error.response.data?.message || "Error uploading file.");
        }
    };

    const handleAssignTicket = async (ticketNumber, assignedUserId) => {
        try {
            console.log(assignedUserId)
            const response = await axios.put(
                `${process.env.REACT_APP_BASE_URL}/tickets/${ticketNumber}/assign`,
                { ticket_number: ticketNumber, user_id: assignedUserId }, // Send correct IDs
                { timeout: 120000 }
            );

            if (response.status === 200) {
                setUpdatedTickets((prevTickets) =>
                    prevTickets.map((ticket) =>
                        ticket.ticket_number === ticketNumber ? { ...ticket, assigned_to: assignedUserId } : ticket
                    )
                );

                setSuccessMessage("Ticket assigned successfully!");
                setErrorMessage("");
            } else {
                throw new Error("Something went wrong while assigning the ticket.");
            }
        } catch (error) {
            setSuccessMessage("");

            if (error.code === "ECONNABORTED") {
                setErrorMessage("Request timed out. Please try again.");
                return;
            }

            if (!error.response) {
                setErrorMessage("Network error: Unable to connect to the server.");
                return;
            }

            const errorMsg = error.response.data?.message || "An error occurred. Please try again.";
            setErrorMessage(errorMsg);
        }
    };

    const handleEditAssignedUser = async (ticketNumber, newAssignedUserId) => {
       
        try {
            const response = await axios.put(
                `${process.env.REACT_APP_BASE_URL}/ticket/${ticketNumber}/edit-assigned`,
                { user_id: newAssignedUserId }, // Fix payload
                { timeout: 120000 } // Fix Axios config
            );

            if (response.status === 200) {
                setTickets((prevTickets) =>
                    prevTickets.map((ticket) =>
                        ticket.ticket_number === ticketNumber
                            ? { ...ticket, assigned_to: newAssignedUserId }
                            : ticket
                    )
                );
                setSuccessMessage('Ticket assignment updated successfully');
                setErrorMessage('');
            } else {
                throw new Error("Something went wrong while updating the ticket assignment.");
            }
        } catch (error) {
            setSuccessMessage('');
            setErrorMessage('Failed to update assignment');
        }
    };

    const fetchTickets = useCallback(async () => {
        try {
            const authToken = localStorage.getItem("authToken");
            const userRole = localStorage.getItem("userRole");
            const userId = localStorage.getItem("userId");

            if (!authToken || !userRole || !userId) {
                console.error("Missing authentication details");
                return;
            }

            const response = await fetch(
                `${process.env.REACT_APP_BASE_URL}/tickets?query=${searchTerm}&role=${userRole}&userId=${userId}&page=${currentPage}&limit=20`,
                {
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            setTickets(data.tickets);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error("Error fetching tickets:", error);
        }
    }, [searchTerm, currentPage]);

    const handleDelete = async (ticketId) => {
        if (window.confirm("Are you sure you want to delete this ticket?")) {
            try {
                const authToken = localStorage.getItem("authToken"); // Get the token

                const response = await fetch(`${process.env.REACT_APP_BASE_URL}/tickets/${ticketId}`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${authToken}`, // Attach token
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                // Refresh the ticket list after successful deletion
                fetchTickets();
            } catch (error) {
                console.error("Error deleting ticket:", error);
            }
        }
    };

    useEffect(() => {
        fetchTickets(currentPage);
        fetchSupportAgents();
    }, [fetchTickets, currentPage]);


    const fetchSupportAgents = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/registration/agents`);
            setSupportAgents(response.data);
        } catch (error) {
            console.error("Error fetching support agents:", error);
        }
    };

    const handleStatusChange = async (ticketNumber, newStatus) => {
        try {
            const response = await axios.put(
                `${process.env.REACT_APP_BASE_URL}/tickets/${ticketNumber}/status`,
                { status: newStatus, ticket_number: ticketNumber },
                { timeout: 120000 }
            );

            if (response.status === 200) {
                const currentTime = new Date().toISOString();

                setUpdatedTickets((prevTickets) =>
                    prevTickets.map((ticket) =>
                        ticket.ticket_number === ticketNumber
                            ? {
                                ...ticket,
                                status: newStatus,
                                resolved_at:
                                    newStatus === "resolved" ? currentTime :
                                        (newStatus === "open" || newStatus === "in progress" ? null : ticket.resolved_at),

                                closed_at:
                                    newStatus === "closed" ? currentTime :
                                        (newStatus === "open" || newStatus === "in progress" ? null : ticket.closed_at),
                            }
                            : ticket
                    )
                );

                setSuccessMessage("Ticket status updated successfully!");
                fetchTickets(); // Refresh ticket list
                setErrorMessage("");
            } else {
                setErrorMessage("Unexpected response from server.");
            }
        } catch (error) {
            setSuccessMessage("");

            if (error.code === "ECONNABORTED") {
                setErrorMessage("Request timed out. Please try again.");
                return;
            }

            if (!error.response) {
                setErrorMessage("Network error: Unable to connect to the server.");
                return;
            }

            // Extract error message from server response
            const errorMsg = error.response.data?.message || "Failed to update status. Please try again.";
            setErrorMessage(errorMsg);
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

                {/* Ticket Section */}
                <div className="mt-4 ms-1 me-1 justify-content-centre bg-light border border-black rounded shadow d-flex" style={{ paddingTop: '55px' }}>
                    <div className="w-100">
                        <h4 className="text-dark p-1 rounded shadow w-100" style={{ backgroundColor: '#87A419' }}>
                            Ticket Management
                        </h4>

                        <div className="d-flex align-items-center gap-3 p-3">
                            {/* Create Ticket Button */}
                            {(userRole === "admin" || userRole === "customer") && (
                                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                                    New Ticket
                                </button>
                            )}

                            {/* File Upload */}
                            {(userRole === "admin" || userRole === "customer") && (
                                <>
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        className="form-control w-auto"
                                        onChange={(e) => setFile(e.target.files[0])}
                                    />
                                    <button className="btn btn-primary" onClick={handleFileUpload}>
                                        Upload
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="me-3 mb-3 d-flex justify-content-end border-black rounded">
                            <input
                                type="text"
                                placeholder="Search tickets..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />

                        </div>

                        {successMessage && <div className="alert alert-success">{successMessage}</div>}
                        {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}

                        <div className="table-responsive">
                            <table className="table ms-2">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Ticket Number</th>
                                        <th>Title</th>
                                        <th>Description</th>
                                        <th>Support Agent</th>
                                        <th>Status</th>
                                        <th>Priority</th>
                                        {userRole === "admin" ? <th>Actions</th> :  <th></th> } 
                                    </tr>
                                </thead>
                                <tbody>
                                    {tickets.map((ticket,index) => (
                                        <tr key={index}>
                                            <td>{ticket.customer.name}</td>
                                            <td>{ticket.ticket_number}</td>
                                            <td>{ticket.title}</td>
                                            <td>{ticket.description}</td>
                                            <td>
                                                {editingTicket === ticket.ticket_number ? (
                                                    <select
                                                        value={ticket.assigned_to || ""}
                                                        onChange={(e) => handleEditAssignedUser(ticket.ticket_number, e.target.value)}
                                                    >
                                                        
                                                        {supportAgents.map((user,index) => (
                                                            <option key={index} value={user.id}>
                                                                {user.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : ticket.assigned_to ? (
                                                    <span>
                                                        {supportAgents.find(user => user.id === ticket.assigned_to)?.name || "Assigned"}

                                                    </span>
                                                ) : userRole === "admin" ? (
                                                    <select
                                                        onChange={(e) => handleAssignTicket(ticket.ticket_number, e.target.value)}
                                                        defaultValue=""
                                                    >
                                                        <option value="">Select Employee</option>
                                                        <option value="Unassigned">Unassigned</option>
                                                        {supportAgents.map((user,index) => (
                                                            <option key={index} value={user._id}>
                                                                {user.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span>Unassigned</span>
                                                )}
                                            </td>
                                           
                                            <td>
                                                {userRole === "admin" || userRole === "support agent" ? (
                                                    <select
                                                        value={ticket.status}
                                                        onChange={(e) => handleStatusChange(ticket.ticket_number, e.target.value)}
                                                    >
                                                        <option value="open">Open</option>
                                                        <option value="in progress">In Progress</option>
                                                        <option value="resolved">Resolved</option>
                                                        <option value="closed">Closed</option>
                                                    </select>
                                                ) : (
                                                    ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)
                                                )}
                                            </td>
                                         
                                            <td>
                                                <span
                                                    className={`badge ${ticket.priority === 'low' ? 'bg-success' :
                                                            ticket.priority === 'high' ? 'bg-warning text-dark' :
                                                                ticket.priority === 'critical' ? 'bg-danger' : 'bg-primary'
                                                        }`}
                                                >
                                                    {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                                                </span>
                                            </td>
                                            {/* Actions Column (Only for Admin) */}
                                            {userRole === "admin" && (
                                                <td>
                                                    <span onClick={() => setEditingTicket(ticket.ticket_number)}
                                                        style={{ cursor: "pointer", marginRight: '10px' }} >
                                                    <i
                                                        className="bi bi-pencil-square ms-2"
                                                        style={{ marginRight: '5px'}}                                                        
                                                    ></i>
                                                    Edit
                                                    </span>
                                                    <span onClick={() => handleDelete(ticket.id)} 
                                                    style={{ cursor: "pointer", marginRight: '10px' }} >
                                                    <i
                                                        className="bi bi-trash ms-2"
                                                        style={{  marginRight: '5px' }}                                                        
                                                    ></i>
                                                    Delete
                                                    </span>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="d-flex justify-content-between align-items-center mt-3">
                            <button
                                className="btn btn-primary ms-1 mb-1"
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                Prev
                            </button>

                            <span>Page {currentPage}</span>

                            <button
                                className="btn btn-primary me-1 mb-1"
                                onClick={() => setCurrentPage((prev) => prev + 1)}
                            >
                                Next
                            </button>
                        </div>

                        {/* Modal for creating a ticket */}
                        {showModal && (
                            <div className="modal d-block" tabIndex="-1">
                                <div className="modal-dialog">
                                    <div className="modal-content">
                                        <div className="modal-header">
                                            <h5 className="modal-title">New Ticket</h5>
                                            <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
                                        </div>
                                        <div className="modal-body">
                                            <form>
                                                <div className="mb-3">
                                                    <label className="form-label">Title</label>
                                                    <input
                                                        type="text"
                                                        name="title"
                                                        className="form-control"
                                                        value={ticketData.title}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="mb-3">
                                                    <label className="form-label">Description</label>
                                                    <textarea
                                                        name="description"
                                                        className="form-control"
                                                        rows="3"
                                                        value={ticketData.description}
                                                        onChange={handleChange}
                                                        required
                                                    ></textarea>
                                                </div>

                                                <div className="mb-3">
                                                    <label className="form-label">Priority</label>
                                                    <select
                                                        name="priority"
                                                        className="form-select"
                                                        value={ticketData.priority}
                                                        onChange={handleChange}
                                                    >
                                                        <option value="low">Low</option>
                                                        <option value="medium">Medium</option>
                                                        <option value="high">High</option>
                                                        <option value="critical">Critical</option>
                                                    </select>
                                                </div>
                                            </form>
                                        </div>
                                        <div className="modal-footer">
                                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                                Cancel
                                            </button>
                                            <button type="button" className="btn btn-primary" onClick={handleCreateTicket}>
                                                New Ticket
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
};

export default TicketManagement;
