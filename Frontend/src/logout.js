import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Logout = ({ socket, userId }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Notify the server if a user is online
        if (userId && socket) {
          socket.emit("user_disconnected", userId);
        }

        // Clear user session data
        localStorage.removeItem("userRole");
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userName");
        localStorage.removeItem("authToken");
        localStorage.removeItem("userId");

        // Redirect to login page
        navigate("/login");
      } catch (error) {
        console.error("Logout failed:", error);
      }
    };

    handleLogout();
  }, [navigate, socket, userId]);

  return null; // No UI needed, just logs out automatically
};

export default Logout;
