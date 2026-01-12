const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Endpoint de Teste SMTP
app.post('/api/test-smtp', async (req, res) => {
  const { config, to } = req.body;

  if (!config || !to) {
    return res.status(400).json({ success: false, log: 'Missing configuration or recipient.' });
  }

  const logEntries = [];
  const log = (msg) => logEntries.push(`[${new Date().toLocaleTimeString()}] ${msg}`);

  log(`Initializing SMTP Transport...`);
  log(`Host: ${config.host}:${config.port}`);
  log(`User: ${config.user}`);

  try {
    // 1. Criar Transportador
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port),
      secure: config.secure, // true para 465, false para outros (geralmente)
      auth: {
        user: config.user,
        pass: config.pass,
      },
      tls: {
        rejectUnauthorized: false // Ajuda em alguns ambientes de dev, cuidado em prod estrito
      }
    });

    // 2. Verificar Conexão
    log('Verifying connection credentials...');
    await transporter.verify();
    log('Connection Verified! Credentials are valid.');

    // 3. Enviar Email de Teste
    log(`Sending test email to: ${to}...`);
    const info = await transporter.sendMail({
      from: `"${config.fromName || 'LeadScope Test'}" <${config.fromEmail || config.user}>`,
      to: to,
      subject: 'LeadScope AI - SMTP Configuration Test',
      text: 'If you are reading this, your SMTP configuration is working perfectly! This is a real email sent from your LeadScope dashboard.',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #10b981;">Connection Successful! 🚀</h2>
          <p>This is a test email from your <strong>LeadScope AI</strong> infrastructure agent.</p>
          <hr/>
          <p style="font-size: 12px; color: #666;">
            <strong>Host:</strong> ${config.host}<br/>
            <strong>Port:</strong> ${config.port}<br/>
            <strong>User:</strong> ${config.user}
          </p>
        </div>
      `
    });

    log(`Message sent: ${info.messageId}`);
    log('STATUS: SUCCESS');

    res.json({ success: true, log: logEntries.join('\n') });

  } catch (error) {
    console.error('SMTP Error:', error);
    log(`ERROR: ${error.message}`);
    if (error.code === 'EAUTH') log('Check your username and password (or App Password).');
    if (error.code === 'ESOCKET') log('Check host address and port.');
    log('STATUS: FAILED');
    
    res.status(500).json({ success: false, log: logEntries.join('\n') });
  }
});

app.listen(PORT, () => {
  console.log(`LeadScope Backend running on port ${PORT}`);
});
