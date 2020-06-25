const AppError = require('./../utils/appError')

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
}

const handleDuplicateFieldsDB = err => {
    const value = err.errMsg.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Duplicate field value: ${value} Please use another value.`

    return new AppError(message, 400);
}

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message)
    const message = `Invalid input data. ${errors.join('. ')}`;
    
    return new AppError(message, 400);
}

const handleJWTError = () => new AppError(`Invalid token...Please log in again.`, 401);
const handleTokenExpiredError = () => new AppError(`Your token has expired...Please login again`, 401);

const sendErrorDev = (err, req, res) => {
    if(req.originalUrl.startsWith('/api')) {
        return res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack
        });
    } //Rendered website
    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong',
        msg: err.message
    })
}

const sendErrorProd = (err, req, res) => {
    //if operational error
    if(req.originalUrl.startsWith('/api')) {
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        } //if programming error
        console.error('ERROR!!', err);

        return res.status(500).json({
            status: 'Error',
            message: 'Something went wrong!'
        })
    }
    if (err.isOperational) {
        return res.status(err.statusCode).render('error', {
            title: 'Something went wrong',
            msg: err.message
        })
    }//if programming error
    console.error('ERROR!!', err);

    return res.status(err.statusCode).render('error', {
        title: 'Something went wrong',
        msg: 'Please try again later'
    })
}
module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'Error!';

    if(process.env.NODE_ENV === 'development') {
        sendErrorDev(err, req, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = {...err}; //Deep copy
        error.message = err.message

        //if(error.name === 'CastError') error = handleCastErrorDB(error);
        //if(error.code === 11000) error = handleDuplicateFieldsDB(error);
        //if(error.name === 'ValidationError') error = handleValidationErrorDB(error);
        //if(error.name === 'JsonWebTokenError') error = handleJWTError();    
        //if(error.name === 'TokenExpiredError') error = handleTokenExpiredError();

        //sendErrorProd(error, req, res);

        sendErrorDev(err, req, res);
    }    
}