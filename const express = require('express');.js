const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // serve index.html for quick testing

// Configure via env vars:
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT===465;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const EMAIL_TO = process.env.EMAIL_TO || 'daniel.mandazhiev09@gmail.com';

if(!SMTP_USER || !SMTP_PASS){
  console.warn('Warning: SMTP_USER or SMTP_PASS not set. Email sending will fail until configured.');
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

app.post('/submit', async (req, res) => {
  try{
    const {name, phone, address, service} = req.body || {};

    // basic server-side validation (same rules as client)
    if(!name || name.trim().length<2) return res.json({success:false, error:'Невалидно име'});
    const digits = (phone||'').replace(/\D/g,'');
    if(digits.length < 7 || digits.length > 15) return res.json({success:false, error:'Невалиден телефон'});
    if(!address || address.trim().length < 5) return res.json({success:false, error:'Невалиден адрес'});
    if(!service) return res.json({success:false, error:'Не е избрана услуга'});

    const mailOptions = {
      from: `"Заявки" <${SMTP_USER}>`,
      to: EMAIL_TO,
      subject: `Нова заявка: ${service} — ${name}`,
      text: `Име: ${name}\nТелефон: ${phone}\nАдрес: ${address}\nУслуга: ${service}\n`,
      html: `<p><strong>Име:</strong> ${name}</p><p><strong>Телефон:</strong> ${phone}</p><p><strong>Адрес:</strong> ${address}</p><p><strong>Услуга:</strong> ${service}</p>`
    };

    await transporter.sendMail(mailOptions);
    return res.json({success:true});
  }catch(err){
    console.error(err);
    return res.status(500).json({success:false, error: err.message});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Server running on', PORT));