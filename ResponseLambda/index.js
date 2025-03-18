const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = process.env.RESPONSE_TABLE;

exports.handler = async (event) => {
  console.log("📨 Received SNS Event:", JSON.stringify(event));

  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message);
    console.log("✅ Storing Response:", message);

    // Store response in DynamoDB
    await dynamoDB.put({
      TableName: TABLE_NAME,
      Item: {
        requestId: message.requestId,
        response: message.data,
        timestamp: Date.now(),
      },
    }).promise();
  }

  return { statusCode: 200, body: JSON.stringify({ message: "Response stored" }) };
};
