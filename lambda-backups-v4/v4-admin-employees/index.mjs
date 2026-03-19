import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
   ScanCommand,
   UpdateCommand,
   QueryCommand,
   DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from "@aws-sdk/client-cognito-identity-provider";

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const cognito = new CognitoIdentityProviderClient({});
const USER_POOL_ID = "us-east-1_uxspYNjRr";


const EMP_TABLE = "v4-employees";
const TEAM_TABLE = "v4-team-assignments";

/* ===========================
   AUTH HELPERS
=========================== */

function isHR(event) {
  const claims =
    event.requestContext.authorizer?.claims ||
    event.requestContext.authorizer?.jwt?.claims;

  const roles = claims?.["cognito:groups"] || [];
  return roles.includes("v4-hr") || roles.includes("v4-admin");
}

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

/* ===========================
   HANDLER
=========================== */

export const handler = async (event) => {
  if (!isHR(event)) {
    return response(403, { error: "HR access only" });
  }

  const method = event.httpMethod;
  const employeeId = event.pathParameters?.employeeId;

  try {
    if (method === "GET") {
      return await listEmployees();
    }

    if (method === "PUT") {
      if (!employeeId) {
        return response(400, { error: "employeeId required" });
      }
      return await updateEmployee(employeeId, event);
    }

    return response(405, { error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    return response(500, { error: err.message });
  }
};

/* ===========================
   GET /admin/employees
=========================== */

async function listEmployees() {
  const scan = await ddb.send(
    new ScanCommand({
      TableName: EMP_TABLE,
    })
  );

  return response(200, scan.Items || []);
}

/* ===========================
   PUT /admin/employees/{id}
=========================== */

async function updateEmployee(employeeId, event) {
  const body = JSON.parse(event.body || "{}");
  console.log("BODY:", body);

  if (body.action === "DELETE") {
    return await deleteEmployee(employeeId);
  }

  const allowed = {
    baseSalary:
      typeof body.baseSalary === "number"
        ? body.baseSalary
        : undefined,

    pfApplicable: body.pfApplicable,

    // ✅ SOURCE OF TRUTH
    isTL:
      typeof body.isTL === "boolean"
        ? body.isTL
        : undefined,
    
    isActive:
      typeof body.isActive === "boolean"
        ? body.isActive
        : undefined,

    employeeCode: body.employeeCode,
    branch: body.branch,
    dateOfJoining: body.dateOfJoining,

    employmentStatus: body.employmentStatus,
    leaveBalance:
      body.employmentStatus === "PROBATION"
        ? { CPL: 0, SL: 0 }
        : body.leaveBalance,

    bankAccount: body.bankAccount,
    
    // New fields
    pan: body.pan,
    uan: body.uan,
    
    updatedAt: new Date().toISOString(),
  };

  const updates = [];
  const values = {};
  const names = {};

  Object.entries(allowed).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`#${key} = :${key}`);
      values[`:${key}`] = value;
      names[`#${key}`] = key;
    }
  });

  if (!updates.length) {
    return response(400, {
      error: "No valid fields to update",
    });
  }

  console.log("UPDATES ARRAY:", updates);
  console.log("VALUES OBJECT:", values);

  await ddb.send(
    new UpdateCommand({
      TableName: EMP_TABLE,
      Key: { EmployeeID: employeeId },
      UpdateExpression: "SET " + updates.join(", "),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    })
  );

  /* ===========================
     🚨 AUTO FREE TEAM MEMBERS
     When TL is removed
  =========================== */

  if (body.isTL === false) {
    const assignments = await ddb.send(
      new QueryCommand({
        TableName: TEAM_TABLE,
        IndexName: "TeamLeadIndex",
        KeyConditionExpression:
          "TeamLeadID = :tl AND Active = :a",
        ExpressionAttributeValues: {
          ":tl": employeeId,
          ":a": 1,
        },
      })
    );

    for (const a of assignments.Items || []) {
      await ddb.send(
        new UpdateCommand({
          TableName: TEAM_TABLE,
          Key: {
            EmployeeID: a.EmployeeID,
            AssignedAt: a.AssignedAt,
          },
          UpdateExpression: "SET Active = :z",
          ExpressionAttributeValues: {
            ":z": 0,
          },
        })
      );
    }
  }

  return response(200, {
    message: "Employee updated successfully",
  });
}

/* ===========================
   DELETE /admin/employees/{id}
=========================== */

async function deleteEmployee(employeeId) {
  // 1. Delete user from Cognito using their EmployeeID (which is their Cognito sub / username)
  try {
    await cognito.send(new AdminDeleteUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: employeeId
    }));
    console.log(`Successfully deleted user ${employeeId} from Cognito`);
  } catch (err) {
    console.error("Failed to delete user from Cognito:", err);
    // Continue execution to delete from DynamoDB even if Cognito deletion fails
  }

  // 2. Delete employee record from DynamoDB
  await ddb.send(new DeleteCommand({
    TableName: EMP_TABLE,
    Key: { EmployeeID: employeeId }
  }));
  console.log(`Successfully deleted employee ${employeeId} from DynamoDB`);

  // 3. Cascade Delete Leaves
  try {
    const leaveRes = await ddb.send(new QueryCommand({
      TableName: "v4-leave-requests",
      IndexName: "GSI_LeaveByEmployee",
      KeyConditionExpression: "EmployeeID = :e",
      ExpressionAttributeValues: { ":e": employeeId }
    }));
    
    if (leaveRes.Items && leaveRes.Items.length > 0) {
      for (const leave of leaveRes.Items) {
        await ddb.send(new DeleteCommand({
          TableName: "v4-leave-requests",
          Key: { LeaveID: leave.LeaveID }
        }));
      }
      console.log(`Cascade deleted ${leaveRes.Items.length} leaves for employee ${employeeId}`);
    }
  } catch(err) {
    console.error("Failed to cascade delete leaves:", err);
  }

  // 4. Cascade Delete Attendances
  try {
    const attRes = await ddb.send(new QueryCommand({
      TableName: "v4-attendance",
      IndexName: "GSI_AttendanceByEmployee",
      KeyConditionExpression: "EmployeeID = :e",
      ExpressionAttributeValues: { ":e": employeeId }
    }));
    
    if (attRes.Items && attRes.Items.length > 0) {
      for (const att of attRes.Items) {
        await ddb.send(new DeleteCommand({
          TableName: "v4-attendance",
          Key: { AttendanceID: att.AttendanceID }
        }));
      }
      console.log(`Cascade deleted ${attRes.Items.length} attendances for employee ${employeeId}`);
    }
  } catch(err) {
    console.error("Failed to cascade delete attendances:", err);
  }

  // 5. Cascade Delete Salary Slips
  try {
    const slipRes = await ddb.send(new QueryCommand({
      TableName: "v4-salary-slips",
      IndexName: "GSI_SalaryByEmployee",
      KeyConditionExpression: "EmployeeID = :e",
      ExpressionAttributeValues: { ":e": employeeId }
    }));
    
    if (slipRes.Items && slipRes.Items.length > 0) {
      for (const slip of slipRes.Items) {
        await ddb.send(new DeleteCommand({
          TableName: "v4-salary-slips",
          Key: { SlipID: slip.SlipID }
        }));
      }
      console.log(`Cascade deleted ${slipRes.Items.length} salary slips for employee ${employeeId}`);
    }
  } catch(err) {
    console.error("Failed to cascade delete salary slips:", err);
  }

  // 6. Cascade Delete Performance Bonuses
  try {
    const bonusRes = await ddb.send(new ScanCommand({
      TableName: "v4-performance-bonus",
      FilterExpression: "EmployeeID = :e",
      ExpressionAttributeValues: { ":e": employeeId }
    }));
    
    if (bonusRes.Items && bonusRes.Items.length > 0) {
      for (const bonus of bonusRes.Items) {
        await ddb.send(new DeleteCommand({
          TableName: "v4-performance-bonus",
          Key: { BonusID: bonus.BonusID }
        }));
      }
      console.log(`Cascade deleted ${bonusRes.Items.length} bonuses for employee ${employeeId}`);
    }
  } catch(err) {
    console.error("Failed to cascade delete bonuses:", err);
  }

  // 7. Cascade Delete Other Deductions
  try {
    const dedRes = await ddb.send(new ScanCommand({
      TableName: "v4-other-deductions",
      FilterExpression: "EmployeeID = :e",
      ExpressionAttributeValues: { ":e": employeeId }
    }));
    
    if (dedRes.Items && dedRes.Items.length > 0) {
      for (const ded of dedRes.Items) {
        await ddb.send(new DeleteCommand({
          TableName: "v4-other-deductions",
          Key: { DeductionID: ded.DeductionID }
        }));
      }
      console.log(`Cascade deleted ${dedRes.Items.length} deductions for employee ${employeeId}`);
    }
  } catch(err) {
    console.error("Failed to cascade delete deductions:", err);
  }

  return response(200, { message: "Employee and all related data successfully deleted from the system entirely." });
}