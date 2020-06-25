const path = require('path')
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser')
const cors = require('cors')

const appError = require('./utils/appError')
const globalErrHandler = require('./controllers/errorController')
const tourRouter = require('./routes/tourRoutes')
const userRouter = require('./routes/userRoutes')
const reviewRouter = require('./routes/reviewRoutes')
const bookingRouter = require('./routes/bookingRoutes')
const viewRouter = require('./routes/viewRoutes')

const app = express(); //Standard practice, it seems.

app.set('view engine', 'pug'); //Template creator
app.set('views', path.join(__dirname, 'views'))

app.use(express.static(path.join(__dirname, 'public'))); //Serving static files for pug templates and such, such as css and img
app.use(helmet()); //Set security HTTP headers

if(process.env.NODE_ENV === 'development') {
    app.use(morgan('dev')); //Middleware for logging
}

const limiter = rateLimit({ //Limit the number of requests that can be sent from an IP
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: `Too many requests from this IP...Please try again after an hour.`
})

app.use('/api', limiter);

//Body parser
app.use(express.json({//Middleware, cause the data from the request body...
    limit: '10kb' //To limit the amount of data to the output
}));
app.use(express.urlencoded({//For the submit-user-data route since we have given that as a HTML Form POST action
    extended: true,
    limit: '10kb'
}))
app.use(cookieParser());

//Data sanitization against NoSQL query injection
app.use(mongoSanitize());

//Data sanitization against XSS
app.use(xss());

//To prevent parameter pollution
app.use(hpp({
    whitelist: ['duration', 'ratingsAverage', 'ratingsQuantity', 'maxGroupSize', 'difficulty', 'price']
}));

//app.use(cors({credentials: false, origin: true})) //Workaround to enable same source file loads(CORS)

app.use((req, res, next) => { //Next argument will show to Node that this is a middleware
    req.requestTime = new Date().toISOString();
    next();
})

//Mounting the routers
app.use('/', viewRouter)
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
    next(new appError(`Can't find ${req.originalUrl} on this server!`, 404)); //Any argument passed into next will be considered as an error
})

//MIDDLEWARE FOR HANDLING ERRORS
app.use(globalErrHandler);

module.exports = app;


