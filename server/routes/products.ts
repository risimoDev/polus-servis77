import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const listQuerySchema = z.object({
  categoryId: z.coerce.number().optional(),
  page:       z.coerce.number().min(1).default(1),
  limit:      z.coerce.number().min(1).max(100).default(24),
  search:     z.string().optional(),
});

export async function productRoutes(app: FastifyInstance): Promise<void> {
  app.get('/products', async (req, reply) => {
    const q = listQuerySchema.safeParse(req.query);
    if (!q.success) return reply.code(422).send({ error: 'Invalid query' });

    const { categoryId, page, limit, search } = q.data;
    const skip = (page - 1) * limit;

    const where = {
      isActive:   true,
      ...(categoryId ? { categoryId } : {}),
      ...(search    ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take:    limit,
        orderBy: { createdAt: 'desc' },
        select:  { id: true, name: true, slug: true, price: true, oldPrice: true, images: true, stock: true },
      }),
      prisma.product.count({ where }),
    ]);

    return reply.send({ items, total, page, limit, pages: Math.ceil(total / limit) });
  });

  app.get('/products/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const product = await prisma.product.findUnique({
      where:  { slug },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });
    if (!product || !product.isActive) return reply.code(404).send({ error: 'Not found' });
    return reply.send(product);
  });

  app.get('/categories', async (_req, reply) => {
    const categories = await prisma.category.findMany({
      where:   { parentId: null },
      orderBy: { sortOrder: 'asc' },
      include: { children: { orderBy: { sortOrder: 'asc' } } },
    });
    return reply.send(categories);
  });
}
