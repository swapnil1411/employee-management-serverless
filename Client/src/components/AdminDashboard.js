import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

AWS.config.update({
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY,
  region: "us-east-1",
});

const sns = new AWS.SNS();
const docClient = new AWS.DynamoDB.DocumentClient();
const SNS_TOPIC_ARN = "arn:aws:sns:us-east-1:879381256023:EmployeeSNS";
const DYNAMO_TABLE = "EmployeeResponses";
const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [updatedUserRole, setUpdatedUserRole] = useState({
    userId: "",
    role: "Employee",
  });
  const [updatedPassword, setUpdatedPassword] = useState({
    userId: "",
    newPassword: "",
  });

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      getUsers(token);
    }
  }, [navigate]); // Added dependency

  // Fetch users from backend
  const getUsers = async (token) => {
    if (!token) {
      console.error("No token found! User must be logged in.");
      return;
    }
  
    const requestId = uuidv4(); // Generate a unique requestId
    const message = {
      requestId: requestId,
      graphqlQuery: `
        query {
          getUsers {
            id
            name
            email
            role
          }
        }
      `.replace(/\s+/g, " "), // Minify query
      authToken: token, // Include authentication token
    };
  
    try {
      console.log("Publishing getUsers request to SNS...");
      await sns.publish({
        TopicArn: SNS_TOPIC_ARN,
        Message: JSON.stringify({ default: JSON.stringify(message) }),
        MessageStructure: "json",
      }).promise();
  
      console.log("✅ Request sent. Checking DynamoDB for response...");
  
      let retries = 10;
      let response = null;
      while (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Poll every 2s
        const result = await docClient
          .get({ TableName: DYNAMO_TABLE, Key: { requestId } })
          .promise();
  
        if (result.Item) {
          response = result.Item.response;
          break;
        }
        retries--;
      }
  
      if (response?.data?.getUsers) {
        setUsers(response.data.getUsers);
        console.log("✅ Users data retrieved successfully!");
      } else {
        console.error("❌ Failed to fetch users or request timed out.");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };
  

  // Update user role mutation
  const handleUpdateUserRole = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
  
    if (!token) {
      console.error("No token found! User must be logged in.");
      return;
    }
  
    const requestId = uuidv4(); // Generate a unique requestId
    const message = {
      requestId: requestId,
      graphqlQuery: `
        mutation UpdateUserRole($userId: ID!, $role: String!) {
          updateUserRole(userId: $userId, role: $role) {
            id
            name
            email
            role
          }
        }
      `.replace(/\s+/g, " "), // Minify query
      variables: {
        userId: updatedUserRole.userId,
        role: updatedUserRole.role,
      },
      authToken: token, // Include authentication token
    };
  
    try {
      console.log("Publishing updateUserRole request to SNS...");
      await sns.publish({
        TopicArn: SNS_TOPIC_ARN,
        Message: JSON.stringify({ default: JSON.stringify(message) }),
        MessageStructure: "json",
      }).promise();
  
      console.log("✅ Request sent. Checking DynamoDB for response...");
  
      let retries = 10;
      let response = null;
      while (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Poll every 2s
        const result = await docClient
          .get({ TableName: DYNAMO_TABLE, Key: { requestId } })
          .promise();
  
        if (result.Item) {
          response = result.Item.response;
          break;
        }
        retries--;
      }
  
      if (response?.data?.updateUserRole) {
        alert("✅ User role updated successfully!");
        setUpdatedUserRole({ userId: "", role: "Employee" }); // Reset form
        getUsers(token); // Refresh user list
      } else {
        console.error("❌ Failed to update user role or request timed out.");
      }
    } catch (err) {
      console.error("Error updating user role:", err);
    }
  };
  

  // Update user password mutation
  const handleUpdateUserPassword = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
  
    if (!token) {
      console.error("No token found! User must be logged in.");
      return;
    }
  
    const requestId = uuidv4(); // Generate unique requestId
    const message = {
      requestId: requestId,
      graphqlQuery: `
        mutation UpdateUserPassword($userId: ID!, $newPassword: String!) {
          updateUserPassword(userId: $userId, newPassword: $newPassword) {
            id
            name
            email
          }
        }
      `.replace(/\s+/g, " "), // Minify query
      variables: {
        userId: updatedPassword.userId,
        newPassword: updatedPassword.newPassword,
      },
      authToken: token, // Include authentication token
    };
  
    try {
      console.log("🔄 Sending password update request to SNS...");
      await sns.publish({
        TopicArn: SNS_TOPIC_ARN,
        Message: JSON.stringify({ default: JSON.stringify(message) }),
        MessageStructure: "json",
      }).promise();
  
      console.log("✅ Request sent. Checking DynamoDB for response...");
  
      let retries = 10;
      let response = null;
      while (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Poll every 2s
        const result = await docClient
          .get({ TableName: DYNAMO_TABLE, Key: { requestId } })
          .promise();
  
        if (result.Item) {
          response = result.Item.response;
          break;
        }
        retries--;
      }
  
      if (response?.data?.updateUserPassword) {
        alert("✅ Password updated successfully!");
        setUpdatedPassword({ userId: "", newPassword: "" }); // Reset form
      } else {
        console.error("❌ Failed to update password or request timed out.");
      }
    } catch (err) {
      console.error("Error updating password:", err);
    }
  };
  

  return (
    <div className="container mx-auto mt-4 dark:bg-gray-700 dark:text-gray-100 p-6">
      <h2 className="text-center text-xl font-bold">Admin Dashboard</h2>

      <div className="flex justify-between items-center my-4">
        <button
          className="bg-red-500 text-white px-4 py-2 rounded"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
          }}
        >
          Logout
        </button>
      </div>

      {/* Update User Role Form */}
      <h3 className="mt-4 font-semibold">Update User Role</h3>
      <form onSubmit={handleUpdateUserRole} className="flex gap-2 mt-2">
        <input
          type="text"
          value={updatedUserRole.userId}
          onChange={(e) =>
            setUpdatedUserRole({ ...updatedUserRole, userId: e.target.value })
          }
          placeholder="User ID"
          required
          className="border p-2 rounded"
        />
        <select
          value={updatedUserRole.role}
          onChange={(e) =>
            setUpdatedUserRole({ ...updatedUserRole, role: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option value="Admin">Admin</option>
          <option value="HR">HR</option>
          <option value="Employee">Employee</option>
        </select>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Update Role
        </button>
      </form>

      {/* Update User Password Form */}
      <h3 className="mt-4 font-semibold">Update User Password</h3>
      <form onSubmit={handleUpdateUserPassword} className="flex gap-2 mt-2">
        <input
          type="text"
          value={updatedPassword.userId}
          onChange={(e) =>
            setUpdatedPassword({ ...updatedPassword, userId: e.target.value })
          }
          placeholder="User ID"
          required
          className="border p-2 rounded"
        />
        <input
          type="password"
          value={updatedPassword.newPassword}
          onChange={(e) =>
            setUpdatedPassword({ ...updatedPassword, newPassword: e.target.value })
          }
          placeholder="New Password"
          required
          className="border p-2 rounded"
        />
        <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">
          Update Password
        </button>
      </form>

      {/* Users List */}
      <div className="my-4">
        <h3 className="font-semibold">Users List</h3>
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded my-2 w-full"
        />
        <table className="w-full border-collapse border mt-2">
          <thead>
            <tr className="bg-gray-300">
              <th className="border p-2">Name</th>
              <th className="border p-2">Email</th>
              <th className="border p-2">Role</th>
            </tr>
          </thead>
          <tbody>
            {users
              .filter((user) =>
                user.name.toLowerCase().includes(search.toLowerCase()) ||
                user.email.toLowerCase().includes(search.toLowerCase())
              )
              .map((user) => (
                <tr key={user.id}>
                  <td className="border p-2">{user.name}</td>
                  <td className="border p-2">{user.email}</td>
                  <td className="border p-2">{user.role}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;
