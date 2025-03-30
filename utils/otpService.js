const User = require('../models/User');
const sendEmail = require('./emailService');
const crypto = require('crypto');

// Generate OTP and send email
exports.generateAndSendOTP = async (user) => {
  // Generate a 6 digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  user.otp = otp;
  
  // Set expire time - 10 minutes from now
  user.otpExpire = Date.now() + 10 * 60 * 1000;
  
  await user.save({ validateBeforeSave: false });

  // Log for debugging (remove in production)
  console.log(`Generated OTP for ${user.email}: ${otp}`);

  // Create email template
  const message = `
    <h1>Task Management System</h1>
    <p>Hello ${user.firstName},</p>
    <p>Your OTP for account verification is:</p>
    <h2>${otp}</h2>
    <p>This OTP will expire in 10 minutes.</p>
    <p>If you did not request this OTP, please ignore this email.</p>
    <p>Regards,<br>Task Management Team</p>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Account Verification OTP',
      message
    });

    return true;
  } catch (err) {
    console.error('Error sending email:', err);
    
    user.otp = undefined;
    user.otpExpire = undefined;
    
    await user.save({ validateBeforeSave: false });

    throw new Error('Email could not be sent');
  }
};

// Verify OTP
exports.verifyOTP = async (email, otp) => {
  // For debugging (remove in production)
  console.log(`Verifying OTP: ${otp} for email: ${email}`);
  
  const user = await User.findOne({
    email,
    otp: otp,
    otpExpire: { $gt: Date.now() }
  });

  // For debugging (remove in production)
  if (!user) {
    console.log('No user found with matching OTP or OTP expired');
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('User exists with this email, but OTP does not match or has expired');
      console.log('Current OTP in DB:', userExists.otp);
      console.log('OTP Expiration:', userExists.otpExpire);
      console.log('Current time:', new Date());
    } else {
      console.log('No user found with this email');
    }
    
    throw new Error('Invalid or expired OTP');
  }

  // Clear OTP fields
  user.otp = undefined;
  user.otpExpire = undefined;
  
  await user.save();

  return user;
};