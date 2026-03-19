import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({})
);

const TABLE = "v4-performance-bonus";

/* ===========================
   DEBUG RESPONSE HELPER
=========================== */
function response(statusCode, body) {
  const res = {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
    body: JSON.stringify(body),
  };

  console.log("RESPONSE OBJECT >>>", JSON.stringify(res, null, 2));
  return res;
}

/* ===========================
   HANDLER
=========================== */
export const handler = async (event) => {
  console.log("=== LAMBDA INVOKED ===");
  console.log("HTTP METHOD:", event.httpMethod);
  console.log("RAW EVENT >>>", JSON.stringify(event, null, 2));

  try {
    const month = event.queryStringParameters?.month;
    console.log("QUERY PARAMS >>>", event.queryStringParameters);

    if (!month) {
      console.log("MONTH MISSING");
      return response(400, { error: "month is required" });
    }

    const res = await ddb.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#m = :m",
        ExpressionAttributeNames: {
          "#m": "Month",
        },
        ExpressionAttributeValues: {
          ":m": month,
        },
      })
    );

    console.log(
      "DDB RESULT COUNT >>>",
      res.Items?.length || 0
    );

    return response(200, res.Items || []);
  } catch (err) {
    console.error("LAMBDA ERROR >>>", err);
    return response(500, { error: "Internal error" });
  }
};
