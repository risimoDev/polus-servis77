import type { FastifyInstance } from 'fastify';
import { contactRoutes } from './contact.js';
import { authRoutes }    from './auth.js';
import { productRoutes } from './products.js';
import { orderRoutes }   from './orders.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // Health check (no prefix)
  app.get('/api/health', async (_req, reply) => {
    return reply.send({ ok: true, ts: new Date().toISOString() });
  });

  // Versioned API
  await app.register(
    async (v1) => {
      await v1.register(contactRoutes);
      await v1.register(authRoutes);
      await v1.register(productRoutes);
      await v1.register(orderRoutes);
    },
    { prefix: '/api/v1' },
  );
}
