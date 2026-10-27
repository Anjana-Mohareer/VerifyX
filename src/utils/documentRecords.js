// Normalize the common list, wrapper, and map shapes returned by upload/review APIs.
// Only actual file metadata qualifies as an uploaded document; a hasPassport
// boolean by itself never proves a file was saved.
const DOCUMENT_FIELDS = {
  passport: 'Passport', passportDocument: 'Passport', passportFile: 'Passport',
  visa: 'Visa', visaDocument: 'Visa', visaFile: 'Visa',
};

export function documentName(record = {}) {
  const raw = record.documentType || record.docType || record.typeName ||
    record.documentName || record.name || record.category || record.type || '';
  return String(raw).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function getDocumentRecords(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload.flatMap(getDocumentRecords);
  if (typeof payload !== 'object') return [];

  const wrappers = ['documents', 'uploadedDocuments', 'documentDetails', 'files', 'content', 'items', 'data'];
  const nested = wrappers.flatMap((key) => {
    const value = payload[key];
    return value && value !== payload ? getDocumentRecords(value) : [];
  });
  const mapped = Object.entries(DOCUMENT_FIELDS).flatMap(([key, name]) => {
    const value = payload[key];
    if (!value) return [];
    if (typeof value === 'object' && !Array.isArray(value)) {
      return getDocumentRecords({ ...value, documentType: name });
    }
    return typeof value === 'string' && value.trim()
      ? [{ documentType: name, fileName: value.split('/').pop(), fileUrl: value }]
      : [];
  });

  const hasFile = payload.fileName || payload.originalFileName || payload.filename ||
    payload.documentId || payload.fileId || payload.fileUrl || payload.downloadUrl ||
    (payload.id && documentName(payload));
  const current = hasFile ? [payload] : [];
  const seen = new Set();
  return [...current, ...nested, ...mapped].filter((doc) => {
    const key = `${doc.id || doc.documentId || doc.fileId || ''}:${documentName(doc)}:${doc.fileName || doc.filename || doc.originalFileName || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function hasTravelDocument(payload, kind) {
  const expected = String(kind).toLowerCase();
  return getDocumentRecords(payload).some((record) => documentName(record).includes(expected));
}
