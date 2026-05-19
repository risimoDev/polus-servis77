import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { sendOrderMail } from '../services/mail.service.js';

const createOrderSchema = z.object({
  name:    z.string().min(2).max(100),
  phone:   z.string().min(7).max(30),
  email:   z.string().email().optional(),
  address: z.string().max(500).optional(),
  notes:   z.string().max(2000).optional(),
  items:   z.array(z.object({
    productId: z.number().int().positive(),
    qty:       z.number().int().min(1),
  })).min(1),
});

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  app.post('/orders', async (req, reply) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(422).send({ error: 'Validation error', details: parsed.error.flatten().fieldErrors });
    }

    const { name, phone, email, address, notes, items: lineItems } = parsed.data;

    const productIds = lineItems.map(i => i.productId);
    const products = await prisma.product.findMany({
      where:  { id: { in: productIds }, isActive: true },
      select: { id: true, name: true, price: true, stock: true },
    });

    if (products.length !== productIds.length) {
      return reply.code(422).send({ error: 'One or more products not found or inactive' });
    }

    const productMap = new Map(products.map(p => [p.id, p]));
    let total = 0;
    const orderItems = lineItems.map(li => {
      const product = productMap.get(li.productId)!;
      const lineTotal = Number(product.price) * li.qty;
      total += lineTotal;
      return { productId: product.id, name: product.name, price: product.price, qty: li.qty };
    });

    const userId = (req as any).jwtUser?.sub ?? null;

    const order = await prisma.order.create({
      data: { name, phone, email, address, notes, total, userId, items: { create: orderItems } },
    });

    if (email) {
      sendOrderMail(order.id, email).catch(err => req.log.warn(err, 'Order confirmation email failed'));
    }

    return reply.code(201).send({ id: order.id, total: order.total });
  });

  // Admin: list all orders
  app.get('/orders', { preHandler: [requireAdmin] }, async (req, reply) => {
    const page  = Number((req.query as any).page  ?? 1);
    const limit = Number((req.query as any).limit ?? 20);
    const skip  = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.order.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' }, include: { items: true } }),
      prisma.order.count(),
    ]);

    return reply.send({ items, total, page, limit, pages: Math.ceil(total / limit) });
  });

  // Admin: update status
  app.patch('/orders/:id/status', { preHandler: [requireAdmin] }, async (req, reply) => {
    const id     = Number((req.params as any).id);
    const status = (req.body as any)?.status;
    const allowed = ['NEW', 'CONFIRMED', 'SHIPPING', 'DONE', 'CANCELLED'];
    if (!allowed.includes(status)) return reply.code(422).send({ error: 'Invalid status' });

    const order = await prisma.order.update({ where: { id }, data: { status } });
    return reply.send(order);
  });

  // User: own orders
  app.get('/orders/my', { preHandler: [requireAuth] }, async (req, reply) => {
    const orders = await prisma.order.findMany({
      where:   { userId: req.jwtUser!.sub },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    return reply.send(orders);
  });
}
