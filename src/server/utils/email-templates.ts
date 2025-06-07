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
} {  const subject = `🎅 Sign in to ${host} - Your Magic Link is Here!`;

  const html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>Sign in to ${host}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Email client resets */
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; display: block; }
    
    /* Outlook specific */
    <!--[if mso]>
    table { border-collapse: collapse; }
    <![endif]-->
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333333; background-color: #0f172a; width: 100% !important; min-width: 100%; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <!-- Background wrapper table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0f172a; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 0;">
        <!-- Full-width header image section -->        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1e3a8a; margin: 0;">
          <tr>
            <td align="center" style="padding: 40px 20px 30px; text-align: center; color: #ffffff; font-family: Arial, Helvetica, sans-serif;">
              <div style="font-size: 32px; margin: 0 0 15px 0;">🎅🎄✨</div>
              <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff; font-family: Arial, Helvetica, sans-serif; line-height: 1.2;">Random Acts of Santa - 2025!</h1>
              <div style="font-size: 16px; color: #dbeafe; margin: 10px 0 0 0;">Spreading joy, one gift at a time</div>
            </td>
          </tr>
        </table>
        
        <!-- Main container table -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; margin: 0 auto; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!--[if mso]>
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0">
          <tr>
          <td>
          <![endif]-->
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px; text-align: center; background-color: #ffffff; color: #1f2937; font-family: Arial, Helvetica, sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <h2 style="font-size: 20px; color: #1f2937; margin: 0 0 20px 0; font-weight: 600; font-family: Arial, Helvetica, sans-serif;">Ho ho ho! 🎄</h2>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="font-size: 16px; color: #4b5563; margin: 0 0 30px 0; line-height: 1.7; font-family: Arial, Helvetica, sans-serif;">
                      We've prepared your magic link to sign in to <strong>${host}</strong>. 
                      Just like Santa's sleigh, this link will take you straight to your destination!
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <div style="font-size: 24px; margin: 20px 0; opacity: 0.8;">🎁 ❄️ 🔔 ❄️ 🎁</div>
                  </td>                </tr>
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <!-- Button table for better email client support -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                      <tr>
                        <td style="background-color: #dc2626; padding: 0; text-align: center;">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:50px;v-text-anchor:middle;width:200px;" arcsize="16%" stroke="f" fillcolor="#dc2626">
                          <w:anchorlock/>
                          <center>
                          <![endif]-->
                          <a href="${url}" style="display: inline-block; background-color: #dc2626; color: #ffffff !important; text-decoration: none; padding: 16px 32px; font-weight: 600; font-size: 18px; font-family: Arial, Helvetica, sans-serif; border: none; text-align: center; line-height: 18px;">
                            🎅 Sign In Now
                          </a>
                          <!--[if mso]>
                          </center>
                          </v:roundrect>
                          <![endif]-->
                        </td>
                      </tr>
                    </table>
                  </td>                </tr>
                <tr>
                  <td align="center" style="padding: 30px 0 0 0;">
                    <!-- Security note -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0;">
                      <tr>
                        <td style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; color: #166534; font-size: 14px; font-family: Arial, Helvetica, sans-serif; text-align: center;">
                          <span style="color: #16a34a; font-size: 18px; margin-right: 8px;">🔒</span>
                          <strong>Security Note:</strong> This magic link will expire in 24 hours and can only be used once. 
                          If you didn't request this email, you can safely ignore it.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 30px 0 0 0;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0; font-family: Arial, Helvetica, sans-serif; text-align: center;">
                      Having trouble with the button? Copy and paste this link into your browser:<br>
                      <span style="word-break: break-all; color: #dc2626;">${url}</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>          
          <!-- Footer -->
          <tr>
            <td style="background-color: #1f2937; padding: 20px 30px; text-align: center; border-top: 1px solid #374151; color: #ffffff; font-size: 14px; font-family: Arial, Helvetica, sans-serif;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 15px 0; color: #ffffff;">🎄 Happy holidays from the ${host} team! 🎄</p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <div style="margin: 15px 0; height: 1px; background-color: #374151;"></div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: #ffffff;">
                      This email was sent to <strong>${email}</strong><br>
                      If you have any questions, please contact our support team.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>          <!--[if mso]>
          </td>
          </tr>
          </table>
          <![endif]-->
        </table>
        
        <!-- Bottom spacing -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="height: 40px; line-height: 40px;">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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

