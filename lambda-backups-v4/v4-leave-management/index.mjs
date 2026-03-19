import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  GetCommand,
  ScanCommand,
  BatchGetCommand,
  DeleteCommand
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: "us-east-1" });


const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const LEAVE_TABLE = "v4-leave-requests";
const EMP_TABLE = "v4-employees";
const TEAM_ASSIGN_TABLE = "v4-team-assignments";

/* ===========================
   RESPONSE (CORS SAFE)
=========================== */
function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
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

function isHR(event) {
  const groups = getClaims(event)?.["cognito:groups"] || [];
  return groups.includes("v4-hr") || groups.includes("v4-admin");
}

/* ===========================
   TEAM LEAD CHECK (NEW MODEL)
=========================== */
async function isTL(event) {
  const employeeID = getEmployeeId(event);
  if (!employeeID) return false;

  const empRes = await ddb.send(
    new GetCommand({
      TableName: EMP_TABLE,
      Key: { EmployeeID: employeeID },
      ProjectionExpression: "isTL"
    })
  );

  return empRes.Item?.isTL === true;
}

function isFriday(dateStr) {
  return new Date(dateStr).getDay() === 5;
}

function isMonday(dateStr) {
  return new Date(dateStr).getDay() === 1;
}

function isSaturday(dateStr) {
  return new Date(dateStr).getDay() === 6;
}

function isSunday(dateStr) {
  return new Date(dateStr).getDay() === 0;
}

function parseLocalDate(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function detectSandwich(leave, salary) {
  salary = Number(salary);

  const start = parseLocalDate(leave.startDate);
  const end = parseLocalDate(leave.endDate);

  let hasFriday = false;
  let hasMonday = false;
  let weekendAlreadyIncluded = false;

  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();

    if (day === 5) hasFriday = true;
    if (day === 1) hasMonday = true;

    if (day === 6 || day === 0) {
      weekendAlreadyIncluded = true;
    }

    current.setDate(current.getDate() + 1);
  }

  let sandwichConditionMet = false;

  if (salary >= 40000) {
    sandwichConditionMet = hasFriday || hasMonday;
  } else {
    sandwichConditionMet = hasFriday && hasMonday;
  }

  if (!sandwichConditionMet) {
    return { type: "NONE" };
  }

  if (weekendAlreadyIncluded) {
    return { type: "ALREADY_INCLUDED" };
  }

  return { type: "APPLICABLE", weekendDays: 2 };
}

/* ===========================
   EMAIL HELPER (SES)
   Note: Requires 'ses:SendEmail' permission
=========================== */
async function sendLeaveEmail({ employeeEmail, employeeName, status, startDate, endDate, totalDays, comment }) {
  const FROM_EMAIL = "sunkurvenkatesh@gmail.com"; // Replace with your verified domain email

  const isApproved = status === "APPROVED";
  const subject = `Leave Application ${isApproved ? "Approved" : "Rejected"} - ${employeeName}`;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: ${isApproved ? "#059669" : "#dc2626"}; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Leave Request ${isApproved ? "Approved" : "Rejected"}</h1>
      </div>
      <div style="padding: 32px; background-color: white;">
        <p style="font-size: 16px; color: #374151; line-height: 1.5;">Hi <strong>${employeeName}</strong>,</p>
        <p style="font-size: 16px; color: #374151; line-height: 1.5;">Your leave application has been <strong>${status.toLowerCase()}</strong>.</p>

        <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Duration:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${startDate} to ${endDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Total Days:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600; text-align: right;">${totalDays} Days</td>
            </tr>
          </table>
        </div>

        ${comment ? `
        <div style="margin-top: 24px;">
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">HR Comment:</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-left: 4px solid ${isApproved ? "#059669" : "#dc2626"}; border-radius: 4px;">
            <p style="font-size: 15px; color: #374151; margin: 0; font-style: italic;">"${comment}"</p>
          </div>
        </div>
        ` : ""}

        <p style="margin-top: 32px; font-size: 14px; color: #9ca3af; text-align: center;">
          This is an automated message from the HRMS Portal. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  try {
    const command = new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [employeeEmail] },
      Message: {
        Subject: { Data: subject },
        Body: {
          Html: { Data: htmlContent }
        }
      }
    });

    await ses.send(command);
    console.log(`Email sent to ${employeeEmail}`);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}


/* ===========================
   MAIN HANDLER
=========================== */
export const handler = async (event) => {
  const { httpMethod, resource } = event;

  console.log("METHOD:", event.httpMethod);
  console.log("RESOURCE:", event.resource);
  console.log("PATH:", event.path);

  try {
    if (httpMethod === "POST" && resource === "/leave/request") {
      return await requestLeave(event);
    }

    if (httpMethod === "POST" && resource === "/leave/approve") {
      if (!isHR(event)) return response(403, { error: "HR only" });
      return await approveLeaveByHR(event);
    }

    if (httpMethod === "GET" && resource === "/leave/me/history") {
      return await myLeaveHistory(event);
    }

    if (httpMethod === "GET" && resource === "/leave/me/balance") {
      return await getMyLeaveBalance(event);
    }

    if (httpMethod === "DELETE" && resource === "/leave/delete") {


      if (!isHR(event)) return response(403, { error: "HR only" });
      return await deleteLeave(event);
    }

    /* ===========================
       ADMIN / TL → HISTORY
    =========================== */
    if (httpMethod === "GET" && resource === "/leave/admin/history") {
      if (isHR(event)) {
        // HR sees everything
        return await adminLeaveHistory();
      }

      if (await isTL(event)) {
        // TL sees only their team
        return await teamLeadLeaveHistory(event);
      }

      return response(403, { error: "HR or Team Lead only" });
    }

    return response(404, { error: "Route not found" });
  } catch (err) {
    console.error("LEAVE ERROR:", err);
    return response(500, { error: err.message });
  }
};

/* ===========================
   EMPLOYEE → REQUEST LEAVE
=========================== */
async function requestLeave(event) {

  const body = JSON.parse(event.body || "{}");

  const isHrUser = isHR(event);

  /* ===========================
     Determine EmployeeID
  ============================ */

  let employeeID;

  console.log("Is HR:", isHR(event));
  console.log("Body:", body);
  console.log("Body EmployeeID:", body.EmployeeID);
  console.log("JWT EmployeeID:", getEmployeeId(event));

  if (isHrUser && body.EmployeeID) {
    employeeID = body.EmployeeID; // HR applying on behalf
  } else {
    employeeID = getEmployeeId(event); // Normal employee
  }

  const {
    startDate,
    endDate,
    casualDays = 0,
    sickDays = 0,
    reason,
    month,
    dailyBreakdown = []
  } = body;

  if (!employeeID || !startDate || !endDate || !reason || !month) {
    return response(400, { error: "Missing required fields" });
  }

  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  if (isNaN(start) || isNaN(end) || end < start) {
    return response(400, { error: "Invalid date range" });
  }

  /* ===========================
     Overlap Check
  ============================ */

  const existingRes = await ddb.send(
    new QueryCommand({
      TableName: LEAVE_TABLE,
      IndexName: "GSI_LeaveByEmployee",
      KeyConditionExpression: "EmployeeID = :e",
      ExpressionAttributeValues: { ":e": employeeID }
    })
  );

  const existingLeaves = existingRes.Items || [];

  for (const l of existingLeaves) {
    if (!["PENDING_TL", "PENDING_HR", "APPROVED"].includes(l.status))
      continue;

    if (!l.startDate || !l.endDate) continue;

    const es = new Date(l.startDate);
    const ee = new Date(l.endDate);

    if (start <= ee && es <= end) {
      return response(400, {
        error: "Leave already exists for these dates"
      });
    }
  }

  /* ===========================
     Calculate Total Days
  ============================ */

  let totalDays = 0;

  if (dailyBreakdown && dailyBreakdown.length > 0) {
    totalDays = dailyBreakdown.reduce((acc, d) => {
      if (d.type === "FULL") return acc + 1;
      if (d.type === "FIRST_HALF" || d.type === "SECOND_HALF")
        return acc + 0.5;
      return acc;
    }, 0);
  } else {
    totalDays =
      Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  }

  totalDays = Number(totalDays.toFixed(2));

  /* ===========================
     Fetch Employee + Balance
  ============================ */

  const empRes = await ddb.send(
    new GetCommand({
      TableName: EMP_TABLE,
      Key: { EmployeeID: employeeID }
    })
  );

  if (!empRes.Item) {
    return response(400, { error: "Employee not found" });
  }

  const baseBalance = empRes.Item.leaveBalance || { CPL: 0, SL: 0 };

  let reservedCPL = 0;
  let reservedSL = 0;

  for (const l of existingLeaves) {
    if (!["PENDING_TL", "PENDING_HR"].includes(l.status)) continue;
    if (!l.breakup) continue;

    reservedCPL += l.breakup.CPL || 0;
    reservedSL += l.breakup.SL || 0;
  }

  if (casualDays > baseBalance.CPL - reservedCPL) {
    return response(400, { error: "Insufficient casual leave balance" });
  }

  if (sickDays > baseBalance.SL - reservedSL) {
    return response(400, { error: "Insufficient sick leave balance" });
  }

  const lopDays = totalDays - (casualDays + sickDays);

  /* ===========================
   Team Assignment (Fixed for GSI)
  =========================== */

  let teamLeadId = null;

  if (!isHrUser) {
    const teamRes = await ddb.send(
      new QueryCommand({
        TableName: TEAM_ASSIGN_TABLE,
        KeyConditionExpression: "EmployeeID = :e",
        FilterExpression: "Active = :a",
        ExpressionAttributeValues: {
          ":e": employeeID,
          ":a": 1
        }
      })
  );

  const assignment = teamRes.Items?.[0] || null;
  teamLeadId = assignment?.TeamLeadID || null;
  }

  /* ===========================
    STATUS + GSI SAFE FIX
  =========================== */

  // Check if applying user is TL himself
  const applyingUserIsTL = await isTL(event);

  let status;

  // HR applying → always goes to HR
  if (isHrUser) {
    status = "PENDING_HR";
    teamLeadId = "HR";
  }

  // TL applying → check if TL has a parent TL
  else if (applyingUserIsTL) {

    const tlAssignmentRes = await ddb.send(
      new QueryCommand({
        TableName: TEAM_ASSIGN_TABLE,
        KeyConditionExpression: "EmployeeID = :e",
        FilterExpression: "Active = :a",
        ExpressionAttributeValues: {
          ":e": employeeID,
          ":a": 1
        }
      })
    );

    const parentTL = tlAssignmentRes.Items?.[0]?.TeamLeadID || null;

    if (parentTL) {
      status = "PENDING_TL";
      teamLeadId = parentTL;
    } else {
      status = "PENDING_HR";
      teamLeadId = "HR";
    }
  }

  // Normal employee
  else if (teamLeadId) {
    status = "PENDING_TL";
  }

  // No TL assigned
  else {
    status = "PENDING_HR";
    teamLeadId = "HR";
  }

  /* ===========================
     Create Leave Record
  ============================ */

  const leave = {
    LeaveID: randomUUID(),
    EmployeeID: employeeID,

    startDate,
    endDate,

    dailyBreakdown,
    totalDays,

    breakup: {
      CPL: casualDays,
      SL: sickDays,
      LOP: lopDays
    },

    reason,
    month,

    status,
    teamLeadId,

    createdByHR: isHrUser,
    createdAt: new Date().toISOString()
  };

  await ddb.send(
    new PutCommand({
      TableName: LEAVE_TABLE,
      Item: leave
    })
  );

  return response(201, {
    message: "Leave request submitted successfully",
    flow: isHrUser
      ? "HR applied → Pending HR approval"
      : "Employee applied → Normal flow"
  });
}

/* ===========================
   TEAM LEAD → HISTORY (NEW)
=========================== */
async function teamLeadLeaveHistory(event) {
  const teamLeadId = getEmployeeId(event);

  const leaveRes = await ddb.send(
    new ScanCommand({
      TableName: LEAVE_TABLE,
      FilterExpression: "teamLeadId = :tl",
      ExpressionAttributeValues: {
        ":tl": teamLeadId
      }
    })
  );

  const leaves = leaveRes.Items || [];
  if (!leaves.length) return response(200, []);

  const employeeIds = [...new Set(leaves.map(l => l.EmployeeID))];
  const employeeMap = {};

  for (let i = 0; i < employeeIds.length; i += 100) {
    const batch = employeeIds.slice(i, i + 100);

    const empRes = await ddb.send(
      new BatchGetCommand({
        RequestItems: {
          [EMP_TABLE]: {
            Keys: batch.map(id => ({ EmployeeID: id })),
            ProjectionExpression: "EmployeeID, #n, employeeCode, leaveBalance, isActive",
            ExpressionAttributeNames: {
              "#n": "name"
            }
          }
        }
      })
    );

    for (const emp of empRes.Responses?.[EMP_TABLE] || []) {
      employeeMap[emp.EmployeeID] = {
        ...emp,
        name: emp.name || "—",
        employeeCode: emp.employeeCode || emp.EmployeeID,
        leaveBalance: emp.leaveBalance || emp.LeaveBalance || { CPL: 0, SL: 0 },
        isActive: emp.isActive !== false
      };
    }
  }

  const filtered = leaves.filter(
    l => employeeMap[l.EmployeeID]?.isActive !== false
  );

  return response(
    200,
    filtered.map(l => ({
      ...l,
      employeeName: employeeMap[l.EmployeeID]?.name || "—",
      employeeCode:
        employeeMap[l.EmployeeID]?.employeeCode || l.EmployeeID,
      employeeLeaveBalance: employeeMap[l.EmployeeID]?.leaveBalance || { CPL: 0, SL: 0 }
    }))
  );
}

/* ===========================
   HR → APPROVE / UPDATE
=========================== */
async function approveLeaveByHR(event) {
  console.log("APPROVE_LEAVE_BY_HR_START:", event.body);
  const body = JSON.parse(event.body || "{}");

  const { LeaveID, action, breakup } = body;

  const leaveRes = await ddb.send(
    new GetCommand({
      TableName: LEAVE_TABLE,
      Key: { LeaveID }
    })
  );

  const leave = leaveRes.Item;
  if (!leave) return response(400, { error: "Leave not found" });

  // Special Action: SEND_NOTIFY
  if (action === "SEND_NOTIFY") {
    const empRes = await ddb.send(
      new GetCommand({
        TableName: EMP_TABLE,
        Key: { EmployeeID: leave.EmployeeID }
      })
    );
    const emp = empRes.Item;
    if (!emp || !emp.Email) return response(400, { error: "Employee email not found" });

    await sendLeaveEmail({
      employeeEmail: emp.Email,
      employeeName: emp.name || "Employee",
      status: leave.status,
      startDate: leave.startDate,
      endDate: leave.endDate,
      totalDays: leave.totalDays,
      comment: body.comment || leave.hrComment || ""
    });

    return response(200, { success: true, message: "Notification email sent" });
  }

  const allowedStatuses = ["PENDING_HR", "PENDING_TL", "APPROVED"];


  if (!allowedStatuses.includes(leave.status)) {
    return response(400, { error: "Invalid leave status" });
  }

  const empRes = await ddb.send(
    new GetCommand({
      TableName: EMP_TABLE,
      Key: { EmployeeID: leave.EmployeeID }
    })
  );

  const emp = empRes.Item;
  const balance = emp.leaveBalance || { CPL: 0, SL: 0 };

  if (action === "APPROVE") {
    const oldBreakup = leave.breakup || { CPL: 0, SL: 0 };
    const cplDiff = oldBreakup.CPL - breakup.CPL;
    const slDiff = oldBreakup.SL - breakup.SL;

    if (cplDiff < 0 && Math.abs(cplDiff) > balance.CPL) {
      return response(400, { error: "Insufficient CPL balance" });
    }

    if (slDiff < 0 && Math.abs(slDiff) > balance.SL) {
      return response(400, { error: "Insufficient SL balance" });
    }

    await ddb.send(
      new UpdateCommand({
        TableName: EMP_TABLE,
        Key: { EmployeeID: leave.EmployeeID },
        UpdateExpression: "SET leaveBalance = :lb",
        ExpressionAttributeValues: {
          ":lb": {
            CPL: balance.CPL + cplDiff,
            SL: balance.SL + slDiff
          }
        }
      })
    );
  }

  const status = action === "APPROVE" ? "APPROVED" : "REJECTED";

  await ddb.send(
    new UpdateCommand({
      TableName: LEAVE_TABLE,
      Key: { LeaveID },
      UpdateExpression: "SET #s = :s, breakup = :b, sandwichApplied = :sa, updatedAt = :u, hrComment = :c",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":s": status,
        ":b": breakup || leave.breakup,
        ":u": new Date().toISOString(),
        ":sa": body.sandwichApplied || false,
        ":c": body.comment || ""
      }
    })
  );

  return response(200, { success: true });
}



/* ===========================
   EMPLOYEE → MY HISTORY
=========================== */
async function myLeaveHistory(event) {
  const employeeID = getEmployeeId(event);

  const res = await ddb.send(
    new QueryCommand({
      TableName: LEAVE_TABLE,
      IndexName: "GSI_LeaveByEmployee",
      KeyConditionExpression: "EmployeeID = :e",
      ExpressionAttributeValues: { ":e": employeeID }
    })
  );

  return response(200, res.Items || []);
}

/* ===========================
   EMPLOYEE → MY BALANCE
=========================== */
async function getMyLeaveBalance(event) {
  const employeeID = getEmployeeId(event);

  const empRes = await ddb.send(
    new GetCommand({
      TableName: EMP_TABLE,
      Key: { EmployeeID: employeeID }
    })
  );

  return response(200, empRes.Item?.leaveBalance || { CPL: 0, SL: 0 });
}

/* ===========================
   HR → ALL HISTORY
=========================== */
/* ===========================
   HR / TL → ADMIN HISTORY
   (ENRICHED RESPONSE)
=========================== */
async function adminLeaveHistory() {
  const leaveRes = await ddb.send(
    new ScanCommand({ TableName: LEAVE_TABLE })
  );

  const leaves = leaveRes.Items || [];
  if (!leaves.length) return response(200, []);

  const employeeIds = [...new Set(leaves.map(l => l.EmployeeID))];
  const employeeMap = {};

  // Batch in chunks of 100
  for (let i = 0; i < employeeIds.length; i += 100) {
    const batch = employeeIds.slice(i, i + 100);

    const empRes = await ddb.send(
      new BatchGetCommand({
        RequestItems: {
          [EMP_TABLE]: {
            Keys: batch.map(id => ({ EmployeeID: id })),
            ProjectionExpression:
              "EmployeeID, #n, employeeCode, leaveBalance, baseSalary, isActive",
            ExpressionAttributeNames: {
              "#n": "name"
            }
          }
        }
      })
    );

    for (const emp of empRes.Responses?.[EMP_TABLE] || []) {
      employeeMap[emp.EmployeeID] = {
        name: emp.name || "—",
        employeeCode: emp.employeeCode || emp.EmployeeID,
        leaveBalance: emp.leaveBalance || { CPL: 0, SL: 0 },
        salary: Number(emp.baseSalary) || 0,
        isActive: emp.isActive !== false // default true
      };
    }
  }

  const enriched = [];

  for (const l of leaves) {
    const emp = employeeMap[l.EmployeeID];
    if (!emp || emp.isActive === false) continue;

    const salary = emp?.salary || 0; // make sure salary exists in EMP_TABLE

    const sandwich = detectSandwich(l, salary);

    enriched.push({
      ...l,
      employeeName: emp?.name || "—",
      employeeCode: emp?.employeeCode || l.EmployeeID,
      employeeLeaveBalance: emp?.leaveBalance || { CPL: 0, SL: 0 },

      sandwichType: sandwich.type,
      sandwichWeekendDays: sandwich.weekendDays || 0,
      sandwichApplied: l.sandwichApplied || false
    });
  }

  return response(200, enriched);
}


async function deleteLeave(event) {
  const body = JSON.parse(event.body || "{}");
  const { LeaveID } = body;

  if (!LeaveID) {
    return response(400, { error: "LeaveID required" });
  }

  // 1️⃣ Fetch leave
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

  // 2️⃣ If APPROVED → restore balance
  if (leave.status === "APPROVED") {
    const empRes = await ddb.send(
      new GetCommand({
        TableName: EMP_TABLE,
        Key: { EmployeeID: leave.EmployeeID }
      })
    );

    const emp = empRes.Item;
    if (emp) {
      const currentBalance = emp.leaveBalance || { CPL: 0, SL: 0 };
      const breakup = leave.breakup || { CPL: 0, SL: 0 };

      const restoredBalance = {
        CPL: Number(currentBalance.CPL || 0) + Number(breakup.CPL || 0),
        SL: Number(currentBalance.SL || 0) + Number(breakup.SL || 0)
      };

      await ddb.send(
        new UpdateCommand({
          TableName: EMP_TABLE,
          Key: { EmployeeID: leave.EmployeeID },
          UpdateExpression: "SET leaveBalance = :lb",
          ExpressionAttributeValues: {
            ":lb": restoredBalance
          }
        })
      );
    }
  }

  // 3️⃣ Delete leave record
  await ddb.send(
    new DeleteCommand({
      TableName: LEAVE_TABLE,
      Key: { LeaveID }
    })
  );

  return response(200, {
    success: true,
    message: "Leave deleted successfully"
  });
}
