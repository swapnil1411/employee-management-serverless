import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

// AWS Configuration
AWS.config.update({
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY,
  region: "us-east-1",
});

const sns = new AWS.SNS();
const docClient = new AWS.DynamoDB.DocumentClient();
const SNS_TOPIC_ARN = "arn:aws:sns:us-east-1:879381256023:EmployeeSNS";
const DYNAMO_TABLE = "EmployeeResponses";

const HRDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [newEmployee, setNewEmployee] = useState({
    email: "",
    password: "",
    FirstName: "",
    LastName: "",
    Age: "",
    Department: "",
    Title: "",
    EmployeeType: "",
    DateOfJoining: "",
  });

  const [editEmployee, setEditEmployee] = useState(null);
  const handleEditClick = (employee) => {
    setEditEmployee({ ...employee }); // Set employee data in edit state
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found! User must be logged in.");
      return;
    }
  
    const requestId = uuidv4();
    const message = {
      requestId: requestId,
      graphqlQuery: `
        mutation UpdateEmployee(
          $id: ID!,
          $FirstName: String!,
          $LastName: String!,
          $Age: Int!,
          $Title: String!,
          $Department: String!,
          $EmployeeType: String!,
          $DateOfJoining: String!
        ) {
          updateEmployee(
            id: $id,
            FirstName: $FirstName,
            LastName: $LastName,
            Age: $Age,
            Title: $Title,
            Department: $Department,
            EmployeeType: $EmployeeType,
            DateOfJoining: $DateOfJoining
          ) {
            _id
            FirstName
            LastName
            Age
            Title
            Department
            EmployeeType
            DateOfJoining
          }
        }
      `.replace(/\s+/g, " "), // Minify query to remove spaces
      variables: {
        id: editEmployee._id,
        FirstName: editEmployee.FirstName,
        LastName: editEmployee.LastName,
        Age: parseInt(editEmployee.Age),
        Title: editEmployee.Title,
        Department: editEmployee.Department,
        EmployeeType: editEmployee.EmployeeType,
        DateOfJoining: editEmployee.DateOfJoining,
      },
      authToken: token, // Include authentication token
    };
  
    try {
      console.log("Publishing updateEmployee request to SNS...");
      await sns.publish({
        TopicArn: SNS_TOPIC_ARN,
        Message: JSON.stringify({ default: JSON.stringify(message) }),
        MessageStructure: "json",
      }).promise();
  
      console.log("✅ Request sent. Checking DynamoDB for response...");
  
      let retries = 10;
      let response = null;
      while (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const result = await docClient
          .get({ TableName: DYNAMO_TABLE, Key: { requestId } })
          .promise();
  
        if (result.Item) {
          response = result.Item.response;
          break;
        }
        retries--;
      }
  
      if (response?.data?.updateEmployee) {
        alert("Employee updated successfully!");
        setEditEmployee(null); // Clear edit state after update
        getEmployees(); // Refresh employee list
        console.log("✅ Employee updated successfully!");
      } else {
        console.error("❌ Failed to update employee or request timed out.");
      }
    } catch (err) {
      console.error("Error updating employee:", err);
    }
  };
  
  

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      getEmployees(token);
    }
  }, []);

  const handleDeleteEmployee = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found! User must be logged in.");
      return;
    }
  
    const requestId = uuidv4();
    const message = {
      requestId: requestId,
      graphqlQuery: `
        mutation DeleteEmployee($id: ID!) {
          deleteEmployee(id: $id)
        }
      `.replace(/\s+/g, " "), // Minify query
      variables: { id },
      authToken: token, // Include authentication token
    };
  
    try {
      console.log("Publishing deleteEmployee request to SNS...");
      await sns.publish({
        TopicArn: SNS_TOPIC_ARN,
        Message: JSON.stringify({ default: JSON.stringify(message) }),
        MessageStructure: "json",
      }).promise();
  
      console.log("✅ Request sent. Checking DynamoDB for response...");
  
      let retries = 10;
      let response = null;
      while (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const result = await docClient
          .get({ TableName: DYNAMO_TABLE, Key: { requestId } })
          .promise();
  
        if (result.Item) {
          response = result.Item.response;
          break;
        }
        retries--;
      }
  
      if (response?.data?.deleteEmployee) {
        alert("Employee deleted successfully!");
        setEmployees((prevEmployees) =>
          prevEmployees.filter((employee) => employee._id !== id)
        );
        console.log("✅ Employee deleted successfully!");
      } else {
        console.error("❌ Failed to delete employee or request timed out.");
      }
    } catch (err) {
      console.error("Error deleting employee:", err);
    }
  };
  
  
  

  const getEmployees = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found! User must be logged in.");
      return;
    }
  
    const requestId = uuidv4();
    const message = {
      requestId: requestId,
      graphqlQuery: `
        query getEmployees($limitValue: Int!, $offset: Int!) {
          getEmployees(limitValue: $limitValue, offset: $offset) {
            _id
            userId
            FirstName
            LastName
            Age
            Title
            Department
            EmployeeType
            DateOfJoining
          }
        }
      `.replace(/\s+/g, " "),
      variables: { limitValue: 10, offset: 0 },
      authToken: token, // Include the auth token
    };
  
    try {
      console.log("Publishing getEmployees request to SNS...");
      await sns.publish({
        TopicArn: SNS_TOPIC_ARN,
        Message: JSON.stringify({
          default: JSON.stringify(message),
        }),
        MessageStructure: "json",
      }).promise();
  
      console.log("✅ Request sent. Checking DynamoDB for response...");
  
      let retries = 10;
      let response = null;
      while (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const result = await docClient
          .get({ TableName: DYNAMO_TABLE, Key: { requestId } })
          .promise();
  
        if (result.Item) {
          response = result.Item.response;
          break;
        }
        retries--;
      }
  
      if (response?.data.getEmployees) {
        setEmployees(response.data.getEmployees);
        console.log("✅ Employees fetched successfully!");
      } else {
        console.error("❌ Failed to fetch employees or request timed out.");
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };
  

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found! User must be logged in.");
      return;
    }
  
    const requestId = uuidv4();
    const message = {
      requestId: requestId,
      graphqlQuery: `
        mutation CreateEmployee(
          $FirstName: String!, 
          $LastName: String!, 
          $Age: Int!, 
          $Title: String!, 
          $Department: String!, 
          $EmployeeType: String!,
          $DateOfJoining: String!,
          $email: String!,
          $password: String!
        ) {
          createEmployee(
            FirstName: $FirstName,
            LastName: $LastName,
            Age: $Age,
            Title: $Title,
            Department: $Department,
            EmployeeType: $EmployeeType,
            DateOfJoining: $DateOfJoining,
            email: $email,
            password: $password
          ) {
            userId
            FirstName
            LastName
          }
        }
      `.replace(/\s+/g, " "), // Minify query
      variables: {
        FirstName: newEmployee.FirstName,
        LastName: newEmployee.LastName,
        Age: parseInt(newEmployee.Age),
        Title: newEmployee.Title,
        Department: newEmployee.Department,
        EmployeeType: newEmployee.EmployeeType || "Full-Time",
        DateOfJoining: newEmployee.DateOfJoining,
        email: newEmployee.email,
        password: newEmployee.password,
      },
      authToken: token, // Include authentication token
    };
  
    try {
      console.log("Publishing createEmployee request to SNS...");
      await sns.publish({
        TopicArn: SNS_TOPIC_ARN,
        Message: JSON.stringify({ default: JSON.stringify(message) }),
        MessageStructure: "json",
      }).promise();
  
      console.log("✅ Request sent. Checking DynamoDB for response...");
  
      let retries = 10;
      let response = null;
      while (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const result = await docClient
          .get({ TableName: DYNAMO_TABLE, Key: { requestId } })
          .promise();
  
        if (result.Item) {
          response = result.Item.response;
          break;
        }
        retries--;
      }
  
      if (response?.data?.createEmployee) {
        alert("Employee created successfully!");
        setNewEmployee({
          email: "",
          password: "",
          FirstName: "",
          LastName: "",
          Age: "",
          Department: "",
          Title: "",
          EmployeeType: "",
          DateOfJoining: "",
        });
        getEmployees(token); // Refresh employee list
        console.log("✅ Employee created successfully!");
      } else {
        console.error("❌ Failed to create employee or request timed out.");
      }
    } catch (err) {
      console.error("Error creating employee:", err);
    }
  };
  

  return (
    <div className="container mx-auto mt-4 dark:bg-gray-700 dark:text-gray-100">
      <h2 className="text-center">HR Dashboard</h2>

      <div className="flex justify-between items-center my-4">
        <button
          className="btn btn-danger my-4"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
          }}
        >
          Logout
        </button>
      </div>

      <h3>Create New Employee</h3>
      <form onSubmit={handleCreateEmployee}>
        <input
          type="email"
          value={newEmployee.email}
          onChange={(e) =>
            setNewEmployee({ ...newEmployee, email: e.target.value })
          }
          placeholder="Email"
          required
          className="p-2 bg-gray-800 text-white"
        />
        <input
          type="password"
          value={newEmployee.password}
          onChange={(e) =>
            setNewEmployee({ ...newEmployee, password: e.target.value })
          }
          placeholder="Password"
          required
          className="p-2 bg-gray-800 text-white"
        />
        <input
          type="text"
          value={newEmployee.FirstName}
          onChange={(e) =>
            setNewEmployee({ ...newEmployee, FirstName: e.target.value })
          }
          placeholder="First Name"
          required
          className="p-2 bg-gray-800 text-white"
        />
        <input
          type="text"
          value={newEmployee.LastName}
          onChange={(e) =>
            setNewEmployee({ ...newEmployee, LastName: e.target.value })
          }
          placeholder="Last Name"
          required
          className="p-2 bg-gray-800 text-white"
        />
        <input
          type="number"
          value={newEmployee.Age}
          onChange={(e) =>
            setNewEmployee({ ...newEmployee, Age: e.target.value })
          }
          placeholder="Age"
          required
          className="p-2 bg-gray-800 text-white"
        />
        <input
          type="text"
          value={newEmployee.Department}
          onChange={(e) =>
            setNewEmployee({ ...newEmployee, Department: e.target.value })
          }
          placeholder="Department"
          required
          className="p-2 bg-gray-800 text-white"
        />
        <input
          type="text"
          value={newEmployee.Title}
          onChange={(e) =>
            setNewEmployee({ ...newEmployee, Title: e.target.value })
          }
          placeholder="Title"
          required
          className="p-2 bg-gray-800 text-white"
        />
        <select
          value={newEmployee.EmployeeType}
          onChange={(e) =>
            setNewEmployee({ ...newEmployee, EmployeeType: e.target.value })
          }
          className="p-2 bg-gray-800 text-white"
        >
          <option value="Full-Time">Full-Time</option>
          <option value="Part-Time">Part-Time</option>
          <option value="Contractor">Contractor</option>
        </select>

        
        <input
          type="date"
          value={newEmployee.DateOfJoining}
          onChange={(e) =>
            setNewEmployee({ ...newEmployee, DateOfJoining: e.target.value })
          }
          required
          className="p-2 bg-gray-800 text-white"
        />
        <button type="submit" className="btn btn-primary mt-4">
          Create Employee
        </button>
      </form>

      <div className="my-4">
        <h3>Employees List</h3>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th>Name</th>
            
              <th>Department</th>
              <th>Title</th>
              <th>Employee Type</th>
            </tr>
          </thead>
          <tbody>
          {employees.map((employee) => (
            <tr key={employee._id}>
              <td>{employee.FirstName} {employee.LastName}</td>
              <td>{employee.Department}</td>
              <td>{employee.Title}</td>
              <td>{employee.EmployeeType}</td>
              <td>
                <button className="btn btn-warning" onClick={() => handleEditClick(employee)}>
                  Edit
                </button>
                <button className="btn btn-danger" onClick={() => handleDeleteEmployee(employee._id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
          
        </tbody>
        
        </table>
        {editEmployee && (
          <div className="edit-form">
            <h3>Edit Employee</h3>
            <form onSubmit={handleUpdateEmployee}>
              <input
                type="text"
                value={editEmployee.FirstName}
                onChange={(e) => setEditEmployee({ ...editEmployee, FirstName: e.target.value })}
                required
              />
              <input
                type="text"
                value={editEmployee.LastName}
                onChange={(e) => setEditEmployee({ ...editEmployee, LastName: e.target.value })}
                required
              />
              <input
                type="number"
                value={editEmployee.Age}
                onChange={(e) => setEditEmployee({ ...editEmployee, Age: e.target.value })}
                required
              />
              <input
                type="text"
                value={editEmployee.Department}
                onChange={(e) => setEditEmployee({ ...editEmployee, Department: e.target.value })}
                required
              />
              <input
                type="text"
                value={editEmployee.Title}
                onChange={(e) => setEditEmployee({ ...editEmployee, Title: e.target.value })}
                required
              />
              <select
                value={editEmployee.EmployeeType}
                onChange={(e) => setEditEmployee({ ...editEmployee, EmployeeType: e.target.value })}
              >
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Intern">Intern</option>
              </select>
              <input
                type="date"
                value={editEmployee.DateOfJoining}
                onChange={(e) => setEditEmployee({ ...editEmployee, DateOfJoining: e.target.value })}
                required
              />
              <button type="submit" className="btn btn-primary">Update Employee</button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditEmployee(null)}>
                Cancel
              </button>
            </form>
          </div>
        )}
        
      </div>
    </div>
  );
};

export default HRDashboard;
