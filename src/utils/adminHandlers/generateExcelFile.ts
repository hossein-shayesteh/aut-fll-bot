import * as XLSX from "xlsx";
import { Registration } from "../../database/models/Registration";
import { Event } from "../../database/models/Event";

export function generateExcelFile(
  event: Event,
  registrants: Registration[]
): Buffer {
  // Set column widths
  const eventInfoColumnWidths = [{ wch: 15 }, { wch: 25 }];
  const registrantsColumnWidths = [
    { wch: 5 }, // No.
    { wch: 15 }, // First Name
    { wch: 15 }, // Last Name
    { wch: 15 }, // Status
    { wch: 15 }, // Phone Number
    { wch: 15 }, // Student ID
    { wch: 15 }, // Payment Fee
    { wch: 25 }, // Registration Date
  ];
  const summaryColumnWidths = [{ wch: 25 }, { wch: 15 }];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();

  // Add event information at the top
  const eventInfo = [
    ["Event Information"],
    ["Name", event.name],
    ["Date", event.eventDate.toLocaleString()],
    ["Location", event.location || "N/A"],
    ["Capacity", event.capacity.toString()],
    ["Status", event.status],
    ["Regular Fee", `$${event?.fee || 0}`],
    ["University Fee", `$${event?.universityFee || event?.fee || 0}`],
  ];

  // Create a separate worksheet for event info
  const infoWorksheet = XLSX.utils.aoa_to_sheet(eventInfo);
  infoWorksheet["!cols"] = eventInfoColumnWidths;

  // Add worksheets to workbook
  XLSX.utils.book_append_sheet(workbook, infoWorksheet, "Event Info");

  // Format data for Registration Date
  const data = registrants.map((reg, index) => {
    const user = reg.user;
    const hasValidStudentId = user?.studentId && user.studentId !== "0";

    return {
      "No.": index + 1,
      "First Name": user.firstName,
      "Last Name": user.lastName || "",
      Status: reg.status,
      "Phone Number": user.phoneNumber || "N/A",
      "Student ID": user.studentId || "N/A",
      "Payment Fee": hasValidStudentId ? event.universityFee : event.fee,
      "Registration Date": reg.registrationDate.toLocaleString(),
    };
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet["!cols"] = registrantsColumnWidths;

  // Add worksheets to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Registrants");

  // Generate summary statistics
  const approvedCount = registrants.filter(
    (r) => r.status === "approved"
  ).length;
  const pendingCount = registrants.filter((r) => r.status === "pending").length;
  const rejectedCount = registrants.filter(
    (r) => r.status === "rejected"
  ).length;
  const cancelledCount = registrants.filter(
    (r) => r.status === "cancelled"
  ).length;

  // Calculate financial summary
  const approvedRegistrants = registrants.filter(
    (r) => r.status === "approved"
  );
  const totalFees = approvedRegistrants.reduce((sum, reg) => {
    const user = reg.user;
    const hasValidStudentId = user?.studentId && user.studentId !== "0";
    const fee = hasValidStudentId ? event.universityFee : event.fee;
    return sum + fee;
  }, 0);

  const summaryData = [
    ["Registration Summary"],
    ["Total Registrants", registrants.length.toString()],
    ["Approved", approvedCount.toString()],
    ["Pending", pendingCount.toString()],
    ["Rejected", rejectedCount.toString()],
    ["Cancelled", cancelledCount.toString()],
    [""],
    ["Financial Summary"],
    ["Total Expected Revenue", `$${totalFees.toFixed(2)}`],
  ];

  const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWorksheet["!cols"] = summaryColumnWidths;

  XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Summary");

  // Convert to buffer
  const excelBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  return excelBuffer;
}
