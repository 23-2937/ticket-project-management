import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from './lociafrica_limited_cover.jpg';

function Register() {
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
  });

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false); // Loading state
  const [errors, setErrors] = useState({});

  const handleInput = (event) => {
    setValues((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    let validationErrors = {};

    if (!values.name.trim()) {
      validationErrors.name = "Name is required";
    }

    if (!values.email.trim()) {
      validationErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(values.email)) {
      validationErrors.email = "Enter a valid email";
    }

    if (!values.password.trim()) {
      validationErrors.password = "Password is required";
    } else if (values.password.length < 6) {
      validationErrors.password = "Password must be at least 6 characters";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${process.env.REACT_APP_BASE_URL}/register`, values);
      setLoading(false);
      navigate('/');
    } catch (err) {
      setLoading(false);
  
      if (err.response?.data?.error?.code === 'ER_DUP_ENTRY') {
        setErrors({ email: 'This email is already registered' });
      } else {
        setErrors({ general: 'An unexpected error occurred. Please try again.' });
      }
    }
  };
  

  return (
    <div className="d-flex justify-content-center align-items-center bg-primary vh-100">
      <div
        className="bg-white p-4 rounded shadow-sm w-100"
        style={{ maxWidth: '400px' }} // Limit the maximum width for better responsiveness
      >
        {/* Logo image */}
        <img
          src={logo}
          alt="Login Illustration"
          className="img-fluid mb-3"
          style={{ width: '80%', height: 'auto' }}
        />
        <h2 className="text-center">Register</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="name"><strong>Name</strong></label>
            <input
              type="text"
              placeholder="Enter name"
              name="name"
              onChange={handleInput}
              className="form-control rounded-0"
            />
            {errors.name && <span className="text-danger">{errors.name}</span>}
          </div>
          <div className="mb-3">
            <label htmlFor="email"><strong>Email</strong></label>
            <input
              type="email"
              placeholder="Enter Email"
              name="email"
              onChange={handleInput}
              className="form-control rounded-0"
            />
            {errors.email && <span className="text-danger">{errors.email}</span>}
          </div>
          <div className="mb-3">
            <label htmlFor="password"><strong>Password</strong></label>
            <input
              type="password"
              placeholder="Enter Password"
              name="password"
              onChange={handleInput}
              className="form-control rounded-0"
            />
            {errors.password && <span className="text-danger">{errors.password}</span>}
          </div>
          {errors.general && <p className="text-danger">{errors.general}</p>}

          {/* Show "Registering..." when loading is true */}
          <button type="submit" className="btn btn-success w-100 mb-2" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
          
        </form>
      </div>
    </div>
  );
}

export default Register;