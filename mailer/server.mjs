// Полюс Сервис 77 — крошечный сервис отправки заявок с сайта.
// Без БД и фреймворков: только node:http + nodemailer.
// Эндпоинты:
//   GET  /api/health        → {ok:true}
//   POST /api/v1/contact     → принимает {name, phone, message, website?} и шлёт письмо

import http from 'node:http';
import nodemailer from 'nodemailer';

const {
  PORT = 3000,
  SMTP_HOST,
  SMTP_PORT = 465,
  SMTP_SECURE = 'true',
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  MAIL_TO,
} = process.env;

const transport = nodemailer.createTransport({
  host:   SMTP_HOST,
  port:   Number(SMTP_PORT),
  secure: String(SMTP_SECURE) === 'true',
  auth:   { user: SMTP_USER, pass: SMTP_PASS },
});

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/health') {
    return json(res, 200, { ok: true, ts: new Date().toISOString() });
  }

  if (req.method === 'POST' && req.url === '/api/v1/contact') {
    let body = '';
    let aborted = false;
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10_000) { aborted = true; req.destroy(); }   // защита от больших тел
    });
    req.on('end', async () => {
      if (aborted) return;

      let data;
      try { data = JSON.parse(body || '{}'); }
      catch { return json(res, 400, { error: 'Bad JSON' }); }

      // honeypot — у ботов поле website заполнено: тихо подтверждаем, письмо не шлём
      if (data.website) return json(res, 201, { ok: true });

      const name    = String(data.name    || '').trim();
      const phone   = String(data.phone   || '').trim();
      const message = String(data.message || '').trim().slice(0, 2000);

      if (name.length < 2 || phone.length < 7) {
        return json(res, 422, { error: 'Validation error' });
      }

      try {
        await transport.sendMail({
          from:    `"Полюс Сервис 77" <${MAIL_FROM || SMTP_USER}>`,
          to:      MAIL_TO,
          replyTo: SMTP_USER,
          subject: `Заявка с сайта — ${name}`,
          text:    `Новая заявка с сайта polus-servis77.ru\n\n`
                 + `Имя: ${name}\nТелефон: ${phone}\nСообщение: ${message || '—'}\n`,
        });
        return json(res, 201, { ok: true });
      } catch (err) {
        console.error('Mail error:', err.message);
        return json(res, 500, { error: 'Mail delivery failed' });
      }
    });
    return;
  }

  json(res, 404, { error: 'Not found' });
});

server.listen(Number(PORT), () => console.log(`Mailer listening on :${PORT}`));
