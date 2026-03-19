import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const LEAVE_TABLE = "v4-leave-requests";
const STATUS_INDEX = "status-index";

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "*",
    },
    body: JSON.stringify(body),
  };
}

function getClaims(event) {
  return (
    event.requestContext.authorizer?.claims ||
    event.requestContext.authorizer?.jwt?.claims
  );
}

function isAdmin(claims) {
  const groups = claims?.["cognito:groups"] || [];
  return groups.includes("v4-admin") || groups.includes("v4-hr");
}

export const handler = async (event) => {
  try {
    const claims = getClaims(event);
    const userId = claims?.sub;

    if (!userId) {
      return response(401, { error: "Unauthorized" });
    }

    const path = event.rawPath || event.resource;

    /* =========================
       TL PENDING COUNT
    ========================= */
    if (path.includes("/count/leave/tlPending")) {
      const result = await ddb.send(
        new QueryCommand({
          TableName: LEAVE_TABLE,
          IndexName: STATUS_INDEX,
          KeyConditionExpression:
            "#status = :pending AND #tl = :tlId",
          ExpressionAttributeNames: {
            "#status": "status",
            "#tl": "teamLeadId",
          },
          ExpressionAttributeValues: {
            ":pending": "PENDING_TL",
            ":tlId": userId,
          },
          Select: "COUNT",
        })
      );

      return response(200, { count: result.Count || 0 });
    }

    /* =========================
       ADMIN / HR PENDING COUNT
    ========================= */
    if (path.includes("/count/leave/adminPending")) {
      if (!isAdmin(claims)) {
        return response(403, { error: "Admin access only" });
      }

      const result = await ddb.send(
        new QueryCommand({
          TableName: LEAVE_TABLE,
          IndexName: STATUS_INDEX,
          KeyConditionExpression: "#status = :pending",
          ExpressionAttributeNames: {
            "#status": "status",
          },
          ExpressionAttributeValues: {
            ":pending": "PENDING_HR",
          },
          Select: "COUNT",
        })
      );

      return response(200, { count: result.Count || 0 });
    }

    return response(404, { error: "Route not found" });
  } catch (err) {
    console.error(err);
    return response(500, {
      error: "Failed to fetch pending count",
    });
  }
};