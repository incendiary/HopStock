/**
 * POST /api/scan-receipt
 *
 * Accepts an image (JPEG/PNG/WEBP/GIF) or PDF receipt and attempts to extract
 * purchase fields using the Anthropic Claude vision API.
 *
 * Requires ANTHROPIC_API_KEY in the environment. If absent, returns 501 so the
 * client can hide the scan button.
 *
 * Returns: { purchase_date, purchase_price, purchase_currency, retailer,
 *             serial_number, model_number, warranty_expires }
 * Any field that could not be determined is null.
 */

import { Router }  from 'express';
import multer      from 'multer';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(_req, file, cb) {
    const ok = /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/.test(file.mimetype);
    cb(ok ? null : new Error('Only images and PDF files are supported'), ok);
  },
});

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';

const SYSTEM_PROMPT = `You are a receipt parser. Extract purchase information from the provided receipt image or document.
Return ONLY valid JSON with these exact keys (use null for any field you cannot determine):
{
  "purchase_date":     "YYYY-MM-DD or null",
  "purchase_price":    number or null,
  "purchase_currency": "3-letter ISO code or null",
  "retailer":          "string or null",
  "serial_number":     "string or null",
  "model_number":      "string or null",
  "warranty_expires":  "YYYY-MM-DD or null"
}
Do not include any explanation, markdown, or extra text — only the JSON object.`;

// GET /api/scan-receipt/available  — lets client know if feature is configured
router.get('/available', (_req, res) => {
  res.json({ available: !!process.env.ANTHROPIC_API_KEY });
});

// POST /api/scan-receipt
router.post('/', upload.single('receipt'), async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(501).json({
      error: 'Receipt scanning is not configured. Set ANTHROPIC_API_KEY in your environment.',
    });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { mimetype, buffer } = req.file;
  const base64 = buffer.toString('base64');

  // Build the content block — image vs. document (PDF)
  let contentBlock;
  if (mimetype === 'application/pdf') {
    contentBlock = {
      type:   'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 },
    };
  } else {
    contentBlock = {
      type:   'image',
      source: { type: 'base64', media_type: mimetype, data: base64 },
    };
  }

  try {
    const response = await fetch(ANTHROPIC_API, {
      method:  'POST',
      headers: {
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-opus-4-5',
        max_tokens: 512,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: [contentBlock] }],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(502).json({
        error: `Receipt scan failed: ${err.error?.message ?? response.statusText}`,
      });
    }

    const data   = await response.json();
    const text   = data.content?.[0]?.text ?? '{}';
    const parsed = JSON.parse(text);

    // Sanitise — only return known keys
    const result = {
      purchase_date:     parsed.purchase_date     ?? null,
      purchase_price:    parsed.purchase_price    ?? null,
      purchase_currency: parsed.purchase_currency ?? null,
      retailer:          parsed.retailer          ?? null,
      serial_number:     parsed.serial_number     ?? null,
      model_number:      parsed.model_number      ?? null,
      warranty_expires:  parsed.warranty_expires  ?? null,
    };

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `Scan error: ${err.message}` });
  }
});

export default router;
