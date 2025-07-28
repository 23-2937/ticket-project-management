
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Nav from 'react-bootstrap/Nav';
import 'bootstrap-icons/font/bootstrap-icons.css';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Button from 'react-bootstrap/Button';
import avatar from './avatar.jpg';
import logo from './logo.png';
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);
function Dashboard() {
  const [supportAgentCount, setSupportAgentCount] = useState(0);
  const [ticketCount, setTicketCount] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [resolvedPercentage, setResolvedPercentage] = useState(0);
  const [showOffcanvas, setShowOffcanvas] = useState(false);
  const [agents, setAgents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [ticketPriority, setTicketPriority] = useState({
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  });
  const [ticketStatus, setTicketStatus] = useState({
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0
  });

  const userName = localStorage.getItem('userName');
  const userRole = localStorage.getItem('userRole');


  useEffect(() => {
    fetchCounts(selectedMonth);
    fetchTicketStats();
    fetchTicketPriority();
    fetchTicketStatus();
    fetchAgents();
    fetchTickets();
  }, [selectedMonth]);

  const handleClose = () => setShowOffcanvas(false);
  const handleShow = () => setShowOffcanvas(true);

  //Ticket and agent count
  const fetchCounts = async (month) => {
    try {
      const [agentResponse, ticketResponse] = await Promise.all([
        axios.get(`${process.env.REACT_APP_BASE_URL}/agents/count`),
        axios.get(`${process.env.REACT_APP_BASE_URL}/tickets/count?month=${month}`)
      ]);
      setSupportAgentCount(agentResponse.data.count);
      setTicketCount(ticketResponse.data.count);

    } catch (err) {
      console.error('Error fetching counts:', err);
    }
  };

  useEffect(() => {
    setResolvedPercentage(totalCount > 0 ? Math.floor((resolvedCount / totalCount) * 100) : 0);
  }, [totalCount, resolvedCount]);


  //Resolved tickets percentage
  const fetchTicketStats = async () => {
    try {
      const {data} = await axios.get(`${process.env.REACT_APP_BASE_URL}/tickets/stats`);
      const totalCount = data.open + data.resolved + data.closed;
      setTotalCount(totalCount || 0);
      setResolvedCount(data.resolved);
    } catch (err) {
      console.error("Error fetching ticket stats:", err.message);
    }
  };

  // Tickets bar
  const fetchTicketPriority = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/tickets/priority`);

      if (response.status === 200) {
        const tickets = response.data;
        const priorityCount = {
          critical: parseInt(tickets.critical, 10) || 0,
          high: parseInt(tickets.high, 10) || 0,
          medium: parseInt(tickets.medium, 10) || 0,
          low: parseInt(tickets.low, 10) || 0
        };

        const totalTickets = Object.values(priorityCount).reduce((sum, count) => sum + count, 0);
        const ticketPriorityPercentages = {
          critical: totalTickets > 0 ? Math.round((priorityCount.critical / totalTickets) * 100) : 0,
          high: totalTickets > 0 ? Math.round((priorityCount.high / totalTickets) * 100) : 0,
          medium: totalTickets > 0 ? Math.round((priorityCount.medium / totalTickets) * 100) : 0,
          low: totalTickets > 0 ? Math.round((priorityCount.low / totalTickets) * 100) : 0
        };
        setTicketPriority(ticketPriorityPercentages);
      } else {
        console.warn("Unexpected response status:", response.status);
      }
    } catch (err) {
      console.error("Error fetching ticket priority:", err.response?.data || err.message);
    }
  };

  const fetchTicketStatus = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/tickets/status`);
      setTicketStatus(response.data);
    } catch (err) {
      console.error("Error fetching ticket stats:", err.message);
    }
  };


  const fetchAgents = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/registration/top/agents`);
      setAgents(response.data);
    } catch (err) {
      console.error("Error fetching agents:", err.message);
    }
  };


  const fetchTickets = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BASE_URL}/tickets/list`);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setTickets(data.latestTickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
    }
  }; // No dependencies needed

  const filteredTickets = selectedDate
    ? tickets.filter(ticket => {
      const ticketDate = new Date(ticket.created_at).toISOString().split("T")[0];
      return ticketDate === selectedDate;
    })
    : tickets;

  const chartData = {
    datasets: [
      {
        data: [
          ticketStatus.open,
          ticketStatus.inProgress,
          ticketStatus.resolved,
          ticketStatus.closed,
        ],
        backgroundColor: ["#28a745", "#6f42c1", "#ffc107", "#dc3545"],
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  return (
    <div className="d-flex" style={{ height: '100vh', overflow: 'hidden' }}>

      {/* Left Navigation */}
      <Nav className="flex-column text-white p-4 d-none d-md-block"
        style={{ backgroundColor: '#1d2531', width: '21vw', height: '100%', overflowY: 'auto' }}>
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
        <Nav.Link as={Link} to="/user" className="text-white mb-4">
          <i className="bi bi-folder-fill text-white me-2"></i>
          <span className="d-none d-sm-inline">User Management</span>
        </Nav.Link>
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

      {/* Offcanvas component for small screens */}
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
      {/* Main content area */}
      <div className="flex-grow-1" style={{ backgroundColor: '#f2f7fb', position: 'relative', overflowY: 'auto' }}>
        {/* Top bar */}
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
        {/* Dashboard header */}
        <div className="d-flex w-100 mt-4" style={{ paddingTop: '55px' }}>
          <div className="w-100" style={{ backgroundColor: '#87A419', padding: '6px', fontSize: '15px', borderRadius: '0.5rem' }}>
            Dashboard
          </div>
        </div>

        {/* Stats cards */}
        <div className="container mt-4 ms-15 me-15 ">
          <div className="row g-3">

            {/* Total Tickets Card */}
            <div className="col-md-3">
              <div className="border rounded p-3 bg-white h-100 d-flex flex-column justify-content-between position-relative" style={{ color: 'black' }}>
                <div className="position-absolute" style={{ top: "10px", right: "10px" }}>
                  <select className="form-select form-select-sm" style={{ fontSize: "12px" }} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                    <option value="">This month</option>
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, index) => (
                      <option key={index} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>
                <p className="mb-1 fw-bold" style={{ fontSize: "14px", color: 'black' }}>Total Tickets</p>
                <p className="text-muted" style={{ fontSize: "12px" }}>Total count of all active support tickets</p>
                <h2 className="fw-bold">{ticketCount}</h2>
              </div>
            </div>

            {/* Number of Agents Card */}
            <div className="col-md-3">
              <div className="border rounded p-3 bg-white h-100 d-flex flex-column justify-content-between">
                <p className="mb-1 fw-bold" style={{ fontSize: "14px" }}>Number of Agents</p>
                <p className="text-muted" style={{ fontSize: "12px" }}>Total count of all active support agents</p>
                <h4 className="fw-bold">{supportAgentCount}</h4>
              </div>
            </div>

            {/* Resolution Rate */}
            <div className="col-md-3">
              <div className="border rounded p-3 bg-white h-100 d-flex flex-column justify-content-between">
                <p className="mb-1 fw-bold" style={{ fontSize: "14px" }}>Resolution Rate</p>
                <p className="text-muted" style={{ fontSize: "12px" }}>Percentage of tickets resolved out of the total received in the last month.</p>
                <h5 className="fw-bold">{resolvedPercentage}% Resolved</h5>
              </div>
            </div>

            {/* Ticket Priority */}
            <div className="col-md-3">
              <div className="border rounded p-3 bg-white h-100 d-flex flex-column">
                <p className="mb-1 fw-bold" style={{ fontSize: "14px" }}>Ticket Priority</p>
                {["High", "Medium", "Low"].map((level) => (
                  <div key={level} className="mt-2">
                    <div className="d-flex justify-content-between" style={{ fontSize: "12px" }}>
                      <span>{level}</span>
                      <span>{ticketPriority[level.toLowerCase()]}%</span>
                    </div>
                    <div className="progress" style={{ height: "6px" }}>
                      <div
                        className={`h - 2.5 rounded - full transition - all duration - 300 ease -in -out ${level === "Critical"
                          ? "bg-danger"
                          : level === "High"
                            ? "bg-warning"
                            : level === "Medium"
                              ? "bg-info"
                              : "bg-success"
                          }`}

                        role="progressbar"
                        style={{ width: `${ticketPriority[level.toLowerCase()]}% ` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Ticket Status Card */}
        <div className="container mt-4">
          <div className="d-flex gap-3 flex-column flex-md-row flex-wrap mt-3 ms-2 me-2">

            {/* Ticket Status Summary */}
            <div className="col-12 col-md-6 col-lg-3 border rounded p-3 bg-white d-flex flex-column">
              <h6 className="fw-bold">Ticket Status Summary</h6>
              <p className="mb-2">Chart summarizing ticket status</p>

              <div className="d-flex align-items-center">
                <div style={{ width: "120px", height: "100px" }}>
                  <Pie data={chartData} options={chartOptions} />
                </div>
                <div className="ms-3">
                  {["Open", "In Progress", "Resolved", "Closed"].map((label, index) => (
                    <div key={index} className="d-flex align-items-center mb-1">
                      <span
                        style={{
                          width: "14px",
                          height: "14px",
                          backgroundColor: chartData.datasets[0].backgroundColor[index],
                          display: "inline-block",
                          borderRadius: "50%",
                          marginRight: "8px",
                        }}
                      ></span>
                      <span style={{ fontSize: "14px", color: "#333" }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 📌 Top Performing Agents Section */}
            <div className="col-12 col-md-6 col-lg-3 border rounded p-3 bg-white d-flex flex-column flex-grow-1 text-center align-items-center">
              <h6 className="fw-bold">Top Performing Agents</h6>
              <p className="text-gray-500 text-sm mb-2">Agent with the highest handled tasks</p>

              {/* Agents Row */}
              <div className="d-flex gap-3 flex-wrap justify-content-center">
                {agents.map((agent,index) => (
                  <div key={index} className="text-center border rounded p-2">
                    <div className="rounded-circle overflow-hidden mx-auto">
                      <img
                        src={avatar}
                        alt="Agent Avatar"
                        className="rounded-circle"
                        style={{ width: "50px", height: "50px", objectFit: "cover" }}
                      />
                    </div>
                    <h6 className="fw-semibold mt-2">{agent.name}</h6>
                    <span className="badge bg-primary text-white mt-1">{agent.solved_tickets} Tickets Handled</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>



        <div className="container mt-4 px-2">
          {/* Date Picker */}
          <div className="table-responsive ms-2 me-2">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">Tickets</h6>
              <div className="d-flex align-items-center">
                <label htmlFor="dateFilter" className="me-2">Filter by Date:</label>
                <input
                  type="date"
                  id="dateFilter"
                  className="form-control w-auto"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            </div>

            <table className="table table-striped table-hover">
              <thead className="table">
                <tr>
                  <th>Name</th>
                  <th>Ticket Number</th>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Support Agent</th>
                  <th>Status</th>
                  <th>Priority</th>

                </tr>
              </thead>
              <tbody>
                {filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket,index) => (
                    <tr key={index}>
                      <td>{ticket.customer.name}</td>
                      <td>{ticket.ticket_number}</td>
                      <td>{ticket.title}</td>
                      <td>{ticket.description}</td>
                      <td>{ticket.assigned_to || 'Unassigned'}</td>
                      <td>{ticket.status}</td>
                      <td>
                        <span
                          className={`badge ${ticket.priority === 'low'
                            ? 'bg-success'
                            : ticket.priority === 'high'
                              ? 'bg-warning text-dark'
                              : ticket.priority === 'critical'
                                ? 'bg-danger'
                                : 'bg-primary'
                            } `}
                        >
                          {ticket.priority === 'low'
                            ? 'Low'
                            : ticket.priority === 'high'
                              ? 'High'
                              : ticket.priority === 'critical'
                                ? 'Critical'
                                : 'Medium'}
                        </span>
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center">No tickets found for this date.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="container my-4">
          <div className="row">
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;