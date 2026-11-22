import { category, measures, numberInput, recordFields, recordHeaders } from '../record.mjs';
import { serviceToken } from './auth.mjs';
import { ApiError } from './errors.mjs';

const auditHeaders = ['ID Rekod API', 'ID Akaun Pegawai', 'Status Rekod API'];
const metadataKey = 'dvs_gsi_record';
const inputs = ['date', 'id', 'breed', 'age', 'location', 'body', 'left', 'right'];
export const recordKeyPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

function requiredText(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 200) {
    throw new ApiError(400, 'invalid_record');
  }
  return value.trim();
}

export function validateRecord(input, officer) {
  if (typeof input?.recordKey !== 'string' || !recordKeyPattern.test(input.recordKey)) {
    throw new ApiError(400, 'invalid_record_key');
  }
  const date = requiredText(input.date);
  const parsed = new Date(date);
  const age = numberInput(input.age);
  const weights = measures(input.body, input.left, input.right);
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date ||
      !Number.isFinite(age) || age < 0 || age > 240 || !weights) {
    throw new ApiError(400, 'invalid_record');
  }
  return {
    recordKey: input.recordKey,
    owner: officer.sub,
    date,
    id: requiredText(input.id),
    breed: requiredText(input.breed),
    age,
    officer: officer.name,
    location: requiredText(input.location),
    body: weights.b,
    left: weights.l,
    right: weights.r,
    total: Number(weights.total.toFixed(2)),
    gsi: Number(weights.gsi.toFixed(2)),
    category: category(weights.gsi),
    savedAt: new Date().toISOString(),
  };
}

function rowData(values) {
  return {
    values: values.map(value => ({
      userEnteredValue: typeof value === 'number' ? { numberValue: value } : { stringValue: value },
    })),
  };
}

function canDelete(record, officer) {
  return Boolean(record.recordKey && (officer.admin || record.owner === officer.sub));
}

export function publicRecord(record, officer) {
  const values = Object.fromEntries(recordFields.map(field => [field, record[field]]));
  if (record.recordKey) {
    values.total = Number(values.total).toFixed(2);
    values.gsi = Number(values.gsi).toFixed(2);
  }
  return { ...values, recordKey: record.recordKey, canDelete: canDelete(record, officer) };
}

class SheetsError extends Error {
  constructor(status) {
    super('Google Sheets request failed');
    this.status = status;
  }
}

export class RecordSheet {
  constructor(env) {
    this.tab = env.SHEETS_TAB;
    this.range = "'" + this.tab.replaceAll("'", "''") + "'!A1:P";
    this.base = 'https://sheets.googleapis.com/v4/spreadsheets/' +
      encodeURIComponent(env.SHEETS_SPREADSHEET_ID);
    this.secret = env.GOOGLE_SERVICE_ACCOUNT_JSON;
  }

  async request(path, body) {
    const token = await serviceToken(this.secret);
    const response = await fetch(this.base + path, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        ...(body && { 'Content-Type': 'application/json' }),
      },
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    }).catch(() => { throw new SheetsError(0); });
    if (!response.ok) {
      await response.body?.cancel();
      throw new SheetsError(response.status);
    }
    return response.json();
  }

  async sheetId() {
    const { sheets } = await this.request('?fields=sheets(properties(sheetId,title,gridProperties(columnCount)))');
    const tab = sheets?.map(sheet => sheet.properties).find(properties => properties.title === this.tab);
    if (!Number.isInteger(tab?.sheetId) || !(tab.gridProperties?.columnCount >= 16)) {
      throw new ApiError(503, 'sheets_schema');
    }
    return tab.sheetId;
  }

  async read() {
    const { values = [] } = await this.request('/values/' + encodeURIComponent(this.range) +
      '?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING');
    const [header = [], ...rows] = values;
    const needsHeaders = auditHeaders.every((_, index) => !header[index + 13]);
    if (!recordHeaders.every((label, index) => label === header[index]) ||
        (!needsHeaders && !auditHeaders.every((label, index) => label === header[index + 13]))) {
      throw new ApiError(503, 'sheets_schema');
    }

    const records = [];
    for (const row of rows) {
      if (!row.some(value => value !== '' && value != null)) continue;
      const record = Object.fromEntries(recordFields.map((field, index) => [field, row[index] ?? '']));
      const [recordKey = '', owner = '', state = ''] = row.slice(13);
      if (recordKey || owner || state) {
        if (needsHeaders || typeof recordKey !== 'string' || typeof owner !== 'string' ||
            typeof state !== 'string' || !recordKeyPattern.test(recordKey) || !/^\d{1,255}$/.test(owner) ||
            (state !== 'AKTIF:' + recordKey && !/^DIPADAM:[\dTZ:.\-]+:\d{1,255}$/.test(state))) {
          throw new ApiError(503, 'sheets_schema');
        }
      }
      records.push({ ...record, recordKey, owner, deleted: state.startsWith('DIPADAM:') });
    }
    return { records, needsHeaders };
  }

  async list(officer) {
    const { records } = await this.read();
    return records.reverse().filter(record => !record.deleted && (officer.admin || record.owner === officer.sub))
      .map(record => publicRecord(record, officer));
  }

  async save(record, officer) {
    const checkExisting = records => {
      const existing = records.find(item => item.recordKey === record.recordKey);
      if (!existing) return null;
      if (existing.owner !== officer.sub || inputs.some(field => existing[field] !== record[field])) {
        throw new ApiError(409, 'record_key_conflict');
      }
      if (existing.deleted) throw new ApiError(409, 'record_deleted');
      return { record: publicRecord(existing, officer), created: false };
    };
    const before = await this.read();
    const existing = checkExisting(before.records);
    if (existing) return existing;

    const sheetId = await this.sheetId();
    // Sheets rejects an existing metadata ID and applies the entire batch atomically.
    // A retry cannot append a second row even if the first request finishes late.
    const metadataId = parseInt(record.recordKey.slice(0, 8), 16) % 2147483647 + 1;
    const requests = [];
    if (before.needsHeaders) {
      requests.push({ updateCells: {
        start: { sheetId, rowIndex: 0, columnIndex: 13 },
        rows: [rowData(auditHeaders)],
        fields: 'userEnteredValue',
      } });
    }
    requests.push(
      { createDeveloperMetadata: {
        developerMetadata: {
          location: { sheetId },
          visibility: 'DOCUMENT',
          metadataId,
          metadataKey,
          metadataValue: record.recordKey,
        },
      } },
      { appendCells: {
        sheetId,
        rows: [rowData([
          ...recordFields.map(field => record[field]),
          record.recordKey,
          record.owner,
          'AKTIF:' + record.recordKey,
        ])],
        fields: 'userEnteredValue',
      } },
    );
    try {
      await this.request(':batchUpdate', { requests });
    } catch (error) {
      const found = checkExisting((await this.read()).records);
      if (found) return found;
      if (error.status === 400 || error.status === 409) {
        const marker = await this.request('/developerMetadata/' + metadataId).catch(failure => {
          if (failure.status !== 404) throw failure;
        });
        if (marker && marker.metadataValue !== record.recordKey) {
          throw new ApiError(409, 'record_key_conflict');
        }
      }
      throw error;
    }
    return { record: publicRecord(record, officer), created: true };
  }

  async delete(key, officer) {
    const { records } = await this.read();
    const record = records.find(item => item.recordKey === key);
    if (!record || !canDelete(record, officer)) throw new ApiError(404, 'record_not_found');
    if (record.deleted) return;
    const sheetId = await this.sheetId();
    // An exact cell match remains correct if somebody sorts or inserts a row.
    const { replies } = await this.request(':batchUpdate', { requests: [{ findReplace: {
      find: 'AKTIF:' + key,
      replacement: 'DIPADAM:' + new Date().toISOString() + ':' + officer.sub,
      matchEntireCell: true,
      matchCase: true,
      includeFormulas: false,
      range: { sheetId, startRowIndex: 1, startColumnIndex: 15, endColumnIndex: 16 },
    } }] });
    if (!replies?.[0]?.findReplace?.occurrencesChanged) {
      const latest = (await this.read()).records.find(item => item.recordKey === key);
      if (!latest?.deleted) throw new ApiError(409, 'record_changed');
    }
  }
}

export function sheetsFailure(error) {
  if (!(error instanceof SheetsError)) return error;
  if ([401, 403, 404].includes(error.status)) return new ApiError(503, 'sheets_access');
  if (error.status === 429) return new ApiError(503, 'sheets_quota');
  return new ApiError(503, 'sheets_unavailable');
}
