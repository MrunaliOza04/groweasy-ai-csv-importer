import { jest } from "@jest/globals";
import { extractLeadsInBatches, setAiClient } from "../services/ai.service.ts";

const mockClient = {
  models: {
    generateContent: async ({ contents }) => {
      // Tailor mock responses based on test triggers inside prompt contents
      if (contents.includes("invalid_test_record")) {
        return {
          text: JSON.stringify([
            {
              name: "No Contact Info",
              company: "No Contact Corp",
              email: "",
              mobile_without_country_code: "",
              crm_status: "BAD_LEAD",
              crm_note: "No email or phone number found",
            },
          ]),
        };
      }

      if (contents.includes("multiple_emails_test")) {
        return {
          text: JSON.stringify([
            {
              name: "Jane Doe",
              email: "jane.doe@example.com",
              mobile_without_country_code: "9876543210",
              crm_status: "GOOD_LEAD_FOLLOW_UP",
              crm_note:
                "Additional email: secondary@example.com, other_email@example.com. Phone: 1112223333.",
            },
          ]),
        };
      }

      // Default mock response for valid lead mapping
      return {
        text: JSON.stringify([
          {
            name: "John Doe",
            email: "john.doe@example.com",
            mobile_without_country_code: "9876543210",
            crm_status: "GOOD_LEAD_FOLLOW_UP",
            crm_note: "Client is asking to reschedule demo",
          },
        ]),
      };
    },
  },
};

describe("AI CSV Importer - Batch Processing & Validation Rules", () => {
  beforeAll(() => {
    // Inject the mock client before any tests run
    setAiClient(mockClient);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Rule 6: Should skip/drop records that lack BOTH email AND mobile number", async () => {
    const rawRecords = [
      {
        "Full Name": "No Contact Info",
        Company: "No Contact Corp",
        Notes: "invalid_test_record",
      },
    ];

    const result = await extractLeadsInBatches(rawRecords);

    // The record lacking both email and phone should be skipped (filtered out from parsedRecords)
    expect(result.parsedRecords.length).toBe(0);
    expect(result.skippedRecords.length).toBe(1);
    expect(result.totalImported).toBe(0);
    expect(result.totalSkipped).toBe(1);
    expect(result.skippedRecords[0].reason).toContain(
      "lacks both email and mobile number"
    );
  });

  test("Rule 5: Should map first email/mobile and allow multiple emails/mobiles in notes", async () => {
    const rawRecords = [
      {
        "Full Name": "Jane Doe",
        Emails:
          "jane.doe@example.com, secondary@example.com, other_email@example.com",
        Phones: "9876543210, 1112223333",
        Notes: "multiple_emails_test",
      },
    ];

    const result = await extractLeadsInBatches(rawRecords);

    expect(result.parsedRecords.length).toBe(1);
    expect(result.totalImported).toBe(1);
    expect(result.totalSkipped).toBe(0);

    const mappedLead = result.parsedRecords[0];
    // Main fields should contain the first values
    expect(mappedLead.name).toBe("Jane Doe");
    expect(mappedLead.email).toBe("jane.doe@example.com");
    expect(mappedLead.mobile_without_country_code).toBe("9876543210");

    // Notes should contain the remaining emails and phones appended
    expect(mappedLead.crm_note).toContain("secondary@example.com");
    expect(mappedLead.crm_note).toContain("other_email@example.com");
    expect(mappedLead.crm_note).toContain("1112223333");
  });

  test("Should process valid records and output parseable date", async () => {
    const rawRecords = [
      {
        "Full Name": "John Doe",
        Email: "john.doe@example.com",
        Phone: "9876543210",
      },
    ];

    const result = await extractLeadsInBatches(rawRecords);

    expect(result.parsedRecords.length).toBe(1);
    expect(result.totalImported).toBe(1);

    const lead = result.parsedRecords[0];
    expect(lead.name).toBe("John Doe");
    expect(lead.email).toBe("john.doe@example.com");

    // created_at must be successfully parseable by new Date()
    expect(lead.created_at).toBeDefined();
    const parsedDate = new Date(lead.created_at);
    expect(isNaN(parsedDate.getTime())).toBe(false);
  });
});
