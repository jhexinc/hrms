import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  GetCommand,
  BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE = "v4-team-assignments";
const EMP_TABLE = "v4-employees";

/* ==========================
   HELPERS
========================== */

function getClaims(event) {
  return (
    event.requestContext.authorizer?.claims ||
    event.requestContext.authorizer?.jwt?.claims ||
    {}
  );
}

function isHR(event) {
  const roles = getClaims(event)["cognito:groups"] || [];
  return roles.includes("v4-hr") || roles.includes("v4-admin");
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

/* ==========================
   HANDLER
========================== */

export const handler = async (event) => {
  try {
    const path = event.resource || event.rawPath;
    const method = event.httpMethod;

    if (path === "/admin/team-assignments") {
      if (!isHR(event)) {
        return response(403, { error: "HR access only" });
      }

      if (method === "POST") return await assignEmployee(event);
      if (method === "GET") return await listByTeamLead(event);
      if (method === "DELETE") return await removeEmployee(event);
    }

    return response(405, { error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return response(500, { error: "Internal server error" });
  }
};

/* ==========================
   POST — Assign Employee
========================== */

async function assignEmployee(event) {
  const { employeeId, teamLeadId } = JSON.parse(event.body || "{}");

  if (!employeeId || !teamLeadId) {
    return response(400, {
      error: "employeeId and teamLeadId required",
    });
  }

  if (employeeId === teamLeadId) {
    return response(400, {
      error: "Employee cannot report to themselves",
    });
  }

  const tlRes = await ddb.send(
    new GetCommand({
      TableName: EMP_TABLE,
      Key: { EmployeeID: teamLeadId },
      ProjectionExpression: "EmployeeID, isTL",
    })
  );

  if (!tlRes.Item?.isTL) {
    return response(400, {
      error: "Selected employee is not a Team Lead",
    });
  }

  const now = new Date().toISOString();

  const existing = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "EmployeeID = :e",
      FilterExpression: "Active = :a",
      ExpressionAttributeValues: {
        ":e": employeeId,
        ":a": 1,
      },
    })
  );

  if (existing.Items?.length) {
    const current = existing.Items[0];
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: {
          EmployeeID: current.EmployeeID,
          AssignedAt: current.AssignedAt,
        },
        UpdateExpression: "SET Active = :z",
        ExpressionAttributeValues: { ":z": 0 },
      })
    );
  }

  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        EmployeeID: employeeId,
        TeamLeadID: teamLeadId,
        AssignedAt: now,
        Active: 1,
      },
    })
  );

  return response(200, { success: true });
}

/* ==========================
   GET — List By TL
========================== */

async function listByTeamLead(event) {
  const teamLeadId = event.queryStringParameters?.teamLeadId;
  if (!teamLeadId) {
    return response(400, { error: "teamLeadId required" });
  }

  const assignRes = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "TeamLeadIndex",
      KeyConditionExpression: "TeamLeadID = :tl AND Active = :a",
      ExpressionAttributeValues: {
        ":tl": teamLeadId,
        ":a": 1,
      },
    })
  );

  const assignments = assignRes.Items || [];
  if (!assignments.length) return response(200, []);

  const empRes = await ddb.send(
    new BatchGetCommand({
      RequestItems: {
        [EMP_TABLE]: {
          Keys: assignments.map((a) => ({
            EmployeeID: a.EmployeeID,
          })),
          ProjectionExpression: "EmployeeID, #n, department",
          ExpressionAttributeNames: { "#n": "name" },
        },
      },
    })
  );

  const empMap = {};
  for (const e of empRes.Responses?.[EMP_TABLE] || []) {
    empMap[e.EmployeeID] = e;
  }

  return response(
    200,
    assignments.map((a) => ({
      EmployeeID: a.EmployeeID,
      name: empMap[a.EmployeeID]?.name,
      department: empMap[a.EmployeeID]?.department,
    }))
  );
}

/* ==========================
   DELETE — Remove Employee
========================== */

async function removeEmployee(event) {
  const { employeeId, teamLeadId } = JSON.parse(event.body || "{}");

  const res = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "EmployeeID = :e",
      FilterExpression:
        "TeamLeadID = :tl AND Active = :a",
      ExpressionAttributeValues: {
        ":e": employeeId,
        ":tl": teamLeadId,
        ":a": 1,
      },
    })
  );

  if (!res.Items?.length) {
    return response(404, { error: "Assignment not found" });
  }

  const item = res.Items[0];

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: {
        EmployeeID: item.EmployeeID,
        AssignedAt: item.AssignedAt,
      },
      UpdateExpression: "SET Active = :z",
      ExpressionAttributeValues: { ":z": 0 },
    })
  );

  return response(200, { success: true });
}
