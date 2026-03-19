import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const LEAVE_TABLE = "v4-leave-requests";

/* ===========================
   RESPONSE (CORS SAFE)
=========================== */
function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "OPTIONS,POST"
    },
    body: JSON.stringify(body)
  };
}

/* ===========================
   AUTH HELPERS
=========================== */
function getClaims(event) {
  return (
    event.requestContext.authorizer?.claims ||
    event.requestContext.authorizer?.jwt?.claims
  );
}

function getEmployeeId(event) {
  return getClaims(event)?.sub;
}

/* ===========================
   MAIN HANDLER
=========================== */
export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return response(405, { error: "Method not allowed" });
    }

    const body = JSON.parse(event.body || "{}");
    const { LeaveID, action, comment } = body;

    const teamLeadId = getEmployeeId(event);

    if (!LeaveID || !action) {
      return response(400, { error: "LeaveID and action are required" });
    }

    if (!["APPROVE", "REJECT"].includes(action)) {
      return response(400, { error: "Invalid action" });
    }

    /* ===========================
       FETCH LEAVE
    =========================== */
    const leaveRes = await ddb.send(
      new GetCommand({
        TableName: LEAVE_TABLE,
        Key: { LeaveID }
      })
    );

    const leave = leaveRes.Item;

    if (!leave) {
      return response(404, { error: "Leave not found" });
    }

    /* ===========================
       STRICT GUARDS
    =========================== */
    if (leave.status !== "PENDING_TL") {
      return response(400, {
        error: "Leave is not pending Team Lead approval"
      });
    }

    if (!leave.teamLeadId) {
      return response(400, {
        error: "No Team Lead assigned for this leave"
      });
    }

    if (leave.teamLeadId !== teamLeadId) {
      return response(403, {
        error: "You are not authorized to approve this leave"
      });
    }

    /* ===========================
       STATUS TRANSITION
    =========================== */
    const newStatus =
      action === "APPROVE" ? "PENDING_HR" : "REJECTED_TL";

    await ddb.send(
      new UpdateCommand({
        TableName: LEAVE_TABLE,
        Key: { LeaveID },
        UpdateExpression: "SET #s = :s, updatedAt = :u, tlComment = :c",
        ExpressionAttributeNames: {
          "#s": "status"
        },
        ExpressionAttributeValues: {
          ":s": newStatus,
          ":u": new Date().toISOString(),
          ":c": comment || ""
        }
      })
    );

    return response(200, {
      success: true,
      status: newStatus
    });
  } catch (err) {
    console.error("TL APPROVAL ERROR:", err);
    return response(500, { error: err.message });
  }
};
