const nodemailer = require('nodemailer');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
}

function isEmailConfigured() {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS &&
    !process.env.EMAIL_USER.includes('your_email'));
}

async function sendRejectionEmail(application) {
  if (!isEmailConfigured()) {
    console.log(`[EMAIL MOCK] Rejection email → ${application.email} (${application.full_name})`);
    return { success: true, mocked: true };
  }

  const transporter = createTransporter();
  const feedbackSection = application.hr_feedback
    ? `<div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0;border-radius:4px;">
        <strong>Feedback from our team:</strong><br/>${application.hr_feedback}
       </div>`
    : '';

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `HR Team <${process.env.EMAIL_USER}>`,
    to: application.email,
    subject: 'Your Application Status — [Company Name]',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
        <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:40px 30px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">Application Update</h1>
          <p style="color:#e0e7ff;margin:8px 0 0;">Thank you for your interest in joining us</p>
        </div>
        <div style="padding:30px;">
          <p style="color:#374151;font-size:16px;">Dear <strong>${application.full_name}</strong>,</p>
          <p style="color:#374151;line-height:1.6;">Thank you for applying for a position in <strong>${application.preferred_domain}</strong> and for the time you invested in your application.</p>
          <p style="color:#374151;line-height:1.6;">After careful review of all applications, we regret to inform you that we will not be moving forward with your application at this time. This was a competitive process, and the decision was difficult.</p>
          ${feedbackSection}
          <p style="color:#374151;line-height:1.6;">We truly appreciate your interest and encourage you to apply again for future openings that match your profile.</p>
          <p style="color:#374151;line-height:1.6;">We wish you the very best in your career journey.</p>
          <p style="color:#374151;">Warm regards,<br/><strong>The HR Team</strong></p>
        </div>
        <div style="background:#f3f4f6;padding:15px;text-align:center;font-size:12px;color:#9ca3af;">
          This is an automated message — please do not reply.
        </div>
      </div>
    `,
  });

  return { success: true };
}

async function sendApprovalEmail(application) {
  if (!isEmailConfigured()) {
    console.log(`[EMAIL MOCK] Approval email → ${application.email} (${application.full_name})`);
    return { success: true, mocked: true };
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `HR Team <${process.env.EMAIL_USER}>`,
    to: application.email,
    subject: 'Congratulations! You Have Been Shortlisted — [Company Name]',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;">
        <div style="background:linear-gradient(135deg,#059669,#10b981);padding:40px 30px;text-align:center;">
          <h1 style="color:white;margin:0;font-size:24px;">Great News! 🎉</h1>
          <p style="color:#d1fae5;margin:8px 0 0;">You have been shortlisted</p>
        </div>
        <div style="padding:30px;">
          <p style="color:#374151;font-size:16px;">Dear <strong>${application.full_name}</strong>,</p>
          <p style="color:#374151;line-height:1.6;">We are delighted to inform you that your application for a position in <strong>${application.preferred_domain}</strong> has been shortlisted!</p>
          <p style="color:#374151;line-height:1.6;">Our team was impressed with your application, and we would like to invite you to the next stage of our selection process — an interview.</p>
          <div style="background:#ecfdf5;border-left:4px solid #10b981;padding:15px;margin:20px 0;border-radius:4px;">
            <strong>Next Steps:</strong>
            <ul style="margin:8px 0 0;padding-left:20px;color:#374151;">
              <li>Our HR team will contact you shortly to schedule an interview</li>
              <li>Please prepare to discuss your experience, skills, and motivation</li>
              <li>Review the role requirements for <strong>${application.preferred_domain}</strong></li>
            </ul>
          </div>
          <p style="color:#374151;line-height:1.6;">Congratulations again — we look forward to speaking with you!</p>
          <p style="color:#374151;">Best regards,<br/><strong>The HR Team</strong></p>
        </div>
        <div style="background:#f3f4f6;padding:15px;text-align:center;font-size:12px;color:#9ca3af;">
          This is an automated message — please do not reply.
        </div>
      </div>
    `,
  });

  return { success: true };
}

module.exports = { sendRejectionEmail, sendApprovalEmail };
