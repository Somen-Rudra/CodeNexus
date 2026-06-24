import { createTransport } from "nodemailer";
import ENV from "./env.js";

const transport = createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: { user: ENV.SMTP_USER, pass: ENV.SMTP_PASSWORD },
});

const sendMail = async ({ email, subject, html }) => {
  const info = await transport.sendMail({
    from: `"${ENV.APP_NAME}" <${ENV.SMTP_USER}>`,
    to: email,
    subject,
    html,
  });
  console.log("Mail sent:", info.messageId);
};

export default sendMail;