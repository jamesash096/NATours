const multer = require('multer');
const sharp = require('sharp')

const User = require('./../models/userModel')
const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

//Multer middleware to upload images
/*const multerStorage = multer.diskStorage({
    destination: (req, file, callBack) => {
        callBack(null, 'public/img/users');
    },
    filename: (req, file, callBack) => {
        const ext = file.mimetype.split('/')[1]
        callBack(null, `user-${req.user.id}-${Date.now()}.${ext}`)
    }
})*/

const multerStorage = multer.memoryStorage(); //To store images as a buffer before saving

const multerFilter = (req, file, callBack) => {
    if (file.mimetype.startsWith('image')) {
        callBack(null, true)
    } else {
        callBack(new AppError(`Not an image! Please upload only images`, 400), false)
    }
}

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
})

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
    if (!req.file) return next();

    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
    await sharp(req.file.buffer).resize(500, 500).toFormat('jpeg').jpeg({quality: 90}).toFile(`public/img/users/${req.file.filename}`)

    next();
})

const filterObj = (obj, ...allowedFields) => {
    const newObject = {};
    Object.keys(obj).forEach(el => {
        if(allowedFields.includes(el)) newObject[el] = obj[el]
    });
    return newObject;
}

exports.getAllUsers = factory.getAll(User);

exports.getUser = factory.getOne(User);

exports.getMe = (req, res, next) => {
    req.params.id = req.user.id;
    next();
}

exports.updateMe = catchAsync(async (req, res, next) => {
    if(req.body.password || req.body.passwordConfirm) {
        return next(new AppError(`This place is not for password changes!`, 400));
    }
    const filteredBody = filterObj(req.body, 'name', 'email'); //FIltered unwanted fields that shouldn't be updated by regular users
    if (req.file) filteredBody.photo = req.file.filename

    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {new: true, runValidators: true});

    res.status(200).json({
        status: 'Success',
        data: {
            user: updatedUser
        }
    })
});

exports.deleteMe = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { active: false });
    res.status(204).json({
        status: 'Success',
        data: null
    })
})

exports.createUser = (req, res) => {
    res.status(500).json({
        status: 'Error',
        message: 'This route is not yet defined...Please use sign up instead!'
    })
}

//Do not update passwords with this
exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);