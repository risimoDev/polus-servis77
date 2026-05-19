import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { sendContactMail } from '../services/mail.service.js';

const bodySchema = z.object({
  name:    z.string().min(2).max(100),
  phone:   z.string().min(7).max(30),
  message: z.string().max(2000).optional().default(''),
});

export async function contactRoutes(app: FastifyInstance): Promise<void> {
  app.post('/contact', async (req, reply) => {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(422).send({ error: 'Validation error', details: parsed.error.flatten().fieldErrors });
    }

    try {
      await sendContactMail(parsed.data);
      return reply.code(201).send({ ok: true });
    } catch (err) {
      req.log.error(err, 'Failed to send contact email');
      return reply.code(500).send({ error: 'Mail delivery failed' });
    }
  });
}
