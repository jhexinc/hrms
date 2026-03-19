import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const LEAVE_TABLE = "v4-leave-requests";
const EMP_TABLE = "v4-employees";

/* ===========================
   RESPONSE (CORS SAFE)
=========================== */
function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

/* ===========================
   AUTH HELPERS
=========================== */
function getClaims(event) {
  return (
    event.requestContext.authorizer?.claims ||
    event.requestContext.authorizer?.jwt?.claims ||
    {}
  );
}

/* ===========================
   HANDLER
=========================== */
export const handler = async (event) => {
  try {
    if (event.httpMethod !== "GET") {
      return response(405, { error: "Method not allowed" });
    }

    const claims = getClaims(event);
    const teamLeadId = claims.sub;

    if (!teamLeadId) {
      return response(401, { error: "Unauthorized" });
    }

    /* ===========================
       FETCH TL PENDING LEAVES
    =========================== */
    const leaveRes = await ddb.send(
      new ScanCommand({
        TableName: LEAVE_TABLE,
        FilterExpression:
          "#s = :pending AND teamLeadId = :tl",
        ExpressionAttributeNames: {
          "#s": "status",
        },
        ExpressionAttributeValues: {
          ":pending": "PENDING_TL",
          ":tl": teamLeadId,
        },
      })
    );

    const leaves = leaveRes.Items || [];
    if (!leaves.length) {
      return response(200, []);
    }

    /* ===========================
       FETCH EMPLOYEE INFO
       (NAME + CODE + BALANCE)
    =========================== */
    const empRes = await ddb.send(
      new BatchGetCommand({
        RequestItems: {
          [EMP_TABLE]: {
            Keys: leaves.map((l) => ({
              EmployeeID: l.EmployeeID,
            })),
            ProjectionExpression:
              "EmployeeID, #n, employeeCode, leaveBalance",
            ExpressionAttributeNames: {
              "#n": "name",
            },
          },
        },
      })
    );

    const empMap = {};
    for (const e of empRes.Responses?.[EMP_TABLE] || []) {
      empMap[e.EmployeeID] = {
        name: e.name,
        employeeCode: e.employeeCode || e.EmployeeID,
        leaveBalance: e.leaveBalance || { CPL: 0, SL: 0 },
      };
    }

    /* ===========================
       SHAPE RESPONSE
    =========================== */
    return response(
      200,
      leaves.map((l) => ({
        LeaveID: l.LeaveID,
        EmployeeID: l.EmployeeID,

        employeeName: empMap[l.EmployeeID]?.name || "—",
        employeeCode:
          empMap[l.EmployeeID]?.employeeCode || l.EmployeeID,

        employeeLeaveBalance:
          empMap[l.EmployeeID]?.leaveBalance || { CPL: 0, SL: 0 },

        startDate: l.startDate,
        endDate: l.endDate,
        totalDays: l.totalDays,
        reason: l.reason,
        breakup: l.breakup,
        month: l.month,
      }))
    );
  } catch (err) {
    console.error("TL LIST ERROR:", err);
    return response(500, { error: err.message });
  }
};
