import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = "v4-salary-slips";
const INDEX = "GSI_SalaryByMonth";

export const handler = async (event) => {
  try {
    console.log("QUERY STRING:", event.queryStringParameters);

    /* ---------- AUTH ---------- */
    const claims = event.requestContext.authorizer?.claims || {};

  const rawGroups = claims["cognito:groups"];

  const roles = Array.isArray(rawGroups)
    ? rawGroups
    : typeof rawGroups === "string"
      ? [rawGroups]
      : [];

  if (!roles.includes("v4-admin") && !roles.includes("v4-hr")) {
    return response(403, { error: "Not authorized" });
  }

    /* ---------- INPUT ---------- */
    const month = event.queryStringParameters?.month;
    if (!month) {
      return response(400, { error: "month is required (YYYY-MM)" });
    }

    /* ---------- DDB QUERY ---------- */
    const params = {
      TableName: TABLE,
      IndexName: INDEX,
      KeyConditionExpression: "#m = :m",
      ExpressionAttributeNames: {
        "#m": "Month"
      },
      ExpressionAttributeValues: {
        ":m": month
      }
    };

    console.log("DDB QUERY INPUT:", JSON.stringify(params));

    const result = await ddb.send(new QueryCommand(params));

    return response(200, result.Items || []);
  } catch (err) {
    console.error("❌ DDB QUERY FAILED:", err);
    return response(500, { error: err.message });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*"
    },
    body: JSON.stringify(body)
  };
}
