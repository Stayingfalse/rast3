// Email templates for NextAuth.js magic links with Christmas/Secret Santa branding

interface EmailTemplateParams {
  url: string;
  host: string;
  email: string;
}

function createMagicLinkEmailTemplate({ url, host, email }: EmailTemplateParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `🎅 Sign in to ${host} - Your Magic Link is Here!`;
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to ${host}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
      line-height: 1.6;
      color: #f9fafb;
      background-color: #13264D;
      background-image: url('https://${host}/plaid.png');
      background-repeat: repeat;
      background-attachment: fixed;
      background-position: top;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .email-wrapper {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      backdrop-filter: blur(10px);
    }
    .header {
      background: #13264D;
      padding: 40px 20px 30px;
      text-align: center;
      color: white;
      position: relative;
    }
    .header-logo {
      max-width: 400px;
      width: 100%;
      height: auto;
      margin-bottom: 15px;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
      color: #f9fafb;
    }
    .header .emoji {
      font-size: 36px;
      margin-bottom: 10px;
      display: block;
    }
    .content {
      padding: 40px 30px;
      text-align: center;
      background: white;
      color: #1f2937;
    }
    .greeting {
      font-size: 20px;
      color: #1f2937;
      margin-bottom: 20px;
      font-weight: 600;
    }
    .message {
      font-size: 16px;
      color: #4b5563;
      margin-bottom: 30px;
      line-height: 1.7;
    }
    .cta-button {
      display: inline-block;
      background: #dc2626;
      color: white !important;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 18px;
      box-shadow: 0 4px 14px rgba(220, 38, 38, 0.3);
      transition: all 0.3s ease;
      margin: 20px 0;
      border: none;
    }
    .cta-button:hover {
      background: #b91c1c;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);
    }
    .security-note {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 20px;
      margin: 30px 0;
      color: #166534;
      font-size: 14px;
    }
    .security-note .icon {
      color: #16a34a;
      font-size: 18px;
      margin-right: 8px;    }
    .footer {
      background: #1f2937;
      padding: 20px 30px;
      text-align: center;
      border-top: 1px solid #374151;
      color: #f9fafb;
      font-size: 14px;
    }
    .footer-divider {
      margin: 15px 0;
      height: 1px;
      background: #374151;
    }
    .christmas-decoration {
      font-size: 24px;
      margin: 20px 0;
      opacity: 0.8;
    }
    @media (max-width: 600px) {
      .container {
        padding: 10px;
      }
      .content {
        padding: 30px 20px;
      }
      .cta-button {
        display: block;
        width: 100%;
        box-sizing: border-box;
      }
      .header-logo {
        max-width: 300px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <div class="header">
        <img src="https://${host}/header.svg" alt="Random Acts of Santa 2025" class="header-logo">
        <h1>Magic Link Ready!</h1>
      </div>
      
      <div class="content">
        <div class="greeting">Ho ho ho! 🎄</div>
        
        <p class="message">
          We've prepared your magic link to sign in to <strong>${host}</strong>. 
          Just like Santa's sleigh, this link will take you straight to your destination!
        </p>
        
        <div class="christmas-decoration">🎁 ❄️ 🔔 ❄️ 🎁</div>
          <a href="${url}" class="cta-button">
          🎅 Sign In Now
        </a>
        
        <div class="security-note">
          <div>
            <span class="icon">🔒</span>
            <strong>Security Note:</strong> This magic link will expire in 24 hours and can only be used once. 
            If you didn't request this email, you can safely ignore it.
          </div>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          Having trouble with the button? Copy and paste this link into your browser:<br>
          <span style="word-break: break-all; color: #dc2626;">${url}</span>
        </p>
      </div>
        <div class="footer">
        <p>🎄 Happy holidays from the ${host} team! 🎄</p>
        <div class="footer-divider"></div>
        <p>
          This email was sent to <strong>${email}</strong><br>
          If you have any questions, please contact our support team.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `
🎅 Sign in to ${host}

Ho ho ho! 🎄

We've prepared your magic link to sign in to ${host}. Just like Santa's sleigh, this link will take you straight to your destination!

Click here to sign in:
${url}

🔒 Security Note: This magic link will expire in 24 hours and can only be used once. If you didn't request this email, you can safely ignore it.

🎄 Happy holidays from the ${host} team! 🎄

This email was sent to ${email}
If you have any questions, please contact our support team.
`;
  return { subject, html, text };
}

export { createMagicLinkEmailTemplate };

