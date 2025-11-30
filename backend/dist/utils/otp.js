"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOTP = generateOTP;
exports.isValidOTP = isValidOTP;
/**
 * Generate a random 6-digit OTP
 */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
/**
 * Validate OTP format
 */
function isValidOTP(otp) {
    return /^\d{6}$/.test(otp);
}
//# sourceMappingURL=otp.js.map