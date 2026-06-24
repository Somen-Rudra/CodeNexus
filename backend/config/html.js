export const getVerifyEmailHtml = ({ email, token }) => {
  const appName = process.env.APP_NAME || "APPLICATION";
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  const verifyUrl = `${baseUrl.replace(
    /\/+$/,
    "",
  )}/token/${encodeURIComponent(token)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${appName} Verification</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#050505;
  font-family:Arial,sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
<tr>
<td align="center">

<table width="520" cellpadding="0" cellspacing="0" style="
  width:100%;
  max-width:520px;
  background:#0a0a0a;
  border:1px solid rgba(255,0,51,0.12);
  border-radius:20px;
  overflow:hidden;
  box-shadow:0 0 40px rgba(255,0,51,0.08);
">

<tr>
<td style="
  padding:24px 32px;
  border-bottom:1px solid rgba(255,0,51,0.08);
">

<div style="
  font-size:28px;
  font-weight:800;
  color:#ffffff;
">
<span style="color:#ff1f44;">${appName}</span>
</div>

</td>
</tr>

<tr>
<td style="
  padding:42px 32px;
  background:
    radial-gradient(circle at top right, rgba(255,0,51,0.14), transparent 40%),
    #0a0a0a;
">

<p style="
  margin:0 0 14px 0;
  color:#ff3a57;
  font-size:13px;
  font-weight:700;
  letter-spacing:1px;
">
ACCOUNT VERIFICATION
</p>

<h1 style="
  margin:0;
  font-size:42px;
  line-height:1.1;
  color:#ffffff;
">
Verify Your
<span style="color:#ff1f44;">Email.</span>
</h1>

<p style="
  margin:24px 0;
  color:#aaaaaa;
  font-size:15px;
  line-height:1.8;
">
Hey ${email},<br/><br/>
Click below to verify your account and start hacking interviews.
</p>

<table cellpadding="0" cellspacing="0">
<tr>
<td align="center">

<a href="${verifyUrl}"
target="_blank"
style="
  display:inline-block;
  padding:16px 32px;
  border-radius:12px;
  background:linear-gradient(180deg,#ff274b,#cf0026);
  color:#ffffff;
  text-decoration:none;
  font-size:15px;
  font-weight:700;
  box-shadow:0 0 24px rgba(255,0,51,0.35);
">
VERIFY EMAIL
</a>

</td>
</tr>
</table>

<p style="
  margin:28px 0 10px;
  color:#777;
  font-size:13px;
">
Or copy this link:
</p>

<a href="${verifyUrl}"
style="
  color:#ff3555;
  font-size:13px;
  word-break:break-all;
  text-decoration:none;
">
${verifyUrl}
</a>

</td>
</tr>

<tr>
<td style="
  padding:24px;
  text-align:center;
  color:#555;
  font-size:12px;
  border-top:1px solid rgba(255,0,51,0.08);
">
© ${new Date().getFullYear()} ${appName}. All rights reserved.
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
};

export const getOtpHtml = ({ email, otp }) => {
  const appName = process.env.APP_NAME || "APPLICATION";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${appName} OTP Verification</title>
</head>

<body style="
  margin:0;
  padding:0;
  bacground:#050505;
  font-family:Arial,sans-serif;
">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
<tr>
<td align="center">

<table width="520" cellpadding="0" cellspacing="0" style="
  width:100%;
  max-width:520px;
  background:#0a0a0a;
  border:1px solid rgba(255,0,51,0.12);
  border-radius:20px;
  overflow:hidden;
  box-shadow:0 0 40px rgba(255,0,51,0.08);
">

<tr>
<td style="
  padding:24px 32px;
  border-bottom:1px solid rgba(255,0,51,0.08);
">

<div style="
  font-size:28px;
  font-weight:800;
  color:#ffffff;
">
<span style="color:#ff1f44;">${appName}</span>
<span style="color:#ff1f44;">/&gt;</span>
</div>

</td>
</tr>

<tr>
<td style="
  padding:42px 32px;
  background:
    radial-gradient(circle at top right, rgba(255,0,51,0.14), transparent 40%),
    #0a0a0a;
">

<p style="
  margin:0 0 14px 0;
  color:#ff3a57;
  font-size:13px;
  font-weight:700;
  letter-spacing:1px;
">
SECURE LOGIN
</p>

<h1 style="
  margin:0;
  font-size:42px;
  line-height:1.1;
  color:#ffffff;
">
Your
<span style="color:#ff1f44;">OTP Code.</span>
</h1>

<p style="
  margin:24px 0;
  color:#aaaaaa;
  font-size:15px;
  line-height:1.8;
">
Hey ${email},<br/><br/>
Use the verification code below to continue your authentication.
</p>

<div style="text-align:center;margin:34px 0;">

<div style="
  display:inline-block;
  padding:18px 28px;
  border-radius:14px;
  background:#111111;
  border:1px solid rgba(255,0,51,0.15);
  color:#ff3555;
  font-size:36px;
  font-weight:800;
  letter-spacing:10px;
  box-shadow:0 0 24px rgba(255,0,51,0.18);
">
${otp}
</div>

</div>

<p style="
  margin:0;
  color:#777;
  font-size:13px;
  line-height:1.7;
">
This OTP expires in 5 minutes.<br/>
If you didn't request this, you can safely ignore this email.
</p>

</td>
</tr>

<tr>
<td style="
  padding:24px;
  text-align:center;
  color:#555;
  font-size:12px;
  border-top:1px solid rgba(255,0,51,0.08);
">
© ${new Date().getFullYear()} ${appName}. All rights reserved.
</td>
</tr>

</table>

</td>
</tr>
</table>

</body>
</html>
`;
};
