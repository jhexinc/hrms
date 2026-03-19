import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const EMP_TABLE = "v4-employees";
const LEAVE_TABLE = "v4-leave-requests";

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*"
    },
    body: JSON.stringify(body)
  };
}

function getMonthBoundaries(month) {
  const [year, m] = month.split("-").map(Number);
  const monthStart = new Date(year, m - 1, 1);
  const monthEnd = new Date(year, m, 0);
  return { monthStart, monthEnd };
}

function diffDays(start, end) {
  const ms = end - start;
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

/* =====================================================
   HELPER → CALCULATE LOP FOR GIVEN MONTH
===================================================== */

function calculateMonthlyLOP(leave, targetMonth) {

  let lopTotal = 0;

  if (!leave.dailyBreakdown || leave.dailyBreakdown.length === 0)
    return 0;

  for (const d of leave.dailyBreakdown) {

    if (!d.date || !d.date.startsWith(targetMonth)) continue;

    let value = 0;

    if (d.type === "FULL") value = 1;
    else if (d.type === "FIRST_HALF" || d.type === "SECOND_HALF")
      value = 0.5;

    const totalLeaveDays = leave.totalDays || 1;
    const ratio = value / totalLeaveDays;

    lopTotal += (leave.breakup?.LOP || 0) * ratio;
  }

  return Number(lopTotal.toFixed(2));
}

export const handler = async (event) => {

  try {

    const { month } = event.queryStringParameters || {};

    if (!month) {
      return response(400, { message: "Month required" });
    }

    const { monthStart, monthEnd } = getMonthBoundaries(month);

    /* =====================================================
       1️⃣ GET ALL EMPLOYEES
    ===================================================== */

    const empResult = await ddb.send(
      new ScanCommand({
        TableName: EMP_TABLE
      })
    );

    const employees = empResult.Items || [];

    /* =====================================================
       2️⃣ GET ALL APPROVED LEAVES
       (NO MONTH FILTER ANYMORE)
    ===================================================== */

    const leaveResult = await ddb.send(
      new ScanCommand({
        TableName: LEAVE_TABLE,
        FilterExpression: "#s = :s",
        ExpressionAttributeNames: {
          "#s": "status"
        },
        ExpressionAttributeValues: {
          ":s": "APPROVED"
        }
      })
    );

    const approvedLeaves = leaveResult.Items || [];

    /* =====================================================
       3️⃣ BUILD LOP MAP PER EMPLOYEE (MONTH-WISE)
    ===================================================== */

    const lopMap = {};

    for (const leave of approvedLeaves) {

      const monthlyLOP = calculateMonthlyLOP(leave, month);

      if (monthlyLOP <= 0) continue;

      const empId = leave.EmployeeID;

      lopMap[empId] = (lopMap[empId] || 0) + monthlyLOP;
    }

    /* =====================================================
       4️⃣ BUILD FINAL RESULT
    ===================================================== */

    const result = [];

    for (const emp of employees) {

      const doj = new Date(emp.dateOfJoining);
      const exitDate = emp.exitDate ? new Date(emp.exitDate) : null;

      // Must overlap selected month
      if (doj > monthEnd) continue;
      if (exitDate && exitDate < monthStart) continue;

      const effectiveStart =
        doj > monthStart ? doj : monthStart;

      const effectiveEnd =
        exitDate && exitDate < monthEnd
          ? exitDate
          : monthEnd;

      const totalDays = diffDays(
        effectiveStart,
        effectiveEnd
      );

      const lopDays = Number((lopMap[emp.EmployeeID] || 0).toFixed(2));

      const presentDays = Number((totalDays - lopDays).toFixed(2));

      result.push({
        EmployeeID: emp.EmployeeID,
        employeeCode: emp.employeeCode || "",
        uan: emp.uan || "",
        name: emp.name || "",
        department: emp.department || "",
        branch: emp.branch || "",
        baseSalary: emp.baseSalary || 0,
        totalDays,
        presentDays,
        exitDate: emp.exitDate || null
      });
    }

    return response(200, result);

  } catch (error) {
    console.error(error);
    return response(500, { message: "Internal Server Error" });
  }
};