const nodemailer = require('nodemailer');
const config = require('../config/default');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: config.EMAIL_SERVICE,
    auth: {
      user: config.EMAIL_USERNAME,
      pass: config.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: `${config.EMAIL_FROM} <${config.EMAIL_USERNAME}>`,
    to: options.email,
    subject: options.subject,
    html: options.message
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;