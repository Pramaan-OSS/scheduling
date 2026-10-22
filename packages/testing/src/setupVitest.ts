import process from "node:process";
import type { CalendarService } from "@scheduling/types/Calendar";
import matchers from "@testing-library/jest-dom/matchers";
import ResizeObserver from "resize-observer-polyfill";
import { expect, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";

global.ResizeObserver = ResizeObserver;

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

const fetchMocker = createFetchMock(vi);

// sets globalThis.fetch and globalThis.fetchMock to our mocked version
fetchMocker.enableMocks();

expect.extend(matchers);

class MockExchangeCalendarService implements CalendarService {
  async createEvent() {
    return {
      uid: "mock",
      id: "mock",
      password: "",
      type: "",
      url: "",
      additionalInfo: {},
    };
  }
  async updateEvent() {
    return {
      uid: "mock",
      id: "mock",
      password: "",
      type: "",
      url: "",
      additionalInfo: {},
    };
  }
  async deleteEvent() {}
  async getAvailability() {
    return [];
  }
  async listCalendars() {
    return [];
  }
}

vi.mock("@scheduling/exchangecalendar/lib/CalendarService", () => ({
  default: MockExchangeCalendarService,
}));

vi.mock("@scheduling/exchange2013calendar/lib/CalendarService", () => ({
  default: MockExchangeCalendarService,
}));

vi.mock("@scheduling/exchange2016calendar/lib/CalendarService", () => ({
  default: MockExchangeCalendarService,
}));

const MOCK_PAYMENT_UID = "MOCK_PAYMENT_UID";

function createMockPaymentService(_credentials?: unknown) {
  return {
    async create(
      payment: { amount: number; currency: string },
      bookingId: number,
      _userId: number,
      _username: string | null,
      _bookerName: string | null,
      paymentOption: string,
      _bookerEmail: string,
      _bookerPhoneNumber?: string | null,
      _selectedEventTypeTitle?: string,
      _eventTitle?: string
    ) {
      const { default: prismaMock } = await import("@scheduling/testing/lib/__mocks__/prisma");
      const externalId = "mock_payment_external_id";

      const paymentCreateData = {
        uid: MOCK_PAYMENT_UID,
        appId: null,
        bookingId,
        fee: 10,
        success: false,
        refunded: false,
        data: {},
        externalId,
        paymentOption,
        amount: payment.amount,
        currency: payment.currency,
      };

      const createdPayment = await prismaMock.payment.create({
        data: paymentCreateData,
      });

      return createdPayment;
    },
    async collectCard() {
      return { success: true };
    },
    async chargeCard() {
      return { success: true };
    },
    async refund() {
      return { success: true };
    },
    async deletePayment() {
      return { success: true };
    },
    async afterPayment(
      event: Record<string, unknown>,
      _booking: Record<string, unknown>,
      paymentData: { paymentOption?: string; amount: number; currency: string }
    ) {
      const { sendAwaitingPaymentEmailAndSMS } = await import("@scheduling/emails/email-manager");
      await sendAwaitingPaymentEmailAndSMS({
        ...event,
        paymentInfo: {
          link: "http://mock-payment.example.com/",
          paymentOption: paymentData.paymentOption || "ON_BOOKING",
          amount: paymentData.amount,
          currency: paymentData.currency,
        },
      });
      return { success: true };
    },
  };
}

vi.mock("@scheduling/app-store/legacyPaymentpayment/index", () => ({
  BuildPaymentService: createMockPaymentService,
}));

vi.mock("@scheduling/app-store/alternativePayment/index", () => ({
  BuildPaymentService: createMockPaymentService,
}));

vi.mock("@scheduling/app-store/alby/index", () => ({
  BuildPaymentService: createMockPaymentService,
}));

vi.mock("@scheduling/app-store/hitpay/index", () => ({
  BuildPaymentService: createMockPaymentService,
}));

vi.mock("@scheduling/app-store/btcpayserver/index", () => ({
  BuildPaymentService: createMockPaymentService,
}));

vi.mock("@scheduling/app-store/mock-payment-app/index", () => ({
  BuildPaymentService: createMockPaymentService,
}));

vi.mock("@scheduling/app-store/payment.services.generated", () => ({
  PaymentServiceMap: {
    "pramaan-payment": Promise.resolve({ BuildPaymentService: createMockPaymentService }),
    alternativePayment: Promise.resolve({ BuildPaymentService: createMockPaymentService }),
    alby: Promise.resolve({ BuildPaymentService: createMockPaymentService }),
    hitpay: Promise.resolve({ BuildPaymentService: createMockPaymentService }),
    btcpayserver: Promise.resolve({ BuildPaymentService: createMockPaymentService }),
    "mock-payment-app": Promise.resolve({ BuildPaymentService: createMockPaymentService }),
  },
}));

class MockCrmService {
  async createEvent() {
    return [];
  }
  async updateEvent() {
    return [];
  }
  async deleteEvent() {}
  async getContacts() {
    return [];
  }
  async createContacts() {
    return [];
  }
}

vi.mock("@scheduling/app-store/crm.apps.generated", () => ({
  CrmServiceMap: {
    closecom: Promise.resolve({ default: MockCrmService }),
    contactArchive: Promise.resolve({ default: MockCrmService }),
    "pipedrive-crm": Promise.resolve({ default: MockCrmService }),
    contactRecord: Promise.resolve({ default: MockCrmService }),
    "zoho-bigin": Promise.resolve({ default: MockCrmService }),
    zohocrm: Promise.resolve({ default: MockCrmService }),
  },
}));

if (!process.env.INTEGRATION_TESTS) {
  vi.mock("@scheduling/app-store/contactRecord/lib/graphql/documents/queries", () => ({
    GetAccountRecordsForRRSkip: {},
  }));
}

vi.mock("@scheduling/app-store/apps.metadata.generated", async (importOriginal) => {
 const actual = await importOriginal<{ appStoreMetadata: Record<string, unknown> }>();
 return { ...actual, appStoreMetadata: new Proxy(actual.appStoreMetadata, { get(target, name: string) { return target[name] ?? { slug: name, dirName: name, name: "Fixture connection", type: name === "meetinglink" ? "meetinglink_video" : name.replace(/calendar$/, "_calendar").replace(/video$/, "_video"), categories: [name.endsWith("calendar") ? "calendar" : "conferencing"], appData: {} }; } }) };
});

vi.mock("@scheduling/app-store/appStoreMetaData", async (importOriginal) => {
 const actual = await importOriginal<{ appStoreMetadata: Record<string, unknown> }>();
 return { ...actual, appStoreMetadata: new Proxy(actual.appStoreMetadata, { get(target, name: string) { return target[name] ?? { slug: name, dirName: name, name: "Fixture connection", type: name === "meetinglink" ? "meetinglink_video" : name.replace(/calendar$/, "_calendar").replace(/video$/, "_video"), categories: [name.endsWith("calendar") ? "calendar" : "conferencing"], appData: {} }; } }) };
});
