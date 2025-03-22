const AWS = require("aws-sdk");
const axios = require("axios");
const jwt = require("jsonwebtoken");

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || "https://c7xxp8lxfh.execute-api.us-east-1.amazonaws.com/EmployeeNotificationHandler";
const SECRET_KEY = process.env.JWT_SECRET || "your-secret-key";
const REQUEST_SNS = process.env.REQUEST_SNS || "arn:aws:sns:us-east-1:879381256023:EmployeeSNS";
const RESPONSE_SNS = process.env.RESPONSE_SNS || "arn:aws:sns:us-east-1:879381256023:EmployeeResponseSNS";

const sns = new AWS.SNS({ region: "us-east-1" });

const executeGraphQLRequest = async (graphqlQuery, variables, token = null) => {
    try {
        const headers = {
            "Content-Type": "application/json"
        };
        
        // Only add Authorization header if token is provided
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        
        const response = await axios.post(
            API_GATEWAY_URL,
            { query: graphqlQuery, variables },
            { headers }
        );
        return response.data;
    } catch (error) {
        console.error("❌ API Gateway Request Failed:", error.response?.data || error.message);
        throw new Error("API Gateway Request Failed");
    }
};

exports.handler = async (event) => {
    console.log("📨 Received SNS Event:", JSON.stringify(event));

    try {
        const record = event.Records[0].Sns;
        console.log("🚀 Received SNS Message:", record);
        
        const messageContent = JSON.parse(record.Message);
        const { graphqlQuery, variables, authToken, requestId, method } = messageContent;

        console.log("🚀 GraphQL Query:", graphqlQuery);
        console.log("🚀 Variables:", variables);
        
        if (authToken) {
            console.log("🚀 Auth Token:", authToken);
        }

        if (!graphqlQuery) {
            throw new Error("Missing GraphQL query");
        }
        
        // Check if operation is login or signup
        const isAuthOperation = graphqlQuery.includes('login(') || graphqlQuery.includes('signup(');
        console.log("🚀 ~ exports.handler= ~ isAuthOperation:", isAuthOperation)
        
        // For login/signup, don't require token; for other operations, require token
        if (!isAuthOperation && !authToken) {
            throw new Error("Authentication token required for this operation");
        }
        
        // Execute the GraphQL request with or without token as appropriate
        const response = await executeGraphQLRequest(graphqlQuery, variables, authToken);

        console.log("✅ GraphQL Response:", response);

        console.log("📤 Publishing response to EmployeeResponseSNS...");
        const snsResponse = await sns.publish({
            TopicArn: RESPONSE_SNS,
            Message: JSON.stringify({ requestId, data: response }),
        }).promise();
        console.log("✅ SNS Publish Success! MessageId:", snsResponse.MessageId);
        return { statusCode: 200, body: JSON.stringify(response) };
    } catch (error) {
        console.error("❌ Error processing request:", error.message);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};