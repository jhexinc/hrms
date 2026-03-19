import { mapSlipToPDF } from "./mapSlipToPDF";
import { buildPayslipHTML } from "./pdf";

export function downloadPayslip(slip: any) {
  const mapped = mapSlipToPDF(slip);
  const html = buildPayslipHTML(mapped);

  const fileName = `Payslip_${mapped.employeeName
    .replace(/\s+/g, "-")}_${slip.Month}.pdf`;

  // Create hidden iframe
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    iframe.contentWindow!.document.title = fileName;
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();

    // Cleanup after print dialog opens
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };
}

// utils/downloadPayslip.ts
// import html2pdf from "html2pdf.js";
// import { buildPayslipHTML } from "@/utils/pdf";

// export function downloadPayslip(slip: any) {
//   const element = document.createElement("div");
//   element.innerHTML = buildPayslipHTML(slip);

//   html2pdf()
//     .from(element)
//     .set({
//       margin: 10,
//       filename: `Payslip_${slip.employeeName || "Employee"}_${slip.monthName}.pdf`,
//       html2canvas: {
//         scale: 2,
//         useCORS: true,
//       },
//       jsPDF: {
//         unit: "mm",
//         format: "a4",
//         orientation: "portrait",
//       },
//     })
//     .save();
// }
