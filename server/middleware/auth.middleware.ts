import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, type JwtPayload } from '../services/auth.service.js';

declare module 'fastify' {
  interface FastifyRequest {
    jwtUser?: JwtPayload;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }
  try {
    req.jwtUser = verifyToken(header.slice(7));
  } catch {
    reply.code(401).send({ error: 'Invalid token' });
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  await requireAuth(req, reply);
  if (!reply.sent && req.jwtUser?.role !== 'ADMIN') {
    reply.code(403).send({ error: 'Forbidden' });
  }
}
