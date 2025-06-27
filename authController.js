const User = require('../models/User');
const crypto = require('crypto');
const sendEmail = require('../utils/email');

// Forgot Password
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        // 1. Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                status: 'fail',
                message: 'No user found with that email address'
            });
        }
        
        // 2. Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const passwordResetToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        
        // 3. Set token expiration (1 hour)
        const passwordResetExpires = Date.now() + 60 * 60 * 1000;
        
        // 4. Save to database
        user.passwordResetToken = passwordResetToken;
        user.passwordResetExpires = passwordResetExpires;
        await user.save({ validateBeforeSave: false });
        
        // 5. Send email with reset link
        const resetURL = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;
        
        const message = `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;
        
        try {
            await sendEmail({
                email: user.email,
                subject: 'Your password reset token (valid for 1 hour)',
                message
            });
            
            res.status(200).json({
                status: 'success',
                message: 'Token sent to email!'
            });
        } catch (err) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save({ validateBeforeSave: false });
            
            return res.status(500).json({
                status: 'error',
                message: 'There was an error sending the email. Try again later!'
            });
        }
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        // 1. Get user based on the token
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
        
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });
        
        // 2. If token has not expired, and there is user, set the new password
        if (!user) {
            return res.status(400).json({
                status: 'fail',
                message: 'Token is invalid or has expired'
            });
        }
        
        // 3. Update password
        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();
        
        // 4. Log the user in, send JWT
        const authToken = generateAuthToken(user._id);
        
        res.status(200).json({
            status: 'success',
            token: authToken,
            message: 'Password updated successfully'
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
};

function generateAuthToken(userId) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}