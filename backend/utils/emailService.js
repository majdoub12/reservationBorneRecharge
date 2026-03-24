const nodemailer = require('nodemailer');

const sendEmail = async (to, subject, html) => {
  const { EMAIL_USER, EMAIL_PASS } = process.env;

  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error('Missing EMAIL_USER or EMAIL_PASS in .env');
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  try {
    if (process.env.NODE_ENV !== 'production') {
      await transporter.verify();
    }

    await transporter.sendMail({
      from: `IDD Car Reservation <${EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`[EMAIL] Sent to ${to}`);
  } catch (error) {
    console.error('Nodemailer error:', {
      code: error?.code,
      response: error?.response,
      message: error?.message,
    });
    throw error;
  }
};

module.exports = { sendEmail };