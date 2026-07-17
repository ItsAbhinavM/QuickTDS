import { createHash } from 'node:crypto';

export function parseCsv(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (quoted) {
      if (char === '"' && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field.trim());
      field = '';
    } else if (char === '\n') {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (quoted) throw new Error('CSV contains an unterminated quoted field');
  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }
  if (rows.length < 2) throw new Error('CSV must contain a header and at least one data row');

  const headers = rows[0].map((header) => header.trim());
  if (new Set(headers).size !== headers.length) throw new Error('CSV contains duplicate headers');

  return rows.slice(1).filter((values) => values.some(Boolean)).map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw new Error(`CSV row ${rowIndex + 2} has ${values.length} columns; expected ${headers.length}`);
    }
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

export function requireColumns(rows: Record<string, string>[], columns: string[], label: string) {
  const present = new Set(Object.keys(rows[0] ?? {}));
  const missing = columns.filter((column) => !present.has(column));
  if (missing.length > 0) throw new Error(`${label} is missing columns: ${missing.join(', ')}`);
}

export function parseMoney(value: string, field: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error(`${field} must be a positive amount with at most two decimals`);
  const [whole, fraction = ''] = value.split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(paise)) throw new Error(`${field} is too large`);
  return paise;
}

export function parseDate(value: string, field: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${field} must use YYYY-MM-DD`);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`${field} is not a valid date`);
  }
  return value;
}

export function parseBoolean(value: string, field: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`${field} must be true or false`);
}

export function hash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function normalizeId(value: string, field: string): string {
  const normalized = (value || '').trim().toUpperCase();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

export function normalizeTan(value: string, field: string): string {
  const normalized = (value || '').toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z]{4}[0-9]{5}[A-Z]$/.test(normalized)) throw new Error(`${field} is not a valid TAN`);
  return normalized;
}

export function normalizePan(value: string): string {
  const normalized = (value || '').toUpperCase().replace(/\s/g, '');
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(normalized)) throw new Error('company PAN is invalid');
  return normalized;
}

export function daysBetween(left: string, right: string): number {
  return Math.abs(new Date(left).getTime() - new Date(right).getTime()) / 86_400_000;
}
