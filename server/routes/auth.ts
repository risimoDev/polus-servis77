import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { findUserByEmail, verifyPassword, signToken, createUser } from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { prisma } from '../lib/prisma.js';

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(6),
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2).max(100),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/login', async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(422).send({ error: 'Validation error', details: parsed.error.flatten().fieldErrors });
    }

    const user = await findUserByEmail(parsed.data.email);
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    return reply.send({ token: signToken(user), role: user.role });
  });

  app.post('/auth/register', async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(422).send({ error: 'Validation error', details: parsed.error.flatten().fieldErrors });
    }

    const existing = await findUserByEmail(parsed.data.email);
    if (existing) {
      return reply.code(409).send({ error: 'Email already taken' });
    }

    const user = await createUser(parsed.data.name, parsed.data.email, parsed.data.password);
    return reply.code(201).send({ token: signToken(user), role: user.role });
  });

  app.get('/auth/me', { preHandler: [requireAuth] }, async (req, reply) => {
    const user = await prisma.user.findUnique({
      where:  { id: req.jwtUser!.sub },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });
    if (!user) return reply.code(404).send({ error: 'User not found' });
    return reply.send(user);
  });
}
