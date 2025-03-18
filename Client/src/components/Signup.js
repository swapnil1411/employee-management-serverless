import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/context";
import AWS from "aws-sdk";

AWS.config.update({
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_KEY,
  region: "us-east-1",
});

const sns = new AWS.SNS();
const docClient = new AWS.DynamoDB.DocumentClient();
const SNS_TOPIC_ARN = "arn:aws:sns:us-east-1:879381256023:EmployeeSNS";
const DYNAMO_TABLE = "EmployeeResponses";

const Signup = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Employee"); // Default role
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    const requestId = crypto.randomUUID();
    const message = JSON.stringify({
      requestId,
      graphqlQuery: "mutation Mutation($name: String!, $email: String!, $password: String!) { register(name: $name, email: $email, password: $password) { id name email role token } }",
      variables: {
        name: username,
        email: email,
        password: password,
      },
    });

    try {
      // Publish message to SNS
      await sns
        .publish({
          TopicArn: SNS_TOPIC_ARN,
          Message: message,
        })
        .promise();

      console.log("Signup request sent to SNS:", message);

      // Wait for the response in DynamoDB
      let response;
      const params = {
        TableName: DYNAMO_TABLE,
        Key: { requestId },
      };

      const waitForResponse = async () => {
        for (let i = 0; i < 10; i++) {
          const data = await docClient.get(params).promise();
          if (data.Item) {
            response = data.Item;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 sec before retrying
        }
      };

      await waitForResponse();

      if (response?.data?.register) {
        login(response.data.register);

        switch (response.data.register.role) {
          case "Admin":
            navigate("/admin-dashboard");
            break;
          case "HR":
            navigate("/hr-dashboard");
            break;
          case "Employee":
            navigate("/employee-profile");
            break;
          default:
            navigate("/");
        }
      } else {
        alert("Signup failed. No response from server.");
      }
    } catch (error) {
      console.error("Signup error:", error);
      alert("Signup failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-4">Signup</h2>
        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Employee">Employee</option>
            <option value="HR">HR</option>
            <option value="Admin">Admin</option>
          </select>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold"
          >
            Signup
          </button>
        </form>
      </div>
    </div>
  );
};

export default Signup;
