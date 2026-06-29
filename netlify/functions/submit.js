const nodemailer = require('nodemailer');
require('dotenv').config();

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_TO = process.env.EMAIL_TO || 'daniel.mandazhiev09@gmail.com';

let transporter;
let isTestAccount = false;

async function initTransport() {
  if (transporter) return transporter;

  async function tryTransport(opts) {
    const candidate = nodemailer.createTransport(opts);
    await candidate.verify();
    return candidate;
  }

  if (SMTP_USER && SMTP_PASS) {
    try {
      transporter = await tryTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: { user: SMTP_USER, pass: SMTP_PASS }
      });
      return transporter;
    } catch (err) {
      console.warn('SMTP verification failed:', err && err.message ? err.message : err);
    }
  }

  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: { user: testAccount.user, pass: testAccount.pass }
    });
    isTestAccount = true;
    await transporter.verify();
    return transporter;
  } catch (err) {
    console.error('Unable to create mail transporter:', err && err.message ? err.message : err);
    throw err;
  }
}

async function verifyAddress(address) {
  try {
    const query = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'RainbowCleanRequestApp/1.0' } });
    if (!res.ok) return false;
    const results = await res.json();
    return Array.isArray(results) && results.length > 0;
  } catch (err) {
    console.error('Address verification failed:', err);
    return false;
  }
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { name, phone, address, service, senderEmail, message } = body || {};

    if (!name || name.trim().length < 2) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Невалидно име' }) };
    }

    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Невалиден телефон' }) };
    }

    if (!address || address.trim().length < 5) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Невалиден адрес' }) };
    }

    const addressOk = await verifyAddress(address.trim());
    if (!addressOk) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Адресът не може да бъде намерен. Проверете дали е зададен коректно.' }) };
    }

    if (!service) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Не е избрана услуга' }) };
    }

    if (!senderEmail || !senderEmail.trim()) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Имейлът за контакт е задължителен.' }) };
    }

    if (!/^\S+@\S+\.\S+$/.test(senderEmail)) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: false, error: 'Невалиден имейл на подателя' }) };
    }

    const mailTransporter = await initTransport();

    const mailOptions = {
      from: `"Заявки" <${SMTP_USER || 'no-reply@example.com'}>`,
      to: EMAIL_TO,
      replyTo: senderEmail.trim(),
      subject: `Нова заявка: ${service} — ${name}`,
      text: `Име: ${name}\nТелефон: ${phone}\nАдрес: ${address}\nУслуга: ${service}\nИмейл на подателя: ${senderEmail || '—'}\nСъобщение: ${message || '—'}\n`,
      html: `<p><strong>Име:</strong> ${name}</p><p><strong>Телефон:</strong> ${phone}</p><p><strong>Адрес:</strong> ${address}</p><p><strong>Услуга:</strong> ${service}</p><p><strong>Имейл на подателя:</strong> ${senderEmail || '—'}</p><p><strong>Съобщение:</strong> ${message || '—'}</p>`
    };

    const info = await mailTransporter.sendMail(mailOptions);
    const result = { success: true };

    if (isTestAccount) {
      result.previewUrl = nodemailer.getTestMessageUrl(info);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: err && err.message ? err.message : 'Възникна грешка при изпращане' })
    };
  }
};
