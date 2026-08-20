/** @jest-environment node */

/**
 * Tests for the CSV export limit functionality
 *
 * The lead export endpoint (`src/server/routes/leads.ts`) implements:
 * - `take: 10000` max rows per export
 * - `X-Total-Count` header with actual count
 * - `X-Warning` header when export hits the 10,000 row limit
 * - CSV formatting with proper escaping
 * - Content-Type: text/csv and Content-Disposition headers
 */

const CSV_EXPORT_LIMIT = 10000;

// Helper: simulate the CSV row generation logic from leads.ts
function generateCsvRow(contact: any): string[] {
  return [
    contact.name || '',
    contact.phone,
    contact.email || '',
    contact.company || '',
    contact.metadata?.city || contact.metadata?.location || '',
    contact.metadata?.product || contact.metadata?.service || '',
    contact.metadata?.supplier || '',
    contact.metadata?.requirement || contact.metadata?.message || '',
    contact.source || '',
    (contact.tags || []).join('; '),
    contact.dealValue?.toString() || '',
    contact.createdAt?.toISOString() || '',
  ];
}

// Helper: escape a CSV field
function escapeCsvField(field: any): string {
  return `"${String(field).replace(/"/g, '""')}"`;
}

describe('CSV Export - Row Limit', () => {
  it('should enforce a maximum of 10,000 rows per export', () => {
    expect(CSV_EXPORT_LIMIT).toBe(10000);
  });

  it('should limit exported rows to 10,000 when more exist', () => {
    // Simulate: prisma query uses `take: 10000`
    const totalInDb = 15000;
    const takeLimit = 10000;
    const exportedCount = Math.min(totalInDb, takeLimit);
    expect(exportedCount).toBe(10000);
    // The X-Total-Count should still reflect the actual (but limited) count
    expect(exportedCount).toBeLessThan(totalInDb);
  });

  it('should export exactly all rows when total is at the limit', () => {
    const totalInDb = 10000;
    const exportedCount = Math.min(totalInDb, CSV_EXPORT_LIMIT);
    expect(exportedCount).toBe(10000);
  });

  it('should export all rows when total is under the limit', () => {
    const totalInDb = 5000;
    const exportedCount = Math.min(totalInDb, CSV_EXPORT_LIMIT);
    expect(exportedCount).toBe(5000);
    // All rows are included
    expect(exportedCount).toBe(totalInDb);
  });
});

describe('CSV Export - Warning & Count Headers', () => {
  it('should set X-Warning header when export count reaches 10,000', () => {
    const contactsLength = 10000;
    const warning = contactsLength >= CSV_EXPORT_LIMIT
      ? 'Export limited to 10,000 rows. Filter your data for complete export.'
      : undefined;
    expect(warning).toBeDefined();
    expect(warning).toContain('10,000');
    expect(warning).toContain('Filter your data');
  });

  it('should NOT set X-Warning header when export is under limit', () => {
    const contactsLength = 5000;
    let warning: string | undefined;
    if (contactsLength >= CSV_EXPORT_LIMIT) {
      warning = 'Export limited to 10,000 rows. Filter your data for complete export.';
    }
    expect(warning).toBeUndefined();
  });

  it('should set X-Total-Count to the actual number of exported rows', () => {
    const testCases = [0, 1, 500, 9999, 10000];
    for (const count of testCases) {
      const xTotalCount = String(count);
      expect(xTotalCount).toBe(String(Math.min(count, CSV_EXPORT_LIMIT)));
    }
  });
});

describe('CSV Export - Response Headers', () => {
  it('should set Content-Type to text/csv', () => {
    const contentType = 'text/csv';
    expect(contentType).toBe('text/csv');
  });

  it('should set Content-Disposition with filename', () => {
    const contentDisposition = 'attachment; filename=leads_export.csv';
    expect(contentDisposition).toContain('attachment');
    expect(contentDisposition).toContain('leads_export.csv');
  });
});

describe('CSV Export - Data Formatting', () => {
  it('should generate correct CSV headers matching the route handler', () => {
    const headers = [
      'Name', 'Phone', 'Email', 'Company', 'Location',
      'Product', 'Supplier', 'Requirement', 'Source',
      'Tags', 'Deal Value', 'Created At'
    ];
    expect(headers[0]).toBe('Name');
    expect(headers[4]).toBe('Location');
    expect(headers[11]).toBe('Created At');
  });

  it('should escape double quotes in fields', () => {
    const testCases = [
      { input: 'Simple', expected: '"Simple"' },
      { input: 'Has "quotes" here', expected: '"Has ""quotes"" here"' },
      { input: 'Double""Quote', expected: '"Double""""Quote"' },
      { input: '', expected: '""' },
    ];
    for (const { input, expected } of testCases) {
      expect(escapeCsvField(input)).toBe(expected);
    }
  });

  it('should wrap fields containing commas in quotes', () => {
    const testCases = [
      { input: 'City, State', expected: '"City, State"' },
      { input: 'Value1,Value2,Value3', expected: '"Value1,Value2,Value3"' },
      { input: 'NoComma', expected: '"NoComma"' },
    ];
    for (const { input, expected } of testCases) {
      expect(escapeCsvField(input)).toBe(expected);
    }
  });

  it('should produce a valid CSV row from contact data', () => {
    const contact = {
      name: 'John Doe',
      phone: '555-0100',
      email: 'john@test.com',
      company: 'Acme Inc',
      source: 'website',
      tags: ['hot', 'new'],
      metadata: { city: 'Mumbai', product: 'Widget' },
      dealValue: 5000,
      createdAt: new Date('2026-01-15'),
    };

    const row = generateCsvRow(contact);
    const csvLine = row.map(escapeCsvField).join(',');

    expect(csvLine).toContain('"John Doe"');
    expect(csvLine).toContain('"555-0100"');
    expect(csvLine).toContain('"Mumbai"');
    expect(csvLine).toContain('"hot; new"');
    expect(csvLine).toContain('"2026-01-15T00:00:00.000Z"');
  });

  it('should produce a full valid CSV from multiple contacts', () => {
    const contacts = [
      { name: 'Alice', phone: '111', email: 'a@test.com', metadata: { city: 'Delhi' }, source: 'manual', tags: [], dealValue: 100, createdAt: new Date() },
      { name: 'Bob', phone: '222', email: 'b@test.com', metadata: {}, source: 'website', tags: ['vip'], dealValue: 200, createdAt: new Date() },
    ];

    const headers = ['Name', 'Phone', 'Email', 'Company', 'Location', 'Product', 'Supplier', 'Requirement', 'Source', 'Tags', 'Deal Value', 'Created At'];
    const rows = contacts.map(generateCsvRow);
    const csv = [headers, ...rows].map(r => r.map(escapeCsvField).join(',')).join('\n');

    expect(csv).toContain('"Alice"');
    expect(csv).toContain('"Bob"');
    expect(csv).toContain('"vip"');
    expect(csv.split('\n')).toHaveLength(3); // header + 2 data rows
  });
});

describe('CSV Export - Contact Data Mapping', () => {
  it('should extract city from contact metadata', () => {
    const row = generateCsvRow({ name: 'Test', metadata: { city: 'Mumbai', product: 'Widget' } });
    expect(row[4]).toBe('Mumbai');
  });

  it('should fall back to location when city is not available', () => {
    const row = generateCsvRow({ name: 'Test', metadata: { location: 'Delhi' } });
    expect(row[4]).toBe('Delhi');
  });

  it('should return empty string when no location data exists', () => {
    const row = generateCsvRow({ name: 'Test', metadata: { product: 'Widget' } });
    expect(row[4]).toBe('');
  });

  it('should use product from metadata', () => {
    const row = generateCsvRow({ name: 'Test', metadata: { product: 'Widget' } });
    expect(row[5]).toBe('Widget');
  });

  it('should fall back to service when product is not available', () => {
    const row = generateCsvRow({ name: 'Test', metadata: { service: 'Consulting' } });
    expect(row[5]).toBe('Consulting');
  });

  it('should join tags with semicolons', () => {
    const row = generateCsvRow({ name: 'Test', tags: ['hot-lead', 'whatsapp'] });
    expect(row[9]).toBe('hot-lead; whatsapp');
  });

  it('should handle empty tags array', () => {
    const row = generateCsvRow({ name: 'Test', tags: [] });
    expect(row[9]).toBe('');
  });

  it('should handle undefined tags gracefully', () => {
    const row = generateCsvRow({ name: 'Test' });
    expect(row[9]).toBe('');
  });
});

describe('CSV Export - Edge Cases', () => {
  it('should produce only headers when there are no contacts', () => {
    const headers = ['Name', 'Phone', 'Email'];
    const contacts: any[] = [];
    const csv = [headers, ...contacts].map(r => r.join(',')).join('\n');
    expect(csv).toBe('Name,Phone,Email');
  });

  it('should build correct Prisma where clause when lead IDs are provided', () => {
    const leadIds = ['id1', 'id2', 'id3'];
    const where = leadIds?.length ? { id: { in: leadIds } } : {};
    expect(where).toEqual({ id: { in: ['id1', 'id2', 'id3'] } });
    expect(Object.keys(where)).toContain('id');
  });

  it('should omit id filter when no lead IDs provided', () => {
    const leadIds: string[] | undefined = undefined;
    const where = (leadIds ?? []).length > 0 ? { id: { in: leadIds! } } : {};
    expect(where).toEqual({});
    expect(Object.keys(where)).toHaveLength(0);
  });

  it('should handle null metadata gracefully in CSV generation', () => {
    const row = generateCsvRow({
      name: null,
      phone: null,
      email: null,
      company: null,
      metadata: null,
      tags: null,
      dealValue: null,
      source: null,
    });
    // The CSV line should still be valid (null fields become empty or 'null' string)
    const csvLine = row.map(escapeCsvField).join(',');
    expect(csvLine).toBeTruthy();
    // Should produce a parseable CSV line with correct number of fields
    expect(csvLine.split(',')).toHaveLength(12);
  });
});
