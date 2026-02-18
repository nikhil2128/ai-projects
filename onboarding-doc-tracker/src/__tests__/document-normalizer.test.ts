import { describe, it, expect } from 'vitest';
import {
  detectDocumentType,
  normalizeDocumentName,
  normalizeDocumentBatch,
  toSnakeCase,
} from '../services/document-normalizer';

describe('toSnakeCase', () => {
  it('converts a regular name', () => {
    expect(toSnakeCase('John Doe')).toBe('john_doe');
  });

  it('handles extra spaces', () => {
    expect(toSnakeCase('  Jane   Smith  ')).toBe('jane_smith');
  });

  it('strips special characters', () => {
    expect(toSnakeCase("Mary O'Brien")).toBe('mary_obrien');
  });

  it('handles single names', () => {
    expect(toSnakeCase('Ravi')).toBe('ravi');
  });
});

describe('detectDocumentType', () => {
  it('detects passport', () => {
    expect(detectDocumentType('passport.pdf')).toBe('passport');
    expect(detectDocumentType('passport2.pdf')).toBe('passport');
    expect(detectDocumentType('my_passport_scan.pdf')).toBe('passport');
    expect(detectDocumentType('Passport_Copy.pdf')).toBe('passport');
  });

  it('detects driving license', () => {
    expect(detectDocumentType('driving_license.pdf')).toBe('driving_license');
    expect(detectDocumentType('DL_front.pdf')).toBe('driving_license');
    expect(detectDocumentType('drivers_licence.pdf')).toBe('driving_license');
    expect(detectDocumentType('driver-license-scan.pdf')).toBe('driving_license');
  });

  it('detects identity document', () => {
    expect(detectDocumentType('id_card.pdf')).toBe('identity_document');
    expect(detectDocumentType('national_id.pdf')).toBe('identity_document');
    expect(detectDocumentType('identity_proof.pdf')).toBe('identity_document');
    expect(detectDocumentType('ID-Proof.pdf')).toBe('identity_document');
  });

  it('detects birth certificate', () => {
    expect(detectDocumentType('birth_certificate.pdf')).toBe('birth_certificate');
    expect(detectDocumentType('Birth-Certificate-Copy.pdf')).toBe('birth_certificate');
  });

  it('detects aadhaar', () => {
    expect(detectDocumentType('aadhaar.pdf')).toBe('aadhaar');
    expect(detectDocumentType('aadhar_card.pdf')).toBe('aadhaar');
  });

  it('detects PAN card', () => {
    expect(detectDocumentType('pan_card.pdf')).toBe('pan_card');
    expect(detectDocumentType('PAN.pdf')).toBe('pan_card');
  });

  it('detects address proof', () => {
    expect(detectDocumentType('address_proof.pdf')).toBe('address_proof');
    expect(detectDocumentType('utility_bill.pdf')).toBe('address_proof');
  });

  it('detects voter ID', () => {
    expect(detectDocumentType('voter_id.pdf')).toBe('voter_id');
  });

  it('detects visa', () => {
    expect(detectDocumentType('visa_copy.pdf')).toBe('visa');
  });

  it('detects work permit', () => {
    expect(detectDocumentType('work_permit.pdf')).toBe('work_permit');
  });

  it('detects social security', () => {
    expect(detectDocumentType('ssn_card.pdf')).toBe('social_security');
    expect(detectDocumentType('social_security.pdf')).toBe('social_security');
  });

  it('returns "document" for unrecognized files', () => {
    expect(detectDocumentType('scan001.pdf')).toBe('document');
    expect(detectDocumentType('IMG_20240101.pdf')).toBe('document');
  });
});

describe('normalizeDocumentName', () => {
  it('normalizes passport2.pdf for John Doe', () => {
    expect(normalizeDocumentName('passport2.pdf', 'John Doe', 0)).toBe(
      'john_doe_passport.pdf'
    );
  });

  it('normalizes DL_scan.pdf', () => {
    expect(normalizeDocumentName('DL_scan.pdf', 'Jane Smith', 0)).toBe(
      'jane_smith_driving_license.pdf'
    );
  });

  it('adds index suffix for non-zero index', () => {
    expect(normalizeDocumentName('passport.pdf', 'John Doe', 1)).toBe(
      'john_doe_passport_2.pdf'
    );
  });

  it('normalizes unrecognized filenames', () => {
    expect(normalizeDocumentName('scan001.pdf', 'Ravi Kumar', 0)).toBe(
      'ravi_kumar_document.pdf'
    );
  });
});

describe('normalizeDocumentBatch', () => {
  it('produces unique names when multiple files share same type', () => {
    const filenames = [
      'passport_front.pdf',
      'passport_back.pdf',
      'driving_license.pdf',
    ];

    const result = normalizeDocumentBatch(filenames, 'Alice Johnson');

    expect(result.get('passport_front.pdf')).toBe('alice_johnson_passport_1.pdf');
    expect(result.get('passport_back.pdf')).toBe('alice_johnson_passport_2.pdf');
    expect(result.get('driving_license.pdf')).toBe(
      'alice_johnson_driving_license.pdf'
    );
  });

  it('does not add suffix when each type appears once', () => {
    const filenames = ['passport.pdf', 'dl.pdf', 'aadhaar.pdf'];

    const result = normalizeDocumentBatch(filenames, 'Bob');

    expect(result.get('passport.pdf')).toBe('bob_passport.pdf');
    expect(result.get('dl.pdf')).toBe('bob_driving_license.pdf');
    expect(result.get('aadhaar.pdf')).toBe('bob_aadhaar.pdf');
  });

  it('handles all unrecognized files with incremental suffixes', () => {
    const filenames = ['scan1.pdf', 'scan2.pdf', 'scan3.pdf'];

    const result = normalizeDocumentBatch(filenames, 'Test User');

    expect(result.get('scan1.pdf')).toBe('test_user_document_1.pdf');
    expect(result.get('scan2.pdf')).toBe('test_user_document_2.pdf');
    expect(result.get('scan3.pdf')).toBe('test_user_document_3.pdf');
  });
});
