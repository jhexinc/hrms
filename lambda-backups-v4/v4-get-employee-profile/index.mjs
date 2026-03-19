import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE = "v4-employees";

export const handler = async (event) => {
  try {
    /* ===========================
       AUTH CONTEXT (SAFE)
    =========================== */
    const claims =
      event.requestContext.authorizer?.claims ||
      event.requestContext.authorizer?.jwt?.claims;

    if (!claims?.sub) {
      throw new Error("Unauthorized");
    }

    const employeeID = claims.sub;

    /* ===========================
       FETCH EMPLOYEE
    =========================== */
    const result = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { EmployeeID: employeeID },
      })
    );

    const item = result.Item;

    if (!item) {
      const timestamp = new Date().toISOString();
    
      const placeholder = {
        EmployeeID: employeeID,       // still sub for now
        Email: claims.email,
        registrationComplete: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    
      await ddb.send(
        new PutCommand({
          TableName: TABLE,
          Item: placeholder,
          ConditionExpression: "attribute_not_exists(EmployeeID)",
        })
      );
    
      return response(200, {
        employeeID,
        registrationComplete: false,
      });
    }
    

    /* ===========================
       NORMALIZE FOR FRONTEND
    =========================== */
    const normalized = {
      // identifiers
      employeeID,
      employeeCode: item.employeeCode ?? null,

      isTL: item.isTL === true,

      // basic profile
      email: item.email ?? item.Email ?? null,
      name: item.name ?? item.Name ?? null,
      dob: item.dob ?? item.DOB ?? null,
      gender: item.gender ?? item.Gender ?? null,
      address: item.address ?? item.Address ?? null,

      // employment
      department: item.department ?? item.Department ?? null,
      designation: item.designation ?? item.Designation ?? null,
      employmentStatus:
        item.employmentStatus ??
        item.EmploymentStatus ??
        "REGULAR",

      branch: item.branch ?? null,
      dateOfJoining: item.dateOfJoining ?? null,

      // banking (single source of truth)
      bankAccount:
        item.bankAccount ??
        item.BankAccount ??
        null,

      // statutory
      pan: item.pan ?? item.PAN ?? null,
      uan: item.uan ?? item.UAN ?? null,

      // leave & salary (read-only for employee)
      leaveBalance:
        item.leaveBalance ??
        item.LeaveBalance ??
        null,

      baseSalary:
        item.baseSalary ??
        item.BaseSalary ??
        null,

      // system flags
      registrationComplete:
        item.registrationComplete ??
        item.RegistrationComplete ??
        false,

      // audit
      createdAt:
        item.createdAt ??
        item.CreatedAt ??
        null,

      updatedAt:
        item.updatedAt ??
        item.UpdatedAt ??
        null,
    };

    return response(200, normalized);
  } catch (err) {
    console.error("PROFILE ERROR:", err);

    return response(500, {
      error: err.message || "Internal server error",
    });
  }
};

/* ===========================
   RESPONSE HELPER
=========================== */
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
