const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Configure via env vars (fall back to Ethereal test account if creds missing)
let SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
let SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;
let SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT===465;
let SMTP_USER = process.env.SMTP_USER || '';
let SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_TO = process.env.EMAIL_TO || 'daniel.mandazhiev09@gmail.com';

let transporter;
let isTestAccount = false;

async function initTransport(){
  // helper: try to create and verify a transporter for given options
  async function tryTransport(opts){
    try{
      const t = nodemailer.createTransport(opts);
      await t.verify();
      return t;
    }catch(err){
      // return error to caller
      return { error: err };
    }
  }

  if(SMTP_USER && SMTP_PASS){
    console.log('Attempting configured SMTP server:', SMTP_HOST, SMTP_PORT, 'secure=', SMTP_SECURE);
    const primaryOpts = { host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE, auth: { user: SMTP_USER, pass: SMTP_PASS } };
    const primary = await tryTransport(primaryOpts);
    if(primary && !primary.error){
      transporter = primary;
      console.log('SMTP verification successful — credentials accepted (primary).');
      return;
    }

    console.warn('Primary SMTP verification failed:', primary && primary.error ? (primary.error.message || primary.error) : primary);

    // try fallback port (toggle between 465 and 587)
    const altPort = (SMTP_PORT === 465) ? 587 : 465;
    const altSecure = (altPort === 465);
    console.log('Attempting fallback SMTP settings:', SMTP_HOST, altPort, 'secure=', altSecure);
    const altOpts = { host: SMTP_HOST, port: altPort, secure: altSecure, auth: { user: SMTP_USER, pass: SMTP_PASS } };
    const alt = await tryTransport(altOpts);
    if(alt && !alt.error){
      transporter = alt;
      SMTP_PORT = altPort; SMTP_SECURE = altSecure;
      console.log('SMTP verification successful — credentials accepted (fallback).');
      return;
    }

    console.warn('Fallback SMTP verification failed:', alt && alt.error ? (alt.error.message || alt.error) : alt);
    console.warn('Will fall back to Ethereal test account (no real emails will be sent).');
  }

  // create ethereal test account as last resort
  try{
    const testAcct = await nodemailer.createTestAccount();
    SMTP_HOST = testAcct.smtp.host;
    SMTP_PORT = testAcct.smtp.port;
    SMTP_SECURE = testAcct.smtp.secure;
    SMTP_USER = testAcct.user;
    SMTP_PASS = testAcct.pass;
    transporter = nodemailer.createTransport({ host: SMTP_HOST, port: SMTP_PORT, secure: SMTP_SECURE, auth: { user: SMTP_USER, pass: SMTP_PASS } });
    isTestAccount = true;
    console.log('Using Ethereal test account as fallback. Preview URLs will be available in logs.');
    try{
      await transporter.verify();
      console.log('Ethereal SMTP verification successful.');
    }catch(e){
      console.error('Ethereal verification failed:', e && e.message ? e.message : e);
    }
  }catch(err){
    console.error('Failed to create Ethereal test account or transporter:', err && err.message ? err.message : err);
  }
}

// initialize transporter (top-level)
initTransport().catch(err=>{
  console.error('Failed to init mail transport:', err);
});

async function verifyAddress(address){
  try{
    const query = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'RainbowCleanRequestApp/1.0' } });
    if(!res.ok) return false;
    const results = await res.json();
    return Array.isArray(results) && results.length > 0;
  }catch(err){
    console.error('Address verification failed:', err);
    return false;
  }
}

app.post('/submit', async (req, res) => {
  try{
    const {name, phone, address, service, senderEmail} = req.body || {};

    // basic server-side validation (same rules as client)
    if(!name || name.trim().length<2) return res.json({success:false, error:'Невалидно име'});
    const digits = (phone||'').replace(/\D/g,'');
    if(digits.length < 7 || digits.length > 15) return res.json({success:false, error:'Невалиден телефон'});
    if(!address || address.trim().length < 5) return res.json({success:false, error:'Невалиден адрес'});
    const addressOk = await verifyAddress(address.trim());
    if(!addressOk) return res.json({success:false, error:'Адресът не може да бъде намерен. Проверете дали е зададен коректно.'});
    if(!service) return res.json({success:false, error:'Не е избрана услуга'});
    if(!senderEmail || !senderEmail.trim()) return res.json({success:false, error:'Имейлът за контакт е задължителен.'});
    if(!/^\S+@\S+\.\S+$/.test(senderEmail)) return res.json({success:false, error:'Невалиден имейл на подателя'});

    const mailOptions = {
      from: `"Заявки" <${SMTP_USER || 'no-reply@example.com'}>`,
      to: EMAIL_TO,
      subject: `Нова заявка: ${service} — ${name}`,
      text: `Име: ${name}\nТелефон: ${phone}\nАдрес: ${address}\nУслуга: ${service}\nИмейл на подателя: ${senderEmail || '—'}\n`,
      html: `<p><strong>Име:</strong> ${name}</p><p><strong>Телефон:</strong> ${phone}</p><p><strong>Адрес:</strong> ${address}</p><p><strong>Услуга:</strong> ${service}</p><p><strong>Имейл на подателя:</strong> ${senderEmail || '—'}</p>`
    };

    if(senderEmail && senderEmail.trim()){
      mailOptions.replyTo = senderEmail.trim();
    }

    const info = await transporter.sendMail(mailOptions);
    const result = { success: true };
    if(isTestAccount){
      const preview = nodemailer.getTestMessageUrl(info);
      console.log('Preview URL:', preview);
      result.previewUrl = preview;
    }
    return res.json(result);
  }catch(err){
    console.error(err);
    return res.status(500).json({success:false, error: err.message});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Server running on', PORT));
