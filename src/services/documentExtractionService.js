const pick = (text, patterns) => {
  for (const pattern of patterns) {
    const value = text.match(pattern)?.[1]?.trim();
    if (value) return value.replace(/\s{2,}/g, ' ');
  }
  return '';
};

const normalizeText = (text = '') => String(text).replace(/\0/g, ' ').replace(/[\t\r]+/g, ' ').replace(/\s{2,}/g, ' ');

function parseTenthMarksheetText(rawText) {
  const text = normalizeText(rawText);
  const year = pick(text, [/(?:year of passing|passing year|year)\s*[:\-]?\s*((?:19|20)\d{2})/i, /\b((?:19|20)\d{2})\b/]);
  const percentage = pick(text, [/(?:percentage|percent|aggregate)\s*[:\-]?\s*(\d{1,3}(?:\.\d{1,2})?)\s*%?/i]);
  const rollNumber = pick(text, [/(?:roll\s*(?:no|number)|registration\s*(?:no|number))\s*[:\-]?\s*([A-Z0-9\-/]{4,25})/i]);
  const school = pick(text, [/(?:school|institution)\s*(?:name)?\s*[:\-]?\s*([A-Z][A-Z0-9 .,&'()\-]{4,80})/i]);
  const board = pick(text, [/(CBSE|ICSE|CISCE|KARNATAKA SECONDARY EDUCATION EXAMINATION BOARD|KSEAB|KSEEB|STATE BOARD)/i]);
  const name = pick(text, [/(?:student'?s?\s*name|name of (?:the )?candidate|candidate name)\s*[:\-]?\s*([A-Z][A-Z .'-]{2,60})/i]);
  return { name, board, school, rollNumber, passingYear: year, percentage };
}

async function extractTextFallback(file) {
  if (file.type.startsWith('text/')) return file.text();
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    // Lightweight fallback for text-based PDFs. Scanned/image PDFs need backend OCR.
    return new TextDecoder('latin1').decode(bytes).replace(/\\[nrt]/g, ' ');
  }
  return '';
}

export async function extractTenthMarksheet(file) {
  if (!file) throw new Error('Please select a 10th marksheet.');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', 'TENTH_MARKSHEET');

  try {
    const token = localStorage.getItem('verifyx_token');
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
    const response = await fetch(`${baseUrl}/api/candidate/extract-document`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (response.ok) {
      const data = await response.json();
      return {
        name: data.name || data.studentName || '',
        board: data.board || '',
        school: data.school || data.institution || '',
        rollNumber: data.rollNumber || data.registrationNumber || '',
        passingYear: String(data.passingYear || data.year || ''),
        percentage: String(data.percentage || data.aggregate || ''),
        source: 'ocr-api',
      };
    }
  } catch {
    // Fall through to local text extraction when the OCR endpoint is unavailable.
  }

  const rawText = await extractTextFallback(file);
  const parsed = parseTenthMarksheetText(rawText);
  const found = Object.values(parsed).some(Boolean);
  return { ...parsed, source: found ? 'local-pdf-text' : 'manual-required' };
}
