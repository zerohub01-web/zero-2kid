import { beforeEach, describe, expect, test, vi } from "vitest";

type QueryResult<T> = {
  sort: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
};

function makeFindWithSortAndSelect<T>(rows: T[]) {
  const query: QueryResult<T> = {
    sort: vi.fn(),
    select: vi.fn()
  };
  query.sort.mockReturnValue(query);
  query.select.mockResolvedValue(rows);
  return query;
}

const bookingFindMock = vi.fn();
const projectFindMock = vi.fn();
const contractFindMock = vi.fn();
const invoiceFindMock = vi.fn();
const ensureTimelineForBookingMock = vi.fn();

vi.mock("../../src/db/schema.js", () => ({
  ContractModel: { find: contractFindMock },
  InvoiceModel: { find: invoiceFindMock }
}));

vi.mock("../../src/models/Booking.js", () => ({
  BookingModel: { find: bookingFindMock },
  toCanonicalBookingStatus: vi.fn(() => "new")
}));

vi.mock("../../src/models/Project.js", () => ({
  ProjectModel: { find: projectFindMock }
}));

vi.mock("../../src/controllers/projectTimeline.controller.js", () => ({
  ensureTimelineForBooking: ensureTimelineForBookingMock
}));

describe("portal controller invoice mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureTimelineForBookingMock.mockResolvedValue({ toObject: () => ({ milestones: [] }) });
  });

  test("maps invoice when invoice.bookingId uses public bookingId format", async () => {
    const bookingDoc = {
      _id: "mongo-booking-1",
      bookingId: "BK-2026-001",
      email: "client@example.com",
      service: "Custom Website",
      status: "new",
      date: new Date("2026-04-05T10:00:00.000Z"),
      createdAt: new Date("2026-04-05T10:00:00.000Z"),
      servicePriceSnapshot: 50000,
      businessType: "IT"
    };

    bookingFindMock.mockReturnValue({
      sort: vi.fn().mockResolvedValue([bookingDoc])
    });
    projectFindMock.mockResolvedValue([]);
    contractFindMock.mockReturnValue(makeFindWithSortAndSelect([]));
    invoiceFindMock.mockReturnValue(
      makeFindWithSortAndSelect([
        {
          _id: "invoice-1",
          invoiceNumber: "ZERO-2026-001",
          status: "SENT",
          totalAmount: 50000,
          currencySymbol: "₹",
          dueDate: new Date("2026-04-10T10:00:00.000Z"),
          createdAt: new Date("2026-04-05T10:00:00.000Z"),
          bookingId: "BK-2026-001",
          clientEmail: "client@example.com"
        }
      ])
    );

    const { getPortalProject } = await import("../../src/controllers/portal.controller.js");
    const req = {
      customer: { email: "Client@Example.com" }
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;

    await getPortalProject(req, res);

    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledTimes(1);
    const payload = res.json.mock.calls[0]?.[0];
    expect(Array.isArray(payload.projects)).toBe(true);
    expect(payload.projects[0]?.invoice?.id).toBe("invoice-1");
    expect(payload.projects[0]?.invoice?.invoiceNumber).toBe("ZERO-2026-001");
  });

  test("falls back to email-linked invoice when booking linkage is legacy/missing", async () => {
    const bookingDoc = {
      _id: "mongo-booking-2",
      bookingId: "BK-2026-002",
      email: "client2@example.com",
      service: "Automation",
      status: "new",
      date: new Date("2026-04-05T10:00:00.000Z"),
      createdAt: new Date("2026-04-05T10:00:00.000Z"),
      servicePriceSnapshot: 60000,
      businessType: "SaaS"
    };

    bookingFindMock.mockReturnValue({
      sort: vi.fn().mockResolvedValue([bookingDoc])
    });
    projectFindMock.mockResolvedValue([]);
    contractFindMock.mockReturnValue(makeFindWithSortAndSelect([]));
    invoiceFindMock.mockReturnValue(
      makeFindWithSortAndSelect([
        {
          _id: "invoice-2",
          invoiceNumber: "ZERO-2026-002",
          status: "SENT",
          totalAmount: 60000,
          currencySymbol: "₹",
          dueDate: new Date("2026-04-12T10:00:00.000Z"),
          createdAt: new Date("2026-04-05T10:00:00.000Z"),
          bookingId: "LEGACY-BOOKING-KEY",
          clientEmail: "CLIENT2@example.com"
        }
      ])
    );

    const { getPortalProject } = await import("../../src/controllers/portal.controller.js");
    const req = {
      customer: { email: "client2@example.com" }
    } as any;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as any;

    await getPortalProject(req, res);

    expect(res.status).not.toHaveBeenCalledWith(500);
    const payload = res.json.mock.calls[0]?.[0];
    expect(payload.projects[0]?.invoice?.id).toBe("invoice-2");
    expect(payload.projects[0]?.invoice?.invoiceNumber).toBe("ZERO-2026-002");
  });
});
