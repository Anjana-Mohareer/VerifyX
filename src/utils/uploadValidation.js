/** Client-side preflight only. Backend must independently validate uploaded files. */
const MIME = {
  pdf: ['application/pdf'], png: ['image/png'], jpg: ['image/jpeg'], jpeg: ['image/jpeg'],
  doc: ['application/msword', 'application/octet-stream'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'],
};
export async function validateUpload(file, allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg'], maxMb = 5) {
  if (!file) return 'Please select a file to upload.';
  const ext = String(file.name || '').split('.').pop().toLowerCase();
  const allowed = allowedExtensions.map(s => s.replace(/^\./, '').toLowerCase());
  if (!allowed.includes(ext)) return `Invalid file format. Allowed: ${allowed.map(s => s.toUpperCase()).join(', ')}.`;
  if (!file.size) return 'The selected file is empty. Please choose a valid file.';
  if (file.size > maxMb * 1024 * 1024) return `File is too large. Maximum allowed size is ${maxMb} MB.`;
  if (file.type && MIME[ext] && !MIME[ext].includes(file.type)) return `File content type does not match .${ext}. Please upload a genuine file.`;
  try {
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const starts = (...signature) => signature.every((value, index) => bytes[index] === value);
    const pdf = starts(0x25, 0x50, 0x44, 0x46, 0x2d);
    const png = starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    const jpg = starts(0xff, 0xd8, 0xff);
    const doc = starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
    const docx = starts(0x50, 0x4b, 0x03, 0x04);
    const matches = { pdf, png, jpg, jpeg: jpg, doc, docx };
    if (!matches[ext]) return `The selected .${ext} file appears invalid or corrupted. Please upload a genuine document.`;
  } catch { return 'Unable to read the selected file. Please select it again.'; }
  return '';
}
