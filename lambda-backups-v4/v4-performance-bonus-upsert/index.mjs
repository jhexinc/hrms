import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand
} from "@aws-sdk/lib-dynamodb";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TABLE = "v4-performance-bonus";

/* ===========================
   HELPERS
=========================== */
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

function isHR(event) {
  const claims =
    event.requestContext.authorizer?.claims ||
    event.requestContext.authorizer?.jwt?.claims;

  const groups = claims?.["cognito:groups"] || [];
  return groups.includes("v4-hr") || groups.includes("v4-admin");
}

/* ===========================
   HANDLER
=========================== */
export const handler = async (event) => {
  if (!isHR(event)) {
    return response(403, { error: "HR access only" });
  }

  const body = JSON.parse(event.body || "{}");

  let employeeID;
  let month;
  let bonusAmount;
  let remarks;

  if (event.httpMethod === "PUT") {
    const { bonusID, bonusAmount: amt, remarks: r } = body;

    if (!bonusID || amt === undefined) {
      return response(400, { error: "bonusID and bonusAmount required" });
    }

    const parts = bonusID.split("#");
    employeeID = parts[0];
    month = parts[1];
    bonusAmount = amt;
    remarks = r;

  } else {
    // POST
    const { employeeID: e, month: m, bonusAmount: amt, remarks: r } = body;

    if (!e || !m || amt === undefined) {
      return response(400, {
        error: "employeeID, month, bonusAmount required"
      });
    }

    employeeID = e;
    month = m;
    bonusAmount = amt;
    remarks = r;
  }


  const claims =
    event.requestContext.authorizer.claims ||
    event.requestContext.authorizer.jwt.claims;

  const now = new Date().toISOString();

  const bonusId = `${employeeID}#${month}`;

const item = {
  BonusID: bonusId,
  EmployeeID: employeeID,
  Month: month,
  BonusAmount: Number(bonusAmount),
  Remarks: remarks || null,
  EnteredBy: claims.sub,
  CreatedAt: now,
  UpdatedAt: now
};

await ddb.send(
  new PutCommand({
    TableName: TABLE,
    Item: item
  })
);


  return response(200, {
    message: "Performance bonus saved",
    item
  });
};
