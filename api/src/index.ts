import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { nanoid } from 'nanoid';
import { sql, initDatabase } from './db.js';

const app = new Hono();

// CORS — configurable via CORS_ORIGINS env var (comma-separated)
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://ai-roi-modeler.vercel.app',
];
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : defaultOrigins;

app.use(
  '/api/*',
  cors({
    origin: corsOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })
);

// Simple in-memory rate limiter (per IP, 60 requests/minute for writes)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Apply rate limiting to all POST endpoints
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'POST') {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    if (rateLimit(ip)) {
      return c.json({ error: 'Too many requests. Please try again later.' }, 429);
    }
  }
  await next();
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// POST /api/models — Save a new model
app.post('/api/models', async (c) => {
  try {
    const body = await c.req.json();
    const { formData } = body;

    if (!formData || typeof formData !== 'object') {
      return c.json({ error: 'formData is required and must be an object' }, 400);
    }

    const shareToken = nanoid(7);

    const [row] = await sql`
      INSERT INTO models (share_token, form_data, industry, company_size, process_type, project_archetype)
      VALUES (
        ${shareToken},
        ${JSON.stringify(formData)},
        ${formData.industry || null},
        ${formData.companySize || null},
        ${formData.processType || null},
        ${formData.projectArchetype || null}
      )
      RETURNING id, share_token
    `;

    return c.json(
      { id: row.id, shareToken: row.share_token },
      201
    );
  } catch (err) {
    console.error('POST /api/models error:', err);
    return c.json({ error: 'Failed to save model' }, 500);
  }
});

// GET /api/models/:id — Load model by UUID
app.get('/api/models/:id', async (c) => {
  try {
    const { id } = c.req.param();

    const [row] = await sql`
      SELECT id, share_token, form_data, industry, company_size, process_type, project_archetype, created_at, updated_at
      FROM models
      WHERE id = ${id} AND deleted_at IS NULL
    `;

    if (!row) {
      return c.json({ error: 'Model not found' }, 404);
    }

    return c.json({
      id: row.id,
      shareToken: row.share_token,
      formData: row.form_data,
      industry: row.industry,
      companySize: row.company_size,
      processType: row.process_type,
      projectArchetype: row.project_archetype,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    console.error('GET /api/models/:id error:', err);
    return c.json({ error: 'Failed to load model' }, 500);
  }
});

// PUT /api/models/:id — Update model
app.put('/api/models/:id', async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();
    const { formData } = body;

    if (!formData || typeof formData !== 'object') {
      return c.json({ error: 'formData is required and must be an object' }, 400);
    }

    const [row] = await sql`
      UPDATE models
      SET form_data = ${JSON.stringify(formData)},
          industry = ${formData.industry || null},
          company_size = ${formData.companySize || null},
          process_type = ${formData.processType || null},
          project_archetype = ${formData.projectArchetype || null},
          updated_at = NOW()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id, share_token
    `;

    if (!row) {
      return c.json({ error: 'Model not found' }, 404);
    }

    return c.json({ id: row.id, shareToken: row.share_token });
  } catch (err) {
    console.error('PUT /api/models/:id error:', err);
    return c.json({ error: 'Failed to update model' }, 500);
  }
});

// DELETE /api/models/:id — Soft delete
app.delete('/api/models/:id', async (c) => {
  try {
    const { id } = c.req.param();

    const [row] = await sql`
      UPDATE models
      SET deleted_at = NOW()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id
    `;

    if (!row) {
      return c.json({ error: 'Model not found' }, 404);
    }

    return c.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/models/:id error:', err);
    return c.json({ error: 'Failed to delete model' }, 500);
  }
});

// GET /api/share/:token — Load by share token (public)
app.get('/api/share/:token', async (c) => {
  try {
    const { token } = c.req.param();

    const [row] = await sql`
      SELECT id, share_token, form_data, industry, company_size, process_type, project_archetype, created_at
      FROM models
      WHERE share_token = ${token} AND deleted_at IS NULL
    `;

    if (!row) {
      return c.json({ error: 'Shared model not found' }, 404);
    }

    return c.json({
      id: row.id,
      shareToken: row.share_token,
      formData: row.form_data,
      industry: row.industry,
      companySize: row.company_size,
      processType: row.process_type,
      projectArchetype: row.project_archetype,
      createdAt: row.created_at,
    });
  } catch (err) {
    console.error('GET /api/share/:token error:', err);
    return c.json({ error: 'Failed to load shared model' }, 500);
  }
});

// POST /api/leads — Capture lead from report download gate
app.post('/api/leads', async (c) => {
  try {
    const body = await c.req.json();
    const { email, name, industry, companySize, source } = body;

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return c.json({ error: 'Valid email is required' }, 400);
    }

    const [row] = await sql`
      INSERT INTO leads (email, name, industry, company_size, source)
      VALUES (
        ${email.toLowerCase().trim()},
        ${name || null},
        ${industry || null},
        ${companySize || null},
        ${source || 'report_download'}
      )
      RETURNING id
    `;

    return c.json({ id: row.id }, 201);
  } catch (err) {
    console.error('POST /api/leads error:', err);
    return c.json({ error: 'Failed to capture lead' }, 500);
  }
});

// Start server
const port = parseInt(process.env.PORT || '3000', 10);

await initDatabase();

serve({ fetch: app.fetch, port }, (info: { port: number }) => {
  console.log(`API server running on http://localhost:${info.port}`);
});
