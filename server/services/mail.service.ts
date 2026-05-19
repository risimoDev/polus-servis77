import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transport = nodemailer.createTransport({
  host:   env.SMTP_HOST,
  port:   env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth:   { user: env.SMTP_USER, pass: env.SMTP_PASS },
});

export interface ContactPayload {
  name:    string;
  phone:   string;
  message: string;
}

export async function sendContactMail(data: ContactPayload): Promise<void> {
  const text = `Новая заявка с сайта polus-servis77.ru\n\nИмя: ${data.name}\nТелефон: ${data.phone}\nСообщение: ${data.message || '—'}`;

  await transport.sendMail({
    from:    `"Полюс Сервис 77" <${env.SMTP_USER}>`,
    to:      env.MAIL_TO,
    replyTo: env.SMTP_USER,
    subject: `Заявка с сайта — ${data.name}`,
    text,
  });
}

export async function sendOrderMail(orderId: number, customerEmail: string): Promise<void> {
  await transport.sendMail({
    from:    `"Полюс Сервис 77" <${env.SMTP_USER}>`,
    to:      customerEmail,
    subject: `Ваш заказ #${orderId} принят`,
    text:    `Здравствуйте!\n\nВаш заказ #${orderId} принят и передан в обработку.\nМенеджер свяжется с вами в ближайшее время.\n\nС уважением,\nПолюс Сервис 77`,
  });
}
