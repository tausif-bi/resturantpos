import ExcelJS from "exceljs";
import path from "path";

const HEADER_FILL: ExcelJS.FillPattern = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1A1C1C" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: "FFFFFFFF" },
  size: 11,
  name: "Calibri",
};
const BODY_FONT: Partial<ExcelJS.Font> = { size: 10, name: "Calibri" };

function styleHeaders(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFAC2D00" } },
    };
  });
  headerRow.height = 30;
  sheet.views = [{ state: "frozen", ySplit: 1, xSplit: 0 }];
}

function applyStatusColor(cell: ExcelJS.Cell, status: string) {
  const colors: Record<string, string> = {
    Done: "FFE8F5E9",
    "In Progress": "FFFFF3E0",
    "Not Started": "FFF5F5F5",
    Blocked: "FFFFEBEE",
    Testing: "FFE3F2FD",
    "In Review": "FFEDE7F6",
    "On Hold": "FFFCE4EC",
  };
  const textColors: Record<string, string> = {
    Done: "FF2E7D32",
    "In Progress": "FFE65100",
    "Not Started": "FF757575",
    Blocked: "FFC62828",
    Testing: "FF1565C0",
    "In Review": "FF6A1B9A",
    "On Hold": "FFC2185B",
  };
  if (colors[status]) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors[status] } };
    cell.font = { ...BODY_FONT, bold: true, color: { argb: textColors[status] } };
  }
}

function applyPriorityColor(cell: ExcelJS.Cell, priority: string) {
  const colors: Record<string, string> = {
    "P0 - Critical": "FFFFEBEE",
    "P1 - High": "FFFFF3E0",
    "P2 - Medium": "FFFFF9C4",
    "P3 - Low": "FFE8F5E9",
  };
  const textColors: Record<string, string> = {
    "P0 - Critical": "FFC62828",
    "P1 - High": "FFE65100",
    "P2 - Medium": "FFF57F17",
    "P3 - Low": "FF2E7D32",
  };
  if (colors[priority]) {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: colors[priority] } };
    cell.font = { ...BODY_FONT, bold: true, color: { argb: textColors[priority] } };
  }
}

async function main() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RestroPOS";
  workbook.created = new Date();

  // ═══════════════════ SHEET 1: TASK TRACKER ═══════════════════
  const taskSheet = workbook.addWorksheet("Task Tracker", { properties: { tabColor: { argb: "FFAC2D00" } } });

  taskSheet.columns = [
    { header: "Task ID", key: "taskId", width: 10 },
    { header: "Module", key: "module", width: 16 },
    { header: "Task Title", key: "title", width: 40 },
    { header: "Description", key: "description", width: 55 },
    { header: "Priority", key: "priority", width: 14 },
    { header: "Phase", key: "phase", width: 22 },
    { header: "Status", key: "status", width: 14 },
    { header: "Assigned To", key: "assignedTo", width: 16 },
    { header: "Reviewer", key: "reviewer", width: 16 },
    { header: "Start Date", key: "startDate", width: 13 },
    { header: "Due Date", key: "dueDate", width: 13 },
    { header: "Completed", key: "completedDate", width: 13 },
    { header: "Est. Hours", key: "estHours", width: 11 },
    { header: "Actual Hours", key: "actualHours", width: 12 },
    { header: "Dependencies", key: "dependencies", width: 18 },
    { header: "Blocked By", key: "blockedBy", width: 18 },
    { header: "Comments / Updates", key: "comments", width: 50 },
    { header: "Last Updated", key: "lastUpdated", width: 13 },
    { header: "Updated By", key: "updatedBy", width: 14 },
  ];

  const tasks = [
    // Phase 1: Foundation (DONE)
    { taskId: "RP-001", module: "Infrastructure", title: "Initialize Next.js project", description: "Create Next.js app with TypeScript, Tailwind CSS, App Router, src directory", priority: "P0 - Critical", phase: "Phase 1 - Foundation", status: "Done", assignedTo: "", reviewer: "", estHours: 1, comments: "Next.js 16 with Turbopack initialized" },
    { taskId: "RP-002", module: "Infrastructure", title: "Set up Prisma with full schema (28 models)", description: "Define all models: Tenant, Restaurant, User, Category, MenuItem, Order, KOT, Payment, Inventory, etc.", priority: "P0 - Critical", phase: "Phase 1 - Foundation", status: "Done", assignedTo: "", reviewer: "", estHours: 4, comments: "28 models, 12 enums, all indexes defined" },
    { taskId: "RP-003", module: "Infrastructure", title: "Install and configure shadcn/ui", description: "Initialize shadcn/ui, install 24+ components (button, dialog, table, card, sidebar, etc.)", priority: "P1 - High", phase: "Phase 1 - Foundation", status: "Done", assignedTo: "", reviewer: "", estHours: 1, comments: "24 UI components installed" },
    { taskId: "RP-004", module: "Auth", title: "Implement NextAuth with credentials + roles", description: "CredentialsProvider, JWT sessions, role/tenantId augmentation, middleware auth guard", priority: "P0 - Critical", phase: "Phase 1 - Foundation", status: "Done", assignedTo: "", reviewer: "", estHours: 3, comments: "6 roles, 15 permissions, JWT 24h sessions" },
    { taskId: "RP-005", module: "Auth", title: "Build login and register pages", description: "Login form, register form with restaurant creation, error handling, toast notifications", priority: "P0 - Critical", phase: "Phase 1 - Foundation", status: "Done", assignedTo: "", reviewer: "", estHours: 2, comments: "Stitch design applied" },
    { taskId: "RP-006", module: "Menu", title: "Build menu management CRUD", description: "Categories, items, variants, add-ons, tax config CRUD with server actions and Zod validation", priority: "P0 - Critical", phase: "Phase 1 - Foundation", status: "Done", assignedTo: "", reviewer: "", estHours: 6, comments: "Full CRUD with 12-col grid layout, edit dialogs" },
    { taskId: "RP-007", module: "Infrastructure", title: "Create seed script with demo data", description: "Seed tenant, restaurant, 5 users, 21 menu items, 12 tables, 3 customers, tax configs", priority: "P1 - High", phase: "Phase 1 - Foundation", status: "Done", assignedTo: "", reviewer: "", estHours: 2, comments: "All demo accounts use password: admin123" },
    { taskId: "RP-008", module: "Infrastructure", title: "Apply Stitch design system", description: "Terracotta color tokens, Manrope/Inter fonts, Material Symbols icons, glass panels, gradients", priority: "P1 - High", phase: "Phase 1 - Foundation", status: "Done", assignedTo: "", reviewer: "", estHours: 4, comments: "Full design system from Google Stitch applied" },

    // Phase 2: POS & Billing (DONE)
    { taskId: "RP-009", module: "POS", title: "Build POS floor map with real table data", description: "Table grid from DB, status indicators (available/occupied), table card UI with order info", priority: "P0 - Critical", phase: "Phase 2 - POS & Billing", status: "Done", assignedTo: "", reviewer: "", estHours: 5, comments: "4-col bento grid, real-time table status" },
    { taskId: "RP-010", module: "POS", title: "Implement Tap to Seat (create order)", description: "Click available table → create order in DB → set table OCCUPIED → show order sidebar", priority: "P0 - Critical", phase: "Phase 2 - POS & Billing", status: "Done", assignedTo: "", reviewer: "", estHours: 3, comments: "Transaction-safe with concurrent seat protection" },
    { taskId: "RP-011", module: "POS", title: "Build menu selector for adding items", description: "Category tabs, item grid, variant selection, add to order via server action", priority: "P0 - Critical", phase: "Phase 2 - POS & Billing", status: "Done", assignedTo: "", reviewer: "", estHours: 4, comments: "Shows all 21 items with real prices" },
    { taskId: "RP-012", module: "POS", title: "Order sidebar with qty controls + totals", description: "Item list, +/- qty buttons, auto-recalculate subtotal/tax/discount/total", priority: "P0 - Critical", phase: "Phase 2 - POS & Billing", status: "Done", assignedTo: "", reviewer: "", estHours: 4, comments: "GST auto-calculated, unsent items marked" },
    { taskId: "RP-013", module: "POS", title: "Implement tax calculation engine", description: "GST calculation (CGST+SGST), inclusive/exclusive support, per-item tax breakdown", priority: "P0 - Critical", phase: "Phase 2 - POS & Billing", status: "Done", assignedTo: "", reviewer: "", estHours: 2, comments: "src/lib/tax.ts with full recalculation" },
    { taskId: "RP-014", module: "POS", title: "KOT generation and send to kitchen", description: "Create KOT record, link unsent items, generate KOT number, update order status", priority: "P0 - Critical", phase: "Phase 2 - POS & Billing", status: "Done", assignedTo: "", reviewer: "", estHours: 3, comments: "KOT-NNN sequential numbering" },
    { taskId: "RP-015", module: "POS", title: "Payment processing (Cash/Card/UPI)", description: "Create payment record, check if fully paid, auto-complete order, free table", priority: "P0 - Critical", phase: "Phase 2 - POS & Billing", status: "Done", assignedTo: "", reviewer: "", estHours: 3, comments: "Supports split payments" },
    { taskId: "RP-016", module: "Kitchen", title: "Build kitchen display with live KOT cards", description: "Horizontal scrolling KOT cards, status transitions, live timers, station filters, polling", priority: "P0 - Critical", phase: "Phase 2 - POS & Billing", status: "Done", assignedTo: "", reviewer: "", estHours: 5, comments: "10-sec polling, LATE detection >15min" },
    { taskId: "RP-017", module: "Settings", title: "Build table management CRUD", description: "Add/edit/delete tables with name, capacity, floor. Grouped by floor with status badges", priority: "P1 - High", phase: "Phase 2 - POS & Billing", status: "Done", assignedTo: "", reviewer: "", estHours: 2, comments: "Dialog-based CRUD" },

    // Dashboard & Reports (DONE)
    { taskId: "RP-018", module: "Dashboard", title: "Build dynamic dashboard with real metrics", description: "Today's sales, order count, active tables, top seller, category mix from DB", priority: "P1 - High", phase: "Phase 5 - Reports", status: "Done", assignedTo: "", reviewer: "", estHours: 3, comments: "Auto-updates after each order" },
    { taskId: "RP-019", module: "Reports", title: "Build reports page with real data", description: "Monthly sales chart, top items table, staff performance, category breakdown", priority: "P1 - High", phase: "Phase 5 - Reports", status: "Done", assignedTo: "", reviewer: "", estHours: 4, comments: "4 report queries with aggregation" },

    // Phase 3: Inventory (NOT STARTED)
    { taskId: "RP-020", module: "Inventory", title: "Build stock items CRUD", description: "Add/edit/delete stock items with name, SKU, unit, current stock, low stock alert, cost per unit", priority: "P1 - High", phase: "Phase 3 - Inventory", status: "Not Started", assignedTo: "", reviewer: "", estHours: 4, comments: "" },
    { taskId: "RP-021", module: "Inventory", title: "Build recipe builder (ingredient mapping)", description: "Link stock items to menu items with quantities. Auto-calculate ingredient usage per order", priority: "P1 - High", phase: "Phase 3 - Inventory", status: "Not Started", assignedTo: "", reviewer: "", estHours: 5, comments: "" },
    { taskId: "RP-022", module: "Inventory", title: "Implement auto stock deduction on order", description: "When order completed, deduct ingredients based on recipe mapping. Create stock movements", priority: "P0 - Critical", phase: "Phase 3 - Inventory", status: "Not Started", assignedTo: "", reviewer: "", estHours: 4, dependencies: "RP-021", comments: "" },
    { taskId: "RP-023", module: "Inventory", title: "Build purchase order workflow", description: "Create PO, mark received, auto-update stock. DRAFT → ORDERED → RECEIVED status flow", priority: "P2 - Medium", phase: "Phase 3 - Inventory", status: "Not Started", assignedTo: "", reviewer: "", estHours: 5, comments: "" },
    { taskId: "RP-024", module: "Inventory", title: "Low stock alerts + wastage tracking", description: "Dashboard alerts when stock below threshold. Wastage entry form with reasons", priority: "P2 - Medium", phase: "Phase 3 - Inventory", status: "Not Started", assignedTo: "", reviewer: "", estHours: 3, comments: "" },

    // Phase 4: Online Orders (NOT STARTED)
    { taskId: "RP-025", module: "Online Orders", title: "Build customer-facing menu page (/[slug])", description: "Public page with restaurant branding, browsable menu, veg/non-veg filters, cart", priority: "P1 - High", phase: "Phase 4 - Online Orders", status: "Not Started", assignedTo: "", reviewer: "", estHours: 6, comments: "" },
    { taskId: "RP-026", module: "Online Orders", title: "Build cart + checkout flow", description: "Add to cart, delivery/takeaway toggle, customer name+phone, address for delivery", priority: "P1 - High", phase: "Phase 4 - Online Orders", status: "Not Started", assignedTo: "", reviewer: "", estHours: 5, dependencies: "RP-025", comments: "" },
    { taskId: "RP-027", module: "Online Orders", title: "Build order tracking page", description: "Real-time order status updates via SSE for customers after placing order", priority: "P2 - Medium", phase: "Phase 4 - Online Orders", status: "Not Started", assignedTo: "", reviewer: "", estHours: 4, dependencies: "RP-026", comments: "" },
    { taskId: "RP-028", module: "Customers", title: "Build customer management pages", description: "Customer list, detail view with order history, total spend, contact info", priority: "P2 - Medium", phase: "Phase 4 - Online Orders", status: "Not Started", assignedTo: "", reviewer: "", estHours: 4, comments: "" },

    // Phase 6: SaaS & Production (NOT STARTED)
    { taskId: "RP-029", module: "Infrastructure", title: "Integrate Stripe subscription billing", description: "Stripe checkout, webhook handler, plan enforcement, subscription management page", priority: "P1 - High", phase: "Phase 6 - SaaS", status: "Not Started", assignedTo: "", reviewer: "", estHours: 8, comments: "" },
    { taskId: "RP-030", module: "Infrastructure", title: "Build multi-outlet management", description: "Add/switch outlets for chain owners. Outlet-specific settings and data isolation", priority: "P2 - Medium", phase: "Phase 6 - SaaS", status: "Not Started", assignedTo: "", reviewer: "", estHours: 6, comments: "" },
    { taskId: "RP-031", module: "Infrastructure", title: "Build super admin panel", description: "Tenant listing, subscription overview, platform-wide analytics for platform operators", priority: "P2 - Medium", phase: "Phase 6 - SaaS", status: "Not Started", assignedTo: "", reviewer: "", estHours: 5, comments: "" },
    { taskId: "RP-032", module: "Infrastructure", title: "Bill printing (thermal printer)", description: "HTML thermal-printer layout (58/80mm) via iframe + window.print(). KOT and bill formats", priority: "P2 - Medium", phase: "Phase 2 - POS & Billing", status: "Not Started", assignedTo: "", reviewer: "", estHours: 3, comments: "" },
    { taskId: "RP-033", module: "Reports", title: "PDF report export", description: "Generate downloadable PDF for sales reports, daily summaries", priority: "P3 - Low", phase: "Phase 5 - Reports", status: "Not Started", assignedTo: "", reviewer: "", estHours: 3, comments: "" },
    { taskId: "RP-034", module: "Infrastructure", title: "Real-time updates via SSE", description: "Replace kitchen polling with Server-Sent Events for instant KOT and order updates", priority: "P3 - Low", phase: "Phase 6 - SaaS", status: "Not Started", assignedTo: "", reviewer: "", estHours: 5, comments: "" },
  ];

  for (const task of tasks) {
    const row = taskSheet.addRow(task);
    row.eachCell((cell) => { cell.font = BODY_FONT; cell.alignment = { vertical: "middle", wrapText: true }; });
    const statusCell = row.getCell("status");
    applyStatusColor(statusCell, task.status);
    const priorityCell = row.getCell("priority");
    applyPriorityColor(priorityCell, task.priority);
  }

  styleHeaders(taskSheet);
  taskSheet.autoFilter = { from: "A1", to: "S1" };

  // ═══════════════════ SHEET 2: SPRINT LOG ═══════════════════
  const sprintSheet = workbook.addWorksheet("Sprint Log", { properties: { tabColor: { argb: "FF005EA2" } } });

  sprintSheet.columns = [
    { header: "Week", key: "week", width: 24 },
    { header: "Task ID", key: "taskId", width: 10 },
    { header: "Person", key: "person", width: 16 },
    { header: "Status Update", key: "statusUpdate", width: 55 },
    { header: "Blockers", key: "blockers", width: 35 },
    { header: "Next Steps", key: "nextSteps", width: 40 },
    { header: "Hours Spent", key: "hours", width: 12 },
  ];

  const sprintData = [
    { week: "Week 1: Apr 7 - Apr 11", taskId: "RP-001", person: "", statusUpdate: "Project initialized with Next.js 16, Prisma schema defined, shadcn/ui configured", blockers: "None", nextSteps: "Implement auth and menu CRUD", hours: 12 },
    { week: "Week 1: Apr 7 - Apr 11", taskId: "RP-004", person: "", statusUpdate: "NextAuth configured with credentials, 6 roles, JWT sessions", blockers: "None", nextSteps: "Build login/register pages", hours: 3 },
    { week: "Week 2: Apr 14 - Apr 18", taskId: "RP-009", person: "", statusUpdate: "POS floor map built with real table data, order sidebar, menu selector", blockers: "Prisma Decimal serialization issue - fixed with serialize() helper", nextSteps: "Wire KOT and payment actions", hours: 16 },
    { week: "Week 2: Apr 14 - Apr 18", taskId: "RP-016", person: "", statusUpdate: "Kitchen display built with live timers, status transitions, station filters", blockers: "None", nextSteps: "Test full billing flow", hours: 5 },
  ];

  for (const row of sprintData) {
    const r = sprintSheet.addRow(row);
    r.eachCell((cell) => { cell.font = BODY_FONT; cell.alignment = { vertical: "middle", wrapText: true }; });
  }

  styleHeaders(sprintSheet);

  // ═══════════════════ SHEET 3: BUG LOG ═══════════════════
  const bugSheet = workbook.addWorksheet("Bug Log", { properties: { tabColor: { argb: "FFBA1A1A" } } });

  bugSheet.columns = [
    { header: "Bug ID", key: "bugId", width: 10 },
    { header: "Page / Module", key: "module", width: 16 },
    { header: "Title", key: "title", width: 40 },
    { header: "Steps to Reproduce", key: "steps", width: 50 },
    { header: "Expected vs Actual", key: "expectedActual", width: 45 },
    { header: "Severity", key: "severity", width: 12 },
    { header: "Status", key: "status", width: 12 },
    { header: "Assigned To", key: "assignedTo", width: 16 },
    { header: "Reported By", key: "reportedBy", width: 14 },
    { header: "Reported Date", key: "reportedDate", width: 13 },
    { header: "Fixed Date", key: "fixedDate", width: 13 },
    { header: "Comments", key: "comments", width: 40 },
  ];

  const bugs = [
    { bugId: "BUG-001", module: "POS", title: "Prisma Decimal serialization errors", steps: "1. Open POS page 2. Tap to Seat on any table", expectedActual: "Expected: No errors. Actual: Console shows 'Only plain objects can be passed'", severity: "Major", status: "Fixed", assignedTo: "", reportedBy: "Playwright", reportedDate: "2026-03-26", fixedDate: "2026-03-26", comments: "Added serialize() wrapper to all server action returns" },
    { bugId: "BUG-002", module: "Menu", title: "Nested button hydration error", steps: "1. Open /menu 2. Check console for hydration errors", expectedActual: "Expected: No errors. Actual: '<button> cannot be descendant of <button>'", severity: "Minor", status: "Fixed", assignedTo: "", reportedBy: "Playwright", reportedDate: "2026-04-02", fixedDate: "2026-04-02", comments: "Changed outer <button> to <div role='button'> in category list" },
    { bugId: "BUG-003", module: "Settings", title: "Missing pages (tables, payment-modes, outlets)", steps: "1. Go to /settings 2. Click Tables/Payment Modes/Outlets cards", expectedActual: "Expected: Settings page loads. Actual: 404 Not Found", severity: "Major", status: "Fixed", assignedTo: "", reportedBy: "Playwright", reportedDate: "2026-03-26", fixedDate: "2026-03-26", comments: "Created placeholder pages for all 3 routes" },
  ];

  for (const bug of bugs) {
    const r = bugSheet.addRow(bug);
    r.eachCell((cell) => { cell.font = BODY_FONT; cell.alignment = { vertical: "middle", wrapText: true }; });
    const sevCell = r.getCell("severity");
    if (bug.severity === "Critical") sevCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEBEE" } };
    if (bug.severity === "Major") sevCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF3E0" } };
    const statusCell = r.getCell("status");
    applyStatusColor(statusCell, bug.status === "Fixed" ? "Done" : bug.status === "Open" ? "In Progress" : "Not Started");
  }

  styleHeaders(bugSheet);
  bugSheet.autoFilter = { from: "A1", to: "L1" };

  // ═══════════════════ SHEET 4: TEAM ═══════════════════
  const teamSheet = workbook.addWorksheet("Team", { properties: { tabColor: { argb: "FF546067" } } });

  teamSheet.columns = [
    { header: "Name", key: "name", width: 22 },
    { header: "Role", key: "role", width: 18 },
    { header: "Email", key: "email", width: 30 },
    { header: "Current Tasks", key: "currentTasks", width: 25 },
    { header: "Availability", key: "availability", width: 18 },
    { header: "Notes", key: "notes", width: 40 },
  ];

  const team = [
    { name: "(Your Name)", role: "Project Lead", email: "", currentTasks: "", availability: "Full-time", notes: "Add your team members here" },
  ];

  for (const member of team) {
    const r = teamSheet.addRow(member);
    r.eachCell((cell) => { cell.font = BODY_FONT; cell.alignment = { vertical: "middle" }; });
  }

  styleHeaders(teamSheet);

  // ═══════════════════ SAVE ═══════════════════
  const outputPath = path.join(process.cwd(), "RestroPOS-Project-Tracker.xlsx");
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Excel created: ${outputPath}`);
  console.log("Sheets: Task Tracker (34 tasks), Sprint Log (4 entries), Bug Log (3 bugs), Team (1 placeholder)");
}

main().catch(console.error);
