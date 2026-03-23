import { RegexExtractionStrategy } from './regex-extraction.strategy';

// Minimal valid PDF that pdf-parse can handle
// We mock pdf-parse to avoid needing a real PDF
jest.mock('pdf-parse', () => {
  return jest.fn();
});

import * as pdfParse from 'pdf-parse';

const mockPdfParse = pdfParse as jest.MockedFunction<typeof pdfParse>;

describe('RegexExtractionStrategy', () => {
  let strategy: RegexExtractionStrategy;

  beforeEach(() => {
    strategy = new RegexExtractionStrategy();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should extract vendor name, amount, tax, and due date from standard invoice text', async () => {
    mockPdfParse.mockResolvedValue({
      text: `
        Vendor: Acme Corporation
        Invoice #12345

        Item 1: Widget A - $500.00
        Item 2: Widget B - $300.00

        Subtotal: $800.00
        Tax (10%): $80.00
        Total Amount Due: $880.00

        Due Date: 03/15/2024

        Thank you for your business!
      `,
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: '1.10.100',
    } as any);

    const result = await strategy.extract(Buffer.from('fake'));

    expect(result.vendorName).toBe('Acme Corporation');
    expect(result.amount).toBe(880);
    expect(result.tax).toBe(80);
    expect(result.dueDate).toBe('2024-03-15');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should handle invoice with "Bill From" vendor format', async () => {
    mockPdfParse.mockResolvedValue({
      text: `
        Bill From: TechSupply Inc.

        Total: $1,250.75
        Tax: $125.08

        Payment Due: January 20, 2025
      `,
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: '1.10.100',
    } as any);

    const result = await strategy.extract(Buffer.from('fake'));

    expect(result.vendorName).toBe('TechSupply Inc.');
    expect(result.amount).toBe(1250.75);
    expect(result.tax).toBe(125.08);
    expect(result.dueDate).toBe('2025-01-20');
    expect(result.confidence).toBe(1);
  });

  it('should return nulls for fields that cannot be extracted', async () => {
    mockPdfParse.mockResolvedValue({
      text: 'This is a random document with no invoice data.',
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: '1.10.100',
    } as any);

    const result = await strategy.extract(Buffer.from('fake'));

    // vendorName will be fallback (first line)
    expect(result.amount).toBeNull();
    expect(result.tax).toBeNull();
    expect(result.dueDate).toBeNull();
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });

  it('should handle ISO date format', async () => {
    mockPdfParse.mockResolvedValue({
      text: `
        Vendor: GlobalCo
        Total: $500.00
        Due Date: 2024-06-30
      `,
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: '1.10.100',
    } as any);

    const result = await strategy.extract(Buffer.from('fake'));

    expect(result.dueDate).toBe('2024-06-30');
  });

  it('should cap raw text to 5000 characters', async () => {
    const longText = 'x'.repeat(10000);
    mockPdfParse.mockResolvedValue({
      text: longText,
      numpages: 1,
      numrender: 1,
      info: {},
      metadata: null,
      version: '1.10.100',
    } as any);

    const result = await strategy.extract(Buffer.from('fake'));

    expect(result.rawText.length).toBe(5000);
  });
});
