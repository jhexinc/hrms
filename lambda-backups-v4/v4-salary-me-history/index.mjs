import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = "v4-salary-slips";
const INDEX = "GSI_SalaryByEmployee";

export const handler = async (event) => {
  try {
    const claims =
      event.requestContext.authorizer?.claims ||
      event.requestContext.authorizer?.jwt?.claims;

    const employeeID = claims.sub;

    const qs = event.queryStringParameters || {};
    const fromMonth = qs.fromMonth; // optional YYYY-MM
    const toMonth = qs.toMonth;     // optional YYYY-MM

    let keyCondition = "EmployeeID = :eid";
    const values = { ":eid": employeeID };

    if (fromMonth && toMonth) {
      keyCondition += " AND #m BETWEEN :from AND :to";
      values[":from"] = fromMonth;
      values[":to"] = toMonth;
    }

    const result = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: INDEX,
        KeyConditionExpression: keyCondition,
        ExpressionAttributeNames: fromMonth ? { "#m": "Month" } : undefined,
        ExpressionAttributeValues: values,
        ScanIndexForward: false
      })
    );

    return response(200, result.Items || []);
  } catch (err) {
    console.error(err);
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
