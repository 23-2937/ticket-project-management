
import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import io from "socket.io-client";
import axios from "axios";
import Nav from "react-bootstrap/Nav";
import Offcanvas from "react-bootstrap/esm/Offcanvas";
import "bootstrap-icons/font/bootstrap-icons.css";
import Button from "react-bootstrap/Button";
import logo from "./logo.png";

const socket = io(`${process.env.REACT_APP_BASE_URL}`);

function Chat() {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [isTyping, setTyping] = useState(false);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [supportAgents, setSupportAgents] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [showOffcanvas, setShowOffcanvas] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState({});
    const [activeChats, setActiveChats] = useState([]);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const handleClose = () => setShowOffcanvas(false);
    const handleShow = () => setShowOffcanvas(true);
    const messagesEndRef = useRef(null);
    const userName = localStorage.getItem("userName");
    const userId = localStorage.getItem("userId");
    const userRole = localStorage.getItem("userRole");

    useEffect(() => {
        if (!userId) return;
        socket.emit("user_connected", userId);
        socket.emit("load_messages", { senderId: userId });
        const handlePreviousMessages = (data) => {
            setMessages(data);
        };

        const handleNewMessage = (message) => {
            const normalizedMessage = {
                ...message,
                receiver_id: message.receiver_id || message.receiverId,
                sender_id: message.sender_id || message.senderId,
            };
            setMessages(prev => {
                if (prev.some(msg => msg.id === normalizedMessage.id)) return prev; // Prevent duplicates
                return [...prev, normalizedMessage];
            });
            if (String(normalizedMessage.receiver_id) === String(userId)) {
                setActiveChats((prev) => {
                    if (!prev.some(chat => chat.id === normalizedMessage.sender_id)) {
                        return [...prev, { id: normalizedMessage.sender_id, name: normalizedMessage.sender_name || normalizedMessage.senderName }];
                    }
                    return prev;
                });

                setUnreadMessages((prev) => ({
                    ...prev,
                    [normalizedMessage.sender_id]: (prev[normalizedMessage.sender_id] || 0) + 1,
                }));
            }
        };

        const handleTypingEvent = () => {
            setTyping(true);
            setTimeout(() => setTyping(false), 2000);
        };
        socket.on("previous_messages", handlePreviousMessages);
        socket.on("receive_message", handleNewMessage);  // ✅ FIX: Attach outside
        socket.on("typing", handleTypingEvent);

        return () => {
            socket.off("previous_messages", handlePreviousMessages);
            socket.off("receive_message", handleNewMessage);
            socket.off("typing", handleTypingEvent);
            socket.emit("user_disconnected", userId);
        };
    }, [userId, activeChats]);

    useEffect(() => {

    }, [messages]);

    useEffect(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }, [messages]);

    const fetchSupportAgents = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/registration/agents`);
            setSupportAgents(response.data);
        } catch (error) {
            console.error("Error fetching support agents:", error);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/registration/customers`);
            setCustomers(response.data);
        } catch (error) {
            console.error("Error fetching customers:", error);
        }
    };

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();

        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: 'true' });
        const dayName = date.toLocaleDateString(undefined, { weekday: 'long' });

        if (date.toDateString() === now.toDateString()) {
            return `${timeString}`;
        }
        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return `Yesterday, ${timeString}`;
        }
        return `${dayName}, ${timeString}`;
    };

    useEffect(() => {
        fetchSupportAgents();
        fetchCustomers();
    }, []);

    useEffect(() => {
        socket.on("online_users", (users) => {
            setOnlineUsers(users);
        });
        return () => {
            socket.off("online_users");
        };
    }, []);

    const sendMessage = () => {
        if (!userId || !newMessage.trim() || !selectedAgent) return;

        const messageData = {
            senderId: userId,
            receiverId: selectedAgent.id,
            message: newMessage.trim(),
            timestamp: new Date().toISOString(),

        };

        socket.emit("send_message", messageData, (response) => {
            if (response.status === "ok") {

            }
        });
        setMessages((prev) => [...prev, { sender: userId, messageData }]);
        setNewMessage("");
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && newMessage.trim()) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleUserClick = (user) => {
        setSelectedAgent(user);
        setIsChatOpen(true);
        setUnreadMessages((prev) => ({
            ...prev,
            [user.id]: 0,
        }));
        socket.emit("load_messages", { senderId: userId, receiverId: user.id });
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
                    <i className="bi bi-chat text-white me-2"></i> Chat
                </Nav.Link>
                <Nav.Link as={Link} to="/ticket" className="text-white mb-4">
                    <i className="bi bi-ticket text-white me-2"></i> Ticket
                </Nav.Link>
                {userRole === 'admin' && (
                    <Nav.Link as={Link} to="/user" className="text-light mb-4 d-flex align-items-center">
                        <i className="bi bi-folder-fill me-2"></i>
                        <span className="d-none d-sm-inline">User Management</span>
                    </Nav.Link>
                )}
                <Nav.Link as={Link} to="/password" className="text-white mb-4">
                    <i className="bi bi-key-fill text-white me-2"></i> Change Password
                </Nav.Link>
                <Nav.Link as={Link} to="/logout" className="text-white mb-4">
                    <i className="bi bi-arrow-left text-white me-2"></i> Log Out
                </Nav.Link>
                <Nav.Link as={Link} to="/profile" className="text-white mb-4">
                    <i className="bi bi-person text-white me-2"></i> Profile
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
            <div className="flex-grow-1" style={{ backgroundColor: '#f2f7fb', position: 'relative', overflowY: 'auto' }}>
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
                        <h6 className="mb-0 text-uppercase" style={{ fontSize: '15px', marginRight: '25px' }}>
                            {userName}
                        </h6>
                    </div>
                </div>
                {/* Chat Section */}
                <div className="mt-4 ms-1 me-1 bg-light border border-black rounded shadow d-flex flex-column" style={{ paddingTop: '55px' }}>
                    <h4 className="text-dark p-1 rounded shadow w-100" style={{ backgroundColor: '#87A419' }}>
                        Chat Management
                    </h4>

                    <div className="d-flex flex-grow-1" style={{ height: "85vh" }}>

                        {/* User List (Initially visible) */}
                        {!isChatOpen && (
                            <div className="p-3 border-end bg-white w-100 w-md-25" style={{ maxWidth: "350px", overflowY: "auto" }}>
                                <h5 className="text-dark mb-3">
                                    {userRole === "customer" ? "Support Agents" : "Active Chats"}
                                </h5>
                                <ul className="list-unstyled mb-0">
                                    {userRole === "customer"
                                        ? supportAgents.map((agent) => (
                                            <li key={agent.id}
                                                className="p-2 border-bottom text-dark"
                                                onClick={() => handleUserClick(agent)}
                                                style={{ cursor: "pointer" }}>
                                                {agent.name}
                                                {unreadMessages[String(agent.id)] && unreadMessages[String(agent.id)] > 0 && (
                                                    <span className="badge bg-danger ms-4">
                                                        {unreadMessages[String(agent.id)]}
                                                    </span>
                                                )}

                                            </li>
                                        ))
                                        : customers.length > 0
                                            ? customers.map((customer) => (
                                                <li key={customer.id}
                                                    className="p-2 border-bottom text-dark"
                                                    onClick={() => handleUserClick(customer)}
                                                    style={{ cursor: "pointer" }}>
                                                    {customer.name}
                                                    {unreadMessages[String(customer.id)] && unreadMessages[String(customer.id)] > 0 && (
                                                        <span className="badge bg-danger ms-4">
                                                            {unreadMessages[String(customer.id)]}
                                                        </span>
                                                    )}

                                                </li>
                                            ))
                                            : <p className="text-muted">No active customers</p>}
                                </ul>
                            </div>
                        )}

                        {/* Chat Box (Visible after selecting a user) */}
                        {isChatOpen && (
                            <div className="d-flex flex-column flex-grow-1 p-3">
                                {/* Back button to go to list */}
                                <button className="btn btn-secondary mb-2" onClick={() => setIsChatOpen(false)}>
                                    ← Back to List
                                </button>

                                {selectedAgent && (
                                    <div className="border-bottom pb-2 mb-2 text-left bg-light p-2 rounded">
                                        <h5 className="mb-0 text-primary">{selectedAgent.name}</h5>
                                        <small className={onlineUsers.includes(selectedAgent.id.toString()) ? "text-success" : "text-muted"}>
                                            {onlineUsers.includes(selectedAgent.id.toString()) ? "Online" : "Offline"}
                                        </small>
                                    </div>
                                )}

                                <div className="chat-box border rounded shadow-sm p-3 bg-white flex-grow-1 d-flex flex-column" style={{ overflowY: "auto" }}>
                                    {messages.length > 0 ? (
                                        messages
                                            .filter(msg =>
                                                (String(msg.sender_id) === String(userId) && String(msg.receiver_id) === String(selectedAgent?.id || msg.receiver_id)) ||
                                                (String(msg.sender_id) === String(selectedAgent?.id || msg.sender_id) && String(msg.receiver_id) === String(userId))
                                            )
                                            .map((msg, index) => (
                                                <div key={index} className={`d-flex mb-2 ${String(msg.sender_id) === String(userId) ? "justify-content-end" : "justify-content-start"}`}>
                                                    <div className={`p-2 rounded shadow-sm ${String(msg.sender_id) === String(userId) ? "bg-primary text-white" : "bg-light text-dark"}`}
                                                        style={{ maxWidth: "75%" }}>
                                                        {msg.message}
                                                        <small className="d-block text-muted"
                                                            style={{ fontSize: '10px', textAlign: "right", color: String(msg.sender_id) === String(userId) ? "white" : "black" }}>
                                                            {msg.timestamp ? formatTimestamp(msg.timestamp) : "Just now"}
                                                        </small>
                                                    </div>
                                                </div>
                                            ))
                                    ) : (
                                        <p className="text-muted text-center mt-5">No messages yet.</p>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {isTyping && selectedAgent && <p className="text-muted small ms-3">Typing...</p>}

                                <div className="mt-3 d-flex align-items-center">
                                    <input type="text" className="form-control me-2"
                                        value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={handleKeyPress} placeholder="Type a message..."
                                        disabled={!selectedAgent} />
                                    <Button variant="primary" onClick={sendMessage} disabled={!newMessage.trim() || !selectedAgent}>
                                        <i className="bi bi-send"></i>
                                    </Button>
                                </div>
                            </div>

                        )}
                    </div>
                </div>

            </div>
        </div>
    );

};

export default Chat;
