import { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load user from localStorage if available
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", userData.token);

    // Redirect based on role
    switch (userData.role) {
      case "Admin":
        navigate("/admin");
        break;
      case "HR":
        navigate("/hr");
        break;
      case "Employee":
        navigate("/employee");
        break;
      default:
        navigate("/");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const getUserRole = () => user?.role || "Guest";

  return (
    <AuthContext.Provider value={{ user, login, logout, getUserRole }}>
      {children}
    </AuthContext.Provider>
  );
};
