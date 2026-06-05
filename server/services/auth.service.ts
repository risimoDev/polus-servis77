import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import type { User } from '@prisma/client';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface JwtPayload {
  sub:   number;
  role:  string;
  email: string;
}

export function signToken(user: Pick<User, 'id' | 'role' | 'email'>): string {
  const payload: JwtPayload = { sub: user.id, role: user.role, email: user.email };
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES as jwt.SignOptions['expiresIn'] });
}

export function verifyToken(token: string): JwtPayload {
  // jwt.verify возвращает string | jwt.JwtPayload — приводим к нашему типу через unknown
  return jwt.verify(token, env.JWT_SECRET) as unknown as JwtPayload;
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function createUser(name: string, email: string, password: string) {
  const passwordHash = await hashPassword(password);
  return prisma.user.create({ data: { name, email, passwordHash } });
}
