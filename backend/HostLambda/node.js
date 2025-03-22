const AWS = require("aws-sdk");
const sns = new AWS.SNS({ region: "us-east-1" });

async function createEmployee(employeeData) {
    // Create employee in DB (assuming Mongoose)
    const employee = await Employee.create(employeeData);

    // Publish SNS message
    const params = {
        Message: JSON.stringify({ event: "EmployeeCreated", data: employee }),
        TopicArn: process.env.SNS_TOPIC_ARN,
    };

    try {
        const result = await sns.publish(params).promise();
        console.log("SNS Message Sent:", result);
    } catch (error) {
        console.error("Error Publishing to SNS:", error);
    }

    return employee;
}
