// Utility to preview email templates for development/testing
import { writeFileSync } from "fs";
import { join } from "path";
import { createMagicLinkEmailTemplate } from "./email-templates";

function generateEmailPreview() {  const testData = {
    url: "http://localhost:3002/api/auth/callback/nodemailer?token=test-token&email=test@example.com",
    host: "localhost:3002",
    email: "test@example.com",
  };

  const { subject, html, text } = createMagicLinkEmailTemplate(testData);

  // Generate HTML preview file
  const previewHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Email Template Preview</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .preview-header { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .preview-content { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .text-preview { background: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb; }
    pre { white-space: pre-wrap; margin: 0; }
  </style>
</head>
<body>
  <div class="preview-header">
    <h1>Magic Link Email Template Preview</h1>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Test URL:</strong> ${testData.url}</p>
    <p><strong>Test Email:</strong> ${testData.email}</p>
    <p><strong>Host:</strong> ${testData.host}</p>
  </div>
  
  <div class="preview-content">
    <div class="html-preview">
      ${html}
    </div>
    
    <div class="text-preview">
      <h3>Text Version:</h3>
      <pre>${text}</pre>
    </div>
  </div>
</body>
</html>`;

  // Write preview file
  const previewPath = join(process.cwd(), "email-preview.html");
  writeFileSync(previewPath, previewHtml);
  
  console.log(`Email preview generated: ${previewPath}`);
  console.log("Open this file in your browser to see the email template.");
  
  return { subject, html, text, previewPath };
}

// Run if called directly
generateEmailPreview();
