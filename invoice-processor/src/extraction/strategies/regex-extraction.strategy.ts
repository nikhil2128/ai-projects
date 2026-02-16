import { Injectable, Logger } from '@nestjs/common';
import * as pdfParse from 'pdf-parse';
import { ExtractionResult, ExtractionStrategy } from '../interfaces';

/**
 * Regex-based extraction strategy.
 *
 * Parses PDF text content and uses pattern matching to extract
 * vendor name, amount, tax, and due date. Works well for
 * invoices with standard layouts. No external API calls required.
 */
@Injectable()
export class RegexExtractionStrategy implements ExtractionStrategy {
  private readonly logger = new Logger(RegexExtractionStrategy.name);

  async extract(pdfBuffer: Buffer): Promise<ExtractionResult> {
    const parsed = await pdfParse(pdfBuffer);
    const text = parsed.text;

    this.logger.debug(`Extracted ${text.length} chars from PDF (${parsed.numpages} pages)`);

    const vendorName = this.extractVendorName(text);
    const amount = this.extractAmount(text);
    const tax = this.extractTax(text);
    const dueDate = this.extractDueDate(text);

    const fieldsFound = [vendorName, amount, tax, dueDate].filter((v) => v !== null).length;
    const confidence = fieldsFound / 4;

    return {
      vendorName,
      amount,
      tax,
      dueDate,
      confidence,
      rawText: text.substring(0, 5000), // Cap raw text to avoid bloating DB
    };
  }

  private extractVendorName(text: string): string | null {
    // Common patterns: "From: Vendor Name", "Vendor: Name", "Bill From: Name"
    // Also try: "Company Name" at the top of the document
    const patterns = [
      /(?:from|vendor|supplier|bill\s*from|sold\s*by|company)\s*[:-]\s*(.+)/i,
      /(?:invoice\s+from)\s*[:-]?\s*(.+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const name = match[1].trim().split('\n')[0].trim();
        if (name.length > 1 && name.length < 200) {
          return name;
        }
      }
    }

    // Fallback: first non-empty line (often the company name in simple invoices)
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 2);
    if (lines.length > 0 && lines[0].length < 100) {
      return lines[0];
    }

    return null;
  }

  private extractAmount(text: string): number | null {
    // Look for "Total", "Amount Due", "Grand Total", "Balance Due"
    // Use negative lookbehind to exclude "Subtotal"
    const patterns = [
      /(?:(?:total\s*amount\s*due|amount\s*due|grand\s*total|balance\s*due|total\s*payable))\s*[:-]?\s*\$?\s*([\d,]+\.?\d*)/i,
      /(?<!sub)total\s*[:-]\s*\$?\s*([\d,]+\.?\d*)/i,
      /\$\s*([\d,]+\.\d{2})\s*$/m, // Dollar amount at end of a line
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && value > 0) {
          return value;
        }
      }
    }

    return null;
  }

  private extractTax(text: string): number | null {
    const patterns = [
      /(?:tax|vat|gst|sales\s*tax|hst)\s*(?:\(?\d+%?\)?)?\s*[:-]?\s*\$?\s*([\d,]+\.?\d*)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const value = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(value) && value >= 0) {
          return value;
        }
      }
    }

    return null;
  }

  private extractDueDate(text: string): string | null {
    // Look for "Due Date", "Payment Due", "Due By" followed by a date
    const patterns = [
      /(?:due\s*date|payment\s*due|due\s*by|pay\s*by|date\s*due)\s*[:-]?\s*(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})/i,
      /(?:due\s*date|payment\s*due|due\s*by|pay\s*by|date\s*due)\s*[:-]?\s*(\w+\s+\d{1,2},?\s+\d{4})/i,
      /(?:due\s*date|payment\s*due|due\s*by|pay\s*by|date\s*due)\s*[:-]?\s*(\d{4}-\d{2}-\d{2})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const parsed = this.parseDate(match[1]);
        if (parsed) return parsed;
      }
    }

    return null;
  }

  /**
   * Attempt to parse various date formats into YYYY-MM-DD.
   */
  private parseDate(dateStr: string): string | null {
    const cleaned = dateStr.trim();

    // ISO format: 2024-01-15
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return cleaned;
    }

    // MM/DD/YYYY or MM-DD-YYYY or MM.DD.YYYY
    const slashMatch = cleaned.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
    if (slashMatch) {
      const [, month, day, yearRaw] = slashMatch;
      const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // "January 15, 2024" or "Jan 15 2024"
    const namedMatch = cleaned.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (namedMatch) {
      const [, monthName, day, year] = namedMatch;
      const monthNum = this.monthNameToNumber(monthName);
      if (monthNum) {
        return `${year}-${String(monthNum).padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
    }

    return null;
  }

  private monthNameToNumber(name: string): number | null {
    const months: Record<string, number> = {
      january: 1, jan: 1,
      february: 2, feb: 2,
      march: 3, mar: 3,
      april: 4, apr: 4,
      may: 5,
      june: 6, jun: 6,
      july: 7, jul: 7,
      august: 8, aug: 8,
      september: 9, sep: 9, sept: 9,
      october: 10, oct: 10,
      november: 11, nov: 11,
      december: 12, dec: 12,
    };
    return months[name.toLowerCase()] ?? null;
  }
}
