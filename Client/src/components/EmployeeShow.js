import { useEffect, useState } from "react";
import moment from "moment";
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
const EmployeeShow = () => {
  const [employee, setEmployee] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = JSON.parse(localStorage.getItem("user")).id;
    

    if (!token) {
      navigate("/login");
    } else {
      getEmployee(token, userId);
    }
  }, []);

  const dateConversion = (timeStamp) => {
    return moment(parseInt(timeStamp)).format("YYYY-MM-DD");
  };

  const getEmployee = async (token, userId) => {
    if (!token) {
      console.error("No token found! User must be logged in.");
      return;
    }
  
    const requestId = uuidv4(); // Generate a unique requestId
    const message = {
      requestId: requestId,
      graphqlQuery: `
        query GetEmployee($id: ID!) {
          getEmployee(id: $id) {
            _id
            FirstName
            LastName
            Age
            DateOfJoining
            Title
            Department
            EmployeeType
          }
        }
      `.replace(/\s+/g, " "), // Minify query
      variables: { id: userId },
      authToken: token, // Include authentication token
    };
  
    try {
      console.log("Publishing getEmployee request to SNS...");
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
  
      if (response?.data?.getEmployee) {
        setEmployee(response.data.getEmployee);
        console.log("✅ Employee data retrieved successfully!");
      } else {
        console.error("❌ Failed to fetch employee or request timed out.");
      }
    } catch (err) {
      console.error("Error fetching employee details:", err);
    }
  };
  

  return (
    <div className="container mx-auto mt-4 dark:bg-gray-700 dark:text-gray-100">
      <h2 className="text-center">Your Employee Details</h2>
      <div className="flex justify-end">
        <button
          className="btn btn-danger my-4"
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            localStorage.removeItem("user");
            localStorage.removeItem("userId");
            navigate("/login");
          }}
        >
          Logout
        </button>
      </div>
      {employee ? (
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg my-2 border-2 dark:border-gray-600">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <tbody>
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">First Name</td>
                <td className="px-6">{employee.FirstName}</td>
              </tr>
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">Last Name</td>
                <td className="px-6">{employee.LastName}</td>
              </tr>
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">Age</td>
                <td className="px-6">{employee.Age}</td>
              </tr>
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">Date of Joining</td>
                <td className="px-6">{dateConversion(employee.DateOfJoining)}</td>
              </tr>
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">Title</td>
                <td className="px-6">{employee.Title}</td>
              </tr>
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">Department</td>
                <td className="px-6">{employee.Department}</td>
              </tr>
              <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">Employee Type</td>
                <td className="px-6">{employee.EmployeeType}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center">Loading employee details...</p>
      )}
    </div>
  );
};

export default EmployeeShow;
