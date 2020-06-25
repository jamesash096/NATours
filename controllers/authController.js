const { promisify } = require('util')
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const crypto = require('crypto')
const Email = require('./../utils/email');
const jwt = require('jsonwebtoken');
const appError = require('./../utils/appError');

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
}

const createAndSendToken = (user, statusCode, res) => {
    const token = signToken(user._id)
    const cookieOptions = { // To pass jwt as a cookie through http to ensure security
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true
    }

    if(process.env.NODE_ENV === 'production') {
        cookieOptions.secure = true;
    }  

    res.cookie('jwt', token, cookieOptions)
    user.password = undefined; //To hide the password from output during creation of user

    res.status(statusCode).json({
        status: 'Success',
        token,
        data: {
            user
        }
    })
}

exports.signup = catchAsync(async(req, res, next) => {
    const newUser = await User.create({ //Cannot create like admin
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        role: req.body.role
    });
    
    const url = `${req.protocol}://${req.get('host')}/me`;
    await new Email(newUser, url).sendWelcome();
    
    createAndSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;
    
    if(!email || !password) {
        return next(new appError(`Please provide the correct email and password`, 400));
    };
    
    const user = await User.findOne({ email }).select('+password');
    
    if(!user || !(await user.correctPassword(password, user.password))) {
        return next(new appError(`Incorrect email or password`, 401));
    }
    
    createAndSendToken(user, 200, res)
});

exports.logout = (req, res,) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    })
    res.status(200).json({
        status: 'Success'
    })
}

//MIDDLEWARE to check if a user is logged when accessing certain functions
exports.protect = catchAsync(async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) { //Checking for availability of JWT
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }
    
    if (!token) return next(new appError(`You are not logged in! Please log in to get access`,401));
    
    // Checking if the logged in signature is the real deal and not altered
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id) //Checking if JWT is from actual user or a stolen one
    if(!currentUser) {
        return next(new appError(`The user against the token does not exist`, 401));
    }
    //To check if the user has changed password after issue of token
    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(new appError(`User recently changed password!! Please log in again`, 401));
    }
    req.user = currentUser;
    res.locals.user = currentUser
    next();
})

//Only for rendered pages, no errors!
exports.isLoggedIn = async (req, res, next) => {
    if (req.cookies.jwt) {
        try{
            // Checking if the logged in signature is the real deal and not altered
            const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);
            const currentUser = await User.findById(decoded.id) //Checking if JWT is from actual user or a stolen one
            if(!currentUser) {
                return next();
            }
            //To check if the user has changed password after issue of token
            if (currentUser.changedPasswordAfter(decoded.iat)) {
                return next();
            }
            //There is a user logged in
            res.locals.user = currentUser
            return next();
        } catch (err) {
            return next();
        }
    }
    next();
}

//Middleware to restrict permissions to certain users
exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if(!roles.includes(req.user.role)) {
            return next(new appError(`You do not have permission to perform this action`, 403))
        }

        next();
    }
}

//To send a reset password email link response to user who forgot password
exports.forgotPassword = catchAsync(async (req, res, next) => {
    const user  = await User.findOne({ email: req.body.email })
    if(!user) {
        return next(new appError(`There is no user with that email address`, 404));
    }
    //Generate a random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });
    //Send it to user's email
    
    try{
        const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetpassword/${resetToken}`;
        await new Email(user, resetURL).sendPasswordReset();
    
        res.status(200).json({
            status: 'String',
            message: 'Token sent to email!'
        });    
    } catch(err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return next(new appError(`There was an error sending the email...Please try again later`, 500))
    }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
    //To encrypt the reset token to compare against the token in the database
    const hashToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({passwordResetToken: hashToken, passwordResetExpires: {$gt: Date.now()}});

    if(!user) {
        return next(new appError(`Token is either invalid or expired!`, 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();


    //To login the user by sending the JWT
   createAndSendToken(user, 200, res)
});

//For logged in users to update their password
exports.updatePassword = catchAsync(async (req, res, next) => {
    const user  = await User.findById(req.user.id).select('+password');
    //To check if the password of the user is correct
    if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
        return next(new appError(`Your current password is wrong`, 401));
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    createAndSendToken(user, 200, res);
});
