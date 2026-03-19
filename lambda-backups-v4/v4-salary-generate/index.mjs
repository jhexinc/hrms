import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";

/* ===========================
   DYNAMODB CLIENT SETUP
=========================== */

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

/* ===========================
   TABLE NAMES
=========================== */

const EMP_TABLE = "v4-employees";
const SALARY_TABLE = "v4-salary-slips";
const LEAVE_TABLE = "v4-leave-requests";
const BONUS_TABLE = "v4-performance-bonus";
const DEDUCTION_TABLE = "v4-other-deductions";

/* ===========================
   HELPERS
=========================== */

function getDaysInMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

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

function isHR(event) {
  const claims =
    event.requestContext.authorizer?.claims ||
    event.requestContext.authorizer?.jwt?.claims;

  const groups = claims?.["cognito:groups"] || [];
  return groups.includes("v4-hr") || groups.includes("v4-admin");
}

/* ===========================
   MAIN HANDLER
=========================== */

export const handler = async (event) => {

  if (!isHR(event)) {
    return response(403, { error: "HR access only" });
  }

  const body = JSON.parse(event.body || "{}");
  const { employeeIDs, month } = body;

  if (!employeeIDs || !Array.isArray(employeeIDs) || employeeIDs.length === 0 || !month) {
    return response(400, {
      error: "employeeIDs array and month are required"
    });
  }

  const results = [];

  for (const employeeID of employeeIDs) {
    try {
      await generateSalaryForEmployee(employeeID, month);

      results.push({
        employeeID,
        status: "SUCCESS"
      });

    } catch (err) {

      console.error("Error for", employeeID, err);

      results.push({
        employeeID,
        status: "FAILED",
        error: err.message
      });
    }
  }

  return response(200, {
    message: "Salary generation completed",
    results
  });
};

async function generateSalaryForEmployee(employeeID, month) {

  const DAYS_IN_MONTH = getDaysInMonth(month);

  /* =====================================================
     HELPER: CALCULATE LEAVE ALLOCATION FOR TARGET MONTH
  ===================================================== */

  function calculateLeaveForMonth(leave, targetMonth) {

    let result = { LOP: 0, CL: 0, SL: 0, total: 0 };

    if (!leave.dailyBreakdown || leave.dailyBreakdown.length === 0) {
      return result;
    }

    for (const d of leave.dailyBreakdown) {

      if (!d.date || !d.date.startsWith(targetMonth)) continue;

      let value = 0;

      if (d.type === "FULL") value = 1;
      else if (d.type === "FIRST_HALF" || d.type === "SECOND_HALF")
        value = 0.5;

      result.total += value;

      const totalLeaveDays = leave.totalDays || 1;
      const ratio = value / totalLeaveDays;

      result.LOP += (leave.breakup?.LOP || 0) * ratio;
      result.CL  += (leave.breakup?.CPL || 0) * ratio;
      result.SL  += (leave.breakup?.SL  || 0) * ratio;
    }

    return result;
  }

  /* =====================================================
     LOAD EMPLOYEE
  ===================================================== */

  const empRes = await ddb.send(
    new GetCommand({
      TableName: EMP_TABLE,
      Key: { EmployeeID: employeeID }
    })
  );

  const emp = empRes.Item;

  if (!emp) throw new Error("Employee not found");
  if (!emp.baseSalary) throw new Error("Base salary not configured");

  const baseSalary = Number(emp.baseSalary);

  /* =====================================================
     FETCH ALL APPROVED LEAVES FOR EMPLOYEE
     (NOT FILTERING BY MONTH ANYMORE)
  ===================================================== */

  const leaveRes = await ddb.send(
    new QueryCommand({
      TableName: LEAVE_TABLE,
      IndexName: "GSI_LeaveByEmployee",
      KeyConditionExpression: "EmployeeID = :e",
      FilterExpression: "#s = :s",
      ExpressionAttributeNames: {
        "#s": "status"
      },
      ExpressionAttributeValues: {
        ":e": employeeID,
        ":s": "APPROVED"
      }
    })
  );

  let leaveBreakup = { LOP: 0, CL: 0, SL: 0 };
  let approvedLeaveDays = 0;

  for (const leave of leaveRes.Items || []) {
    const monthData = calculateLeaveForMonth(leave, month);

    leaveBreakup.LOP += monthData.LOP;
    leaveBreakup.CL  += monthData.CL;
    leaveBreakup.SL  += monthData.SL;

    approvedLeaveDays += monthData.total;
  }

  const totalLOPDays = Number(leaveBreakup.LOP.toFixed(2));
  const totalCLDays  = Number(leaveBreakup.CL.toFixed(2));
  const totalSLDays  = Number(leaveBreakup.SL.toFixed(2));

  /* =====================================================
     BONUS
  ===================================================== */

  const bonusRes = await ddb.send(
    new GetCommand({
      TableName: BONUS_TABLE,
      Key: { BonusID: `${employeeID}#${month}` }
    })
  );

  const performanceBonus = Number(
    bonusRes.Item?.BonusAmount || 0
  );

  /* =====================================================
     OTHER DEDUCTIONS
  ===================================================== */

  const deductionRes = await ddb.send(
    new GetCommand({
      TableName: DEDUCTION_TABLE,
      Key: { DeductionID: `${employeeID}#${month}` }
    })
  );

  const otherDeductions =
    deductionRes.Item?.Deductions || [];

  const otherDeductionsTotal = otherDeductions.reduce(
    (sum, d) => sum + Number(d.amount || 0),
    0
  );

  /* =====================================================
     SALARY CALCULATION FLOW
  ===================================================== */

  const perDaySalary = baseSalary / DAYS_IN_MONTH;

  const absentDeduction = Math.round(
    perDaySalary * totalLOPDays
  );

  const salaryAfterLOP =
    baseSalary - absentDeduction;

  /* ---------- PF & PT ---------- */

  let pfAmount = 0;
  let professionalTax = 0;

  // Only calculate PF if employee has pfApplicable set to true
  const pfApplicable = emp.pfApplicable !== false; // default true for backward compat

  if (pfApplicable) {
    if (baseSalary >= 10000 && baseSalary <= 11999) {
      pfAmount = 0;
      professionalTax = 0;
    }
    else if (baseSalary == 12000) {
      pfAmount = Math.round(salaryAfterLOP * 0.12);
      professionalTax = 0;
    }
    else if (baseSalary > 12000 && baseSalary <= 29999) {
      pfAmount = Math.round(salaryAfterLOP * 0.12);
      professionalTax = 200;
    }
    else if (baseSalary >= 30000) {
      pfAmount = 3600;
      professionalTax = 200;
    }
  } else {
    // PF not applicable — only apply Professional Tax based on salary
    if (baseSalary > 12000 && baseSalary <= 29999) {
      professionalTax = 200;
    }
    else if (baseSalary >= 30000) {
      professionalTax = 200;
    }
  }

  const salaryAfterStatutory =
    salaryAfterLOP - pfAmount - professionalTax;

  const salaryAfterAllDeductions =
    salaryAfterStatutory - otherDeductionsTotal;

  /* =====================================================
     COMPONENT BREAKDOWN
  ===================================================== */

  const basic = Number(
    (salaryAfterAllDeductions * 0.70).toFixed(2)
  );

  const hra = Number(
    (basic * 0.30).toFixed(2)
  );

  const fuelAllowance = Number(
    (salaryAfterAllDeductions - basic - hra).toFixed(2)
  );

  const totalEarning =
    basic + hra + fuelAllowance + performanceBonus;

  const totalDeduction =
    absentDeduction +
    pfAmount +
    professionalTax +
    otherDeductionsTotal;

  const netSalary =
    salaryAfterAllDeductions + performanceBonus;

  /* =====================================================
     SAVE / UPSERT SALARY SLIP
  ===================================================== */

  const slipID = `${employeeID}#${month}`;

  const slip = {
    SlipID: slipID,
    EmployeeID: employeeID,
    Month: month,

    employeeCode: emp.employeeCode,
    employeeName: emp.name,
    department: emp.department,
    designation: emp.designation,
    joiningDate: emp.dateOfJoining,
    branch: emp.branch,

    pan: emp.pan || null,
    uan: emp.uan || null,
    bankAccount: emp.bankAccount,

    baseSalary,
    basic,
    hra,
    fuelAllowance,
    performanceBonus,

    pfAmount,
    professionalTax,
    absentDeduction,
    otherDeductions,
    otherDeductionsTotal,

    totalEarning,
    totalDeduction,
    netSalary,

    approvedLeaveDays: Number(approvedLeaveDays.toFixed(2)),
    clDays: totalCLDays,
    slDays: totalSLDays,
    lopDays: totalLOPDays,
    daysInMonth: DAYS_IN_MONTH,

    generatedAt: new Date().toISOString(),
    generatedBy: "HR",
    updatedAt: new Date().toISOString()
  };

  const existingSlip = await ddb.send(
    new GetCommand({
      TableName: SALARY_TABLE,
      Key: { SlipID: slipID }
    })
  );

  if (existingSlip.Item) {
    await ddb.send(
      new PutCommand({
        TableName: SALARY_TABLE,
        Item: {
          ...existingSlip.Item,
          ...slip,
          createdAt:
            existingSlip.Item.createdAt ||
            existingSlip.Item.generatedAt,
          updatedAt: new Date().toISOString()
        }
      })
    );
  } else {
    await ddb.send(
      new PutCommand({
        TableName: SALARY_TABLE,
        Item: {
          ...slip,
          createdAt: new Date().toISOString()
        }
      })
    );
  }
}