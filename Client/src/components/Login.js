import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/context";
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

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    const requestId = uuidv4();
    const message = {
      requestId: requestId,
      graphqlQuery: `
        mutation Mutation($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            id
            name
            email
            role
            token
          }
        }
      `.replace(/\s+/g, " "),
      variables: {
        email: email,
        password: password,
      },
    };
    const formattedMessage = JSON.stringify(message);
    try {
      console.log("Publishing login request to SNS:", formattedMessage);

      await sns.publish({
        TopicArn: SNS_TOPIC_ARN,
        Message: formattedMessage, // Ensure this is properly stringified
      }).promise();

      console.log("✅ Successfully published to SNS. Checking DynamoDB...");

      // Poll DynamoDB for response
      let retries = 10;
      let response = null;
      while (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const result = await docClient
          .get({ TableName: DYNAMO_TABLE, Key: { requestId } })
          .promise();

        if (result.Item) {
          response = result.Item.response;
          console.log("🚀 ~ handleLogin ~ response:", response.data.login.token)
          break;
        }
        retries--;
      }

      if (response?.data.login) {
        login(response.data.login);
        localStorage.setItem("token", response.data.login.token);
        localStorage.setItem("user", JSON.stringify(response.data.login));

        if (response.data.login.role === "Admin") {
          navigate("/admin");
        } else if (response.data.login.role === "HR") {
          navigate("/hr");
        } else {
          navigate("/employee");
        }
      } else {
        setError("Invalid credentials or request timed out");
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError("Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <form onSubmit={handleLogin} className="bg-gray-800 p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-4">Login</h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
        />
        <button type="submit" className="w-full p-2 bg-blue-500 rounded hover:bg-blue-600">
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;