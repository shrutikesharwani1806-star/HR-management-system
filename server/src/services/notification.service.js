const nodemailer = require('nodemailer');
const twilio = require('twilio');
const admin = require('firebase-admin');
const logger = require('../config/logger');
const Notification = require('../models/Notification');
const NotificationPreference = require('../models/NotificationPreference');
const Employee = require('../models/Employee');

// ─── Email Transport (Nodemailer) ─────────────────────────────────────────
const createEmailTransport = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// ─── Twilio SMS Client ─────────────────────────────────────────────────────
let twilioClient = null;
const getTwilioClient = () => {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
};

// ─── Firebase FCM Push ─────────────────────────────────────────────────────
let firebaseInitialized = false;
const initFirebase = () => {
  if (!firebaseInitialized && process.env.FIREBASE_PROJECT_ID) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    firebaseInitialized = true;
  }
};

// ─── Send Email ─────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createEmailTransport();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'HRMS <noreply@hrms.com>',
      to,
      subject,
      html,
      text,
    });
    logger.info(`📧 Email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    logger.error(`Email send failed to ${to}: ${err.message}`);
    return false;
  }
};

// ─── Send SMS via Twilio ────────────────────────────────────────────────────
const sendSms = async ({ to, body }) => {
  try {
    const client = getTwilioClient();
    if (!client) {
      logger.warn('Twilio not configured — SMS not sent');
      return false;
    }
    await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
    logger.info(`📱 SMS sent to ${to}`);
    return true;
  } catch (err) {
    logger.error(`SMS send failed to ${to}: ${err.message}`);
    return false;
  }
};

// ─── Send Push Notification via Firebase FCM ───────────────────────────────
const sendPush = async ({ token, title, body, data = {} }) => {
  try {
    initFirebase();
    if (!firebaseInitialized) {
      logger.warn('Firebase not configured — push not sent');
      return false;
    }
    await admin.messaging().send({
      token,
      notification: { title, body },
      data,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });
    logger.info(`🔔 Push sent to token: ${token.substring(0, 20)}...`);
    return true;
  } catch (err) {
    logger.error(`Push send failed: ${err.message}`);
    return false;
  }
};

// List of critical event types that cannot be disabled
const CRITICAL_EVENTS = ['missed_punch', 'approval_reminders'];

// Default template builder for events
const EVENT_TEMPLATES = {
  leave_applied: (d) => ({
    title: 'New Leave Request',
    body: `${d.employeeName} has applied for ${d.leaveType} leave from ${d.fromDate} to ${d.toDate}.`,
  }),
  leave_approved: (d) => ({
    title: 'Leave Approved ✅',
    body: `Your ${d.leaveType} leave from ${d.fromDate} to ${d.toDate} has been approved.`,
  }),
  leave_rejected: (d) => ({
    title: 'Leave Rejected ❌',
    body: `Your ${d.leaveType} leave from ${d.fromDate} to ${d.toDate} has been rejected. Reason: ${d.reason || 'None provided'}.`,
  }),
  missed_punch: (d) => ({
    title: 'Missed Punch Alert ⚠️',
    body: `Hi ${d.employeeName}, you missed a punch-out on ${d.date}. Please regularize your attendance.`,
  }),
  attendance_regularization: (d) => ({
    title: 'Attendance Regularization Updated',
    body: `Your attendance regularization request for ${d.date} has been ${d.status}.`,
  }),
  approval_reminders: (d) => ({
    title: 'Pending Approval Reminder ⏰',
    body: `Reminder: You have a pending approval request for ${d.requestedBy} (SLA deadline: ${d.deadline}).`,
  }),
};

/**
 * Core notification trigger engine that resolves preferences and dispatches to channels
 */
async function triggerNotification(tenantId, employeeId, eventType, data = {}) {
  const employee = await Employee.findOne({ _id: employeeId, tenantId });
  if (!employee) {
    logger.warn(`Notification failed: employee ${employeeId} not found`);
    return;
  }

  const templateBuilder = EVENT_TEMPLATES[eventType];
  if (!templateBuilder) {
    logger.warn(`No notification template found for event: ${eventType}`);
    return;
  }

  const { title, body } = templateBuilder(data);
  const isCritical = CRITICAL_EVENTS.includes(eventType);

  // Fetch preferences
  let preferenceDoc = await NotificationPreference.findOne({ tenantId, employeeId });
  if (!preferenceDoc) {
    preferenceDoc = await NotificationPreference.create({
      tenantId,
      employeeId,
      preferences: {
        leave_applied: { in_app: true, email: true, sms: false, push: true },
        leave_approved: { in_app: true, email: true, sms: false, push: true },
        leave_rejected: { in_app: true, email: true, sms: false, push: true },
        missed_punch: { in_app: true, email: true, sms: true, push: true },
        attendance_regularization: { in_app: true, email: true, sms: false, push: true },
        approval_reminders: { in_app: true, email: true, sms: true, push: true },
      }
    });
  }

  // Get preferences map or defaults
  const eventPrefs = preferenceDoc.preferences?.get(eventType) || {
    in_app: true,
    email: true,
    sms: false,
    push: true,
  };

  // Determine enabled channels. CRITICAL EVENTS CANNOT BE DISABLED (always true for in_app, email, and push if tokens exist)
  const channels = {
    in_app: isCritical ? true : eventPrefs.in_app !== false,
    email: isCritical ? true : eventPrefs.email !== false,
    sms: isCritical ? true : !!eventPrefs.sms,
    push: isCritical ? true : eventPrefs.push !== false,
  };

  // 1. In-App Notification (always save to database first)
  if (channels.in_app) {
    await Notification.create({
      tenantId,
      userId: employee.userId,
      title,
      body,
      type: eventType,
      channel: 'in_app',
      isCritical,
      deliveryStatus: 'sent',
      deliveredAt: new Date(),
    });
  }

  // 2. Email Channel Dispatch
  if (channels.email && employee.officialEmail) {
    const success = await sendEmail({
      to: employee.officialEmail,
      subject: title,
      html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
               <h2 style="color: #4f46e5; margin-top: 0;">${title}</h2>
               <p style="color: #334155; line-height: 1.6; font-size: 15px;">${body}</p>
               <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
               <p style="color: #94a3b8; font-size: 11px;">This is an automated system message from HRMS SaaS. Please do not reply directly to this email.</p>
             </div>`,
      text: body,
    });
    
    await Notification.create({
      tenantId,
      userId: employee.userId,
      title,
      body,
      type: eventType,
      channel: 'email',
      isCritical,
      deliveryStatus: success ? 'sent' : 'failed',
      deliveredAt: success ? new Date() : undefined,
    });
  }

  // 3. SMS Channel Dispatch
  if (channels.sms && employee.phone) {
    const success = await sendSms({
      to: employee.phone,
      body: `[HRMS] ${title}: ${body}`,
    });

    await Notification.create({
      tenantId,
      userId: employee.userId,
      title,
      body,
      type: eventType,
      channel: 'sms',
      isCritical,
      deliveryStatus: success ? 'sent' : 'failed',
      deliveredAt: success ? new Date() : undefined,
    });
  }

  // 4. Push Channel Dispatch
  const fcmToken = employee.metadata?.fcmToken;
  if (channels.push && fcmToken) {
    const success = await sendPush({
      token: fcmToken,
      title,
      body,
      data: { eventType },
    });

    await Notification.create({
      tenantId,
      userId: employee.userId,
      title,
      body,
      type: eventType,
      channel: 'push',
      isCritical,
      deliveryStatus: success ? 'sent' : 'failed',
      deliveredAt: success ? new Date() : undefined,
    });
  }

  logger.info(`🔔 Processed notification for employee ${employee.firstName} ${employee.lastName} on event ${eventType}`);
}

module.exports = {
  triggerNotification,
  sendEmail,
  sendSms,
  sendPush,
};
