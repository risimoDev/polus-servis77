import { z } from 'zod';

const schema = z.object({
  NODE_ENV:      z.enum(['development', 'production', 'test']).default('development'),
  PORT:          z.coerce.number().default(3000),
  DATABASE_URL:  z.string().url(),
  REDIS_URL:     z.string().default('redis://localhost:6379'),
  JWT_SECRET:    z.string().min(32),
  JWT_EXPIRES:   z.string().default('7d'),
  SMTP_HOST:     z.string(),
  SMTP_PORT:     z.coerce.number().default(465),
  SMTP_SECURE:   z.coerce.boolean().default(true),
  SMTP_USER:     z.string(),
  SMTP_PASS:     z.string(),
  MAIL_FROM:     z.string().email(),
  MAIL_TO:       z.string().email(),
  CORS_ORIGINS:  z.string().default('http://localhost:3000'),
  UPLOAD_MAX_MB: z.coerce.number().default(10),
});

export type Env = z.infer<typeof schema>;

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
