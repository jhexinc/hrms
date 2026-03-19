import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE = "v4-employees";

export const handler = async (event) => {
  try {
    console.log("EVENT:", JSON.stringify(event, null, 2));

    const claims = event.requestContext.authorizer.claims;
    const employeeID = claims.sub;
    const email = claims.email;

    const body = JSON.parse(event.body);
    const timestamp = new Date().toISOString();

    /* ---------------- STEP 1: DELETE SEEDED EMPLOYEES ---------------- */

    const seedLookup = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "EmailIndex",
        KeyConditionExpression: "#email = :email",
        ExpressionAttributeNames: { "#email": "Email" },
        ExpressionAttributeValues: { ":email": email },
      })
    );

    if (seedLookup.Items) {
      for (const item of seedLookup.Items) {
        if (item.EmployeeID !== employeeID) {
          await ddb.send(
            new DeleteCommand({
              TableName: TABLE,
              Key: { EmployeeID: item.EmployeeID },
            })
          );
        }
      }
    }

    /* ---------------- STEP 2: NORMALIZED FIELDS ---------------- */

    const fields = {
      Email: email,
      name: body.name,
      dob: body.dob,
      gender: body.gender,
      address: body.address,

      pan: body.pan,
      uan: body.uan,

      department: body.department,
      designation: body.designation,

      // ✅ DEFAULT EMPLOYMENT STATUS
      employmentStatus: "PROBATION",

      // leave defaults (optional but recommended)
      leaveBalance: {
        CPL: 0,
        SL: 0,
      },

      registrationComplete: true,
      isActive: true,
      updatedAt: timestamp,
    };

    /* ---------------- STEP 3: UPDATE EXPRESSION ---------------- */

    const updateParts = [];
    const names = {};
    const values = {};

    for (const key in fields) {
      if (fields[key] !== undefined) {
        updateParts.push(`#${key} = :${key}`);
        names[`#${key}`] = key;
        values[`:${key}`] = fields[key];
      }
    }

    // createdAt — set only once
    updateParts.push(
      "#createdAt = if_not_exists(#createdAt, :createdAt)"
    );
    names["#createdAt"] = "createdAt";
    values[":createdAt"] = timestamp;

    const updateExpression = "SET " + updateParts.join(", ");

    /* ---------------- STEP 4: UPSERT EMPLOYEE ---------------- */

    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { EmployeeID: employeeID },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      })
    );

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      },
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("ERROR:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "*",
      },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
