import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = "v4-other-deductions";

/* ===========================
   HELPERS
=========================== */

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

function isHR(event) {
  const claims =
    event.requestContext.authorizer?.claims ||
    event.requestContext.authorizer?.jwt?.claims;

  const groups = claims?.["cognito:groups"] || [];
  return groups.includes("v4-hr") || groups.includes("v4-admin");
}

/* ===========================
   VALIDATION HELPER
=========================== */

function validateInput(employeeID, month, deductions) {
  if (!employeeID || !month || !Array.isArray(deductions)) {
    return "employeeID, month, deductions[] required";
  }

  for (const d of deductions) {
    if (!d.type || d.amount === undefined) {
      return "Each deduction must have type and amount";
    }
  }

  return null;
}

/* ===========================
   HANDLER
=========================== */

export const handler = async (event) => {
  if (!isHR(event)) {
    return response(403, { error: "HR access only" });
  }

  /* ===========================
     GET
  =========================== */
  if (event.httpMethod === "GET") {
    const month = event.queryStringParameters?.month;

    if (!month) {
      return response(400, { error: "month is required" });
    }

    const res = await ddb.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#m = :m",
        ExpressionAttributeNames: {
          "#m": "Month"
        },
        ExpressionAttributeValues: {
          ":m": month
        }
      })
    );

    const items = (res.Items || []).map((i) => ({
      EmployeeID: i.EmployeeID,
      Month: i.Month,
      Deductions: i.Deductions || [],
      TotalDeduction: (i.Deductions || []).reduce(
        (sum, d) => sum + Number(d.amount || 0),
        0
      )
    }));

    return response(200, items);
  }

  /* ===========================
     POST & PUT (UPSERT)
  =========================== */
  if (event.httpMethod === "POST" || event.httpMethod === "PUT") {
    const body = JSON.parse(event.body || "{}");
    const { employeeID, month, deductions } = body;

    const validationError = validateInput(employeeID, month, deductions);
    if (validationError) {
      return response(400, { error: validationError });
    }

    const claims =
      event.requestContext.authorizer?.claims ||
      event.requestContext.authorizer?.jwt?.claims;

    const now = new Date().toISOString();
    const deductionId = `${employeeID}#${month}`;

    const item = {
      DeductionID: deductionId,
      EmployeeID: employeeID,
      Month: month,
      Deductions: deductions.map((d) => ({
        type: d.type,
        amount: Number(d.amount)
      })),
      EnteredBy: claims?.sub,
      UpdatedAt: now
    };

    // Only set CreatedAt for POST
    if (event.httpMethod === "POST") {
      item.CreatedAt = now;
    }

    await ddb.send(
      new PutCommand({
        TableName: TABLE,
        Item: item
      })
    );

    return response(200, {
      message:
        event.httpMethod === "PUT"
          ? "Deductions updated"
          : "Other deductions saved",
      item
    });
  }

  /* ===========================
     METHOD NOT ALLOWED
  =========================== */
  return response(405, { error: "Method not allowed" });
};
