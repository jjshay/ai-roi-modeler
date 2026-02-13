import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { nanoid } from 'nanoid';
import { sql, initDatabase } from './db.js';

const app = new Hono();

// CORS — allow localhost dev + Vercel production
app.use(
  '/api/*',
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:4173',
      'https://ai-roi-modeler.vercel.app',
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })
);

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
      INSERT INTO models (share_token, form_data, industry, company_size, process_type)
      VALUES (
        ${shareToken},
        ${JSON.stringify(formData)},
        ${formData.industry || null},
        ${formData.companySize || null},
        ${formData.processType || null}
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
      SELECT id, share_token, form_data, industry, company_size, process_type, created_at, updated_at
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
      SELECT id, share_token, form_data, industry, company_size, process_type, created_at
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
      createdAt: row.created_at,
    });
  } catch (err) {
    console.error('GET /api/share/:token error:', err);
    return c.json({ error: 'Failed to load shared model' }, 500);
  }
});

// Start server
const port = parseInt(process.env.PORT || '3000', 10);

await initDatabase();

serve({ fetch: app.fetch, port }, (info: { port: number }) => {
  console.log(`API server running on http://localhost:${info.port}`);
});
