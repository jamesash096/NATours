const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide your name'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email for comms'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please enter a valid email']
    },
    photo: {
        type: String,
        default: 'default.jpg'
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [8, 'Please provide a password greater than or equal to 8 characters'],
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: { // This works only for create and save, not update
            validator: function(el) {
                return el === this.password;
            },
            message: `Passwords aren't the same`
        }
    },
    passwordChangedAt: Date,
    role: {
        type: String,
        enum: ['user', 'guide', 'lead-guide', 'admin'],
        default: 'user',
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
});

//MONGOOSE MIDDLEWARE FOR ENCRYPTING PASSWORDS
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next(); //Only runs if pwd modified

    this.password =  await bcrypt.hash(this.password, 12) // 12 here is to show how well it can be encrypted and how CPU intensive it can get
    this.passwordConfirm = undefined;
    next();
});

userSchema.pre('save', function(next){
    // Changes the password changed time stamp if password changed or new user created
    if(!this.isModified('password') || this.isNew) return next();
    this.passwordChangedAt = Date.now() - 1000; //To mitigate the time stamp delays during JWT Token
    next();
});

//QUERY MIDDLEWARE to hide inactive or deleted users
userSchema.pre(/^find/, function(next){
    //This points to the current query
    this.find({active: {$ne: false}});
    next();
})

userSchema.methods.correctPassword = async function(pwd, userPwd){
    return await bcrypt.compare(pwd, userPwd);
}

userSchema.methods.changedPasswordAfter = function(jwtTimeStamp){
    if(this.passwordChangedAt) {
        const changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10); // To convert the date data to iat level
        return jwtTimeStamp < changedTimeStamp;
    }
    return false;
    
}

userSchema.methods.createPasswordResetToken = function() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    return resetToken;
}

const User = mongoose.model('User', userSchema);

module.exports = User;