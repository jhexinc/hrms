import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = "v4-performance-bonus";

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

export const handler = async (event) => {
  const claims =
    event.requestContext.authorizer?.claims ||
    event.requestContext.authorizer?.jwt?.claims;

  const employeeID = claims.sub;

  const qs = event.queryStringParameters || {};
  const fromMonth = qs.fromMonth;
  const toMonth = qs.toMonth;

  let filter = "EmployeeID = :e";
  const values = { ":e": employeeID };

  if (fromMonth && toMonth) {
    filter += " AND #m BETWEEN :f AND :t";
    values[":f"] = fromMonth;
    values[":t"] = toMonth;
  }

  const res = await ddb.send(
    new ScanCommand({
      TableName: TABLE,
      FilterExpression: filter,
      ExpressionAttributeNames: {
        "#m": "Month"
      },
      ExpressionAttributeValues: values
    })
  );

  return response(200, res.Items || []);
};
