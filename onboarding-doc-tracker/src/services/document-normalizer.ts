import { DocumentType } from '../types';

interface PatternMapping {
  pattern: RegExp;
  type: DocumentType;
}

/**
 * Order matters: more specific patterns should come first to avoid
 * generic patterns matching prematurely.
 */
const DOCUMENT_PATTERNS: PatternMapping[] = [
  { pattern: /driving[\s_-]*licen[cs]e|drivers?[\s_-]*licen[cs]e|\bdl\b/i, type: 'driving_license' },
  { pattern: /birth[\s_-]*certificate/i, type: 'birth_certificate' },
  { pattern: /work[\s_-]*permit/i, type: 'work_permit' },
  { pattern: /address[\s_-]*proof|utility[\s_-]*bill|residence[\s_-]*proof/i, type: 'address_proof' },
  { pattern: /social[\s_-]*security|\bssn\b|\bss\b/i, type: 'social_security' },
  { pattern: /voter[\s_-]*id/i, type: 'voter_id' },
  { pattern: /pan[\s_-]*card|\bpan\b/i, type: 'pan_card' },
  { pattern: /aadhaar|aadhar|\buid\b/i, type: 'aadhaar' },
  { pattern: /passport/i, type: 'passport' },
  { pattern: /visa/i, type: 'visa' },
  { pattern: /\bid[\s_-]*card\b|\bidentity\b|\bnational[\s_-]*id\b|\bid[\s_-]*proof\b/i, type: 'identity_document' },
];

/**
 * Converts an employee name to a consistent snake_case format.
 * "John Doe" → "john_doe"
 */
export function toSnakeCase(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_');
}

/**
 * Detects the document type from a filename by matching against known patterns.
 */
export function detectDocumentType(filename: string): DocumentType {
  const baseName = filename
    .replace(/\.pdf$/i, '')
    .replace(/[_\s-]+/g, ' ')
    .toLowerCase();

  for (const { pattern, type } of DOCUMENT_PATTERNS) {
    if (pattern.test(baseName)) {
      return type;
    }
  }

  return 'document';
}

/**
 * Normalizes a document filename by:
 * 1. Detecting the document type from the original name
 * 2. Constructing: {employee_name}_{document_type}.pdf
 * 3. Appending an index suffix when there are multiple files of the same type
 *
 * Example: "passport2.pdf" for "John Doe" → "john_doe_passport.pdf"
 */
export function normalizeDocumentName(
  originalFilename: string,
  employeeName: string,
  index: number
): string {
  const docType = detectDocumentType(originalFilename);
  const prefix = toSnakeCase(employeeName);

  const suffix = index > 0 ? `_${index + 1}` : '';
  return `${prefix}_${docType}${suffix}.pdf`;
}

/**
 * Processes a batch of filenames, ensuring unique names when multiple files
 * resolve to the same document type.
 */
export function normalizeDocumentBatch(
  filenames: string[],
  employeeName: string
): Map<string, string> {
  const result = new Map<string, string>();
  const typeCount = new Map<DocumentType, number>();

  const typed = filenames.map((filename) => ({
    original: filename,
    type: detectDocumentType(filename),
  }));

  // Count occurrences of each type
  for (const { type } of typed) {
    typeCount.set(type, (typeCount.get(type) || 0) + 1);
  }

  const typeIndex = new Map<DocumentType, number>();

  for (const { original, type } of typed) {
    const prefix = toSnakeCase(employeeName);
    const count = typeCount.get(type) || 1;
    const currentIndex = typeIndex.get(type) || 0;
    typeIndex.set(type, currentIndex + 1);

    const suffix = count > 1 ? `_${currentIndex + 1}` : '';
    result.set(original, `${prefix}_${type}${suffix}.pdf`);
  }

  return result;
}
