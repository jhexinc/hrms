// utils/pdf.ts – Perfect payslip generator using HTML + window.print()

export function generateSalaryPDF(slip: any) {
  const normalizedSlip = normalizeSlip(slip);
  const html = buildPayslipHTML(normalizedSlip);

  const printWindow = window.open(
    "about:blank",
    "_blank",
    "width=800,height=1000",
  );

  if (!printWindow) {
    alert("Popup blocked! Allow popups to download salary slip.");
    return;
  }

  setTimeout(() => {
    printWindow.document.write(html);
    printWindow.document.close();
  }, 20);

  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

/** Normalize slip values so nothing is undefined */
function normalizeSlip(slip: any) {
  const basic = Number(slip.basic ?? 0);
  const hra = Number(slip.hra ?? 0);
  const fuelAllowance = Number(slip.fuelAllowance ?? 0);

  // Backend sends performanceBonus, PDF expects bonus
  const bonus = Number(slip.bonus ?? slip.performanceBonus ?? 0);

  const pfAmount = Number(slip.pfAmount ?? 0);
  const professionalTax = Number(slip.professionalTax ?? 0);
  const absentDeduction = Number(slip.absentDeduction ?? 0);

  const totalEarning = basic + hra + fuelAllowance + bonus;

  const otherDeductions = Array.isArray(slip.otherDeductions)
    ? slip.otherDeductions
    : [];

  const otherDeductionsTotal = otherDeductions.reduce(
    (sum: number, d: any) => sum + Number(d.amount || 0),
    0,
  );

  const totalDeduction =
    pfAmount + professionalTax + absentDeduction + otherDeductionsTotal;

  const netSalary = Number(slip.netSalary ?? 0);

  return {
    ...slip,

    // Earnings
    basic,
    hra,
    fuelAllowance,
    bonus,

    // Deductions
    pfAmount,
    professionalTax,
    absentDeduction,
    otherDeductions,
    otherDeductionsTotal,

    // Totals
    totalEarning,
    totalDeduction,

    // Attendance
    daysInMonth: Number(slip.daysInMonth ?? 30),
    lopDays: Number(slip.lopDays ?? 0),
    daysPresent: Number(
      slip.daysPresent ?? (slip.daysInMonth ?? 30) - (slip.lopDays ?? 0),
    ),

    // Net
    netSalary,
    amountInWords: convertToWords(netSalary),
  };
}

export function buildPayslipHTML(slip: any) {
  const earningRows = [
    { label: "Basic", amount: slip.basic },
    { label: "HRA", amount: slip.hra },
    { label: "Fuel Allowance", amount: slip.fuelAllowance },
  ];

  if (slip.bonus > 0) {
    earningRows.push({
      label: "Performance Incentive",
      amount: slip.bonus,
    });
  }

  const deductionRows = [
    { label: "PF", amount: slip.pfAmount },
    { label: "PT", amount: slip.professionalTax },
  ];

  if (slip.absentDeduction > 0) {
    deductionRows.push({
      label: "Absent Deduction",
      amount: slip.absentDeduction,
    });
  }

  slip.otherDeductions?.forEach((d: any) => {
    deductionRows.push({
      label: d.type,
      amount: d.amount,
    });
  });

  const totalEarningCalc = earningRows.reduce(
    (s, r) => s + Number(r.amount || 0),
    0,
  );

  const totalDeductionCalc = deductionRows.reduce(
    (s, r) => s + Number(r.amount || 0),
    0,
  );

  // const netPayCalc = totalEarningCalc - totalDeductionCalc;

  // const rowCount = Math.max(earningRows.length, deductionRows.length);

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Payslip</title>

<style>
  body {
    font-family: Arial, Helvetica, sans-serif;
    margin: 0;
    padding: 40px;
    background: #fff;
  }

  .payslip-container {
    width: 100%;
    border: 1px solid #000;
    padding: 20px 25px;
    box-sizing: border-box;
  }

  /* ---------- HEADER ---------- */

  .header {
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  }

  .logo {
    width: 150px;
    height: auto;
    margin-right: 12px;
  }

  .company-details {
    flex: 1;
    text-align: center;
  }

  .header-title {
    font-size: 16px;
    font-weight: bold;
  }

  .sub-header {
    font-size: 12px;
    margin-top: 4px;
  }

  .title-box {
    border: 1px solid #000;
    padding: 6px;
    text-align: center;
    font-weight: bold;
    font-size: 13px;
    margin: 14px 0;
  }

  /* ---------- TABLE STYLES ---------- */

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }

  th, td {
    border: 1px solid #000;
    padding: 6px;
  }

  .no-border td {
    border: none;
    padding: 4px 0;
  }

  .right { text-align: right; }
  .center { text-align: center; }

  /* ---------- EARNINGS / DEDUCTIONS ---------- */

  .salary-split {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }

  .salary-box {
    width: 50%;
  }

  .salary-box th {
    background: #f2f2f2;
    text-align: left;
  }

  /* ---------- NET PAY ---------- */

  .netpay-title {
    margin-top: 12px;
    text-align: center;
    font-weight: bold;
    font-size: 13px;
  }

  .netpay-amount {
    text-align: center;
    font-size: 15px;
    font-weight: bold;
    margin-bottom: 10px;
  }

  .footer {
    font-size: 10px;
    text-align: center;
    margin-top: 10px;
  }
</style>

</head>

<body>

<div class="payslip-container">

  <!-- HEADER WITH LOGO -->
  <div class="header">
    <img src="/image.png" class="logo" alt="Company Logo" />
    <div class="company-details">
      <div class="header-title">JHEX Consulting LLP</div>
      <div class="sub-header">
        ${slip.branchAddress}
      </div>

    </div>
  </div>

  <div class="title-box">Pay slip for the month of ${slip.monthName}</div>

  <!-- EMPLOYEE INFO -->
  <table class="no-border">
    <tr>
      <td><strong>EMP Code:</strong> ${slip.employeeId}</td>
      <td><strong>Name:</strong> ${slip.employeeName}</td>
      <td><strong>DOJ:</strong> ${slip.joiningDate || "Not specified"}</td>
    </tr>
    <tr>
      <td><strong>Bank:</strong> ${slip.bankName}</td>
      <td><strong>A/C No:</strong> ${slip.accountNumber}</td>
      <td><strong>IFSC Code:</strong> ${slip.ifscCode}</td>
    </tr>
    <tr>
      <td><strong>Designation:</strong> ${slip.designation}</td>
      <td><strong>Department:</strong> ${slip.department}</td>
      <td><strong>Total Salary:</strong> ₹${slip.baseSalary.toLocaleString(
        "en-IN",
      )}</td>
    </tr>
    <tr>
      <td><strong>UAN No:</strong> ${slip.uanNumber}</td>
      <td><strong>PAN No:</strong> ${slip.panNumber}</td>
    </tr>
  </table>

  <!-- ATTENDANCE -->
  <div style="border: 1.5px solid #000; padding: 8px 10px; margin: 10px 0; background: #f9f9f9; border-radius: 3px;">
    <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; color: #333; border-bottom: 1px solid #ccc; padding-bottom: 4px;">Attendance Summary</div>
    <table class="no-border">
      <tr>
        <td><strong>Total Days:</strong> ${slip.daysInMonth}</td>
        <td><strong>Days Present:</strong> ${slip.daysPresent}</td>
        <td><strong>CL:</strong> ${slip.clDays ?? 0}</td>
        <td><strong>SL:</strong> ${slip.slDays ?? 0}</td>
        <td><strong>LOP:</strong> ${Number(slip.lopDays).toFixed(
          slip.lopDays % 1 === 0 ? 0 : 1
        )}</td>
      </tr>
    </table>
  </div>

  <!-- EARNINGS & DEDUCTIONS SPLIT -->
  <!-- EARNINGS & DEDUCTIONS SPLIT -->
<div class="salary-split">

  <table>
    <tr>
      <th>Earnings</th>
      <th class="right">Amount</th>
      <th>Deductions</th>
      <th class="right">Amount</th>
    </tr>

    ${(() => {
      const earningRows = [
        { label: "Basic", amount: slip.basic },
        { label: "HRA", amount: slip.hra },
        { label: "Fuel Allowance", amount: slip.fuelAllowance },
      ];

      if (slip.bonus > 0) {
        earningRows.push({
          label: "Performance Incentive",
          amount: slip.bonus,
        });
      }

      const deductionRows = [
        { label: "PF", amount: slip.pfAmount },
        { label: "PT", amount: slip.professionalTax },
      ];

      if (slip.absentDeduction > 0) {
        deductionRows.push({
          label: "Absent Deduction",
          amount: slip.absentDeduction,
        });
      }

      slip.otherDeductions?.forEach((d: { type: any; amount: any }) => {
        deductionRows.push({
          label: d.type,
          amount: d.amount,
        });
      });

      const rowCount = Math.max(earningRows.length, deductionRows.length);

      return Array.from({ length: rowCount })
        .map((_, i) => {
          const e = earningRows[i];
          const d = deductionRows[i];

          return `
            <tr>
              <td>${e ? e.label : ""}</td>
              <td class="right">
                ${e ? `₹${Number(e.amount).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}` : ""}
              </td>
              <td>${d ? d.label : ""}</td>
              <td class="right">
                ${d ? `₹${d.amount.toLocaleString("en-IN")}` : ""}
              </td>
            </tr>
          `;
        })
        .join("");
    })()}

    <tr>
  <th>Total Earnings</th>
  <th class="right">
    ₹${totalEarningCalc.toLocaleString("en-IN")}
  </th>
  <th>Total Deductions</th>
  <th class="right">
    ₹${totalDeductionCalc.toLocaleString("en-IN")}
  </th>
</tr>

  </table>

</div>


  <!-- NET PAY -->
  <div class="netpay-title">Net Pay</div>
 <div class="netpay-amount">
  ₹${slip.netSalary.toLocaleString("en-IN")}
</div>

  <div><strong>In words:</strong> ${convertToWords(slip.netSalary)}</div>


  <div class="footer">
    This is a system-generated pay slip. Signature not required.
  </div>

</div>

</body>
</html>
`;
}

/* Convert number to words (Indian format) */
function convertToWords(num: number): string {
  if (num === 0) return "ZERO ONLY";

  return convert(num).trim().toUpperCase() + " ONLY";
}

/* Internal recursive converter — NO 'ONLY' here */
function convert(num: number): string {
  const a = [
    "",
    "one ",
    "two ",
    "three ",
    "four ",
    "five ",
    "six ",
    "seven ",
    "eight ",
    "nine ",
    "ten ",
    "eleven ",
    "twelve ",
    "thirteen ",
    "fourteen ",
    "fifteen ",
    "sixteen ",
    "seventeen ",
    "eighteen ",
    "nineteen ",
  ];

  const b = [
    "",
    "",
    "twenty ",
    "thirty ",
    "forty ",
    "fifty ",
    "sixty ",
    "seventy ",
    "eighty ",
    "ninety ",
  ];

  let words = "";

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const tens = num % 100;

  if (crore > 0) words += convert(crore) + "crore ";
  if (lakh > 0) words += convert(lakh) + "lakh ";
  if (thousand > 0) words += convert(thousand) + "thousand ";
  if (hundred > 0) words += convert(hundred) + "hundred ";

  if (tens > 0) {
    if (tens < 20) {
      words += a[tens];
    } else {
      words += b[Math.floor(tens / 10)] + a[tens % 10];
    }
  }

  return words;
}
