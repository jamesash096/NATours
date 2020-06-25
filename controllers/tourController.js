const Tour = require('./../models/tourModel')
const catchAsync = require('./../utils/catchAsync')
const factory = require('./handlerFactory');
const AppError = require('./../utils/appError');

const multer = require('multer');
const sharp = require('sharp')

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

exports.uploadTourImages = upload.fields([
    {
        name: 'imageCover',
        maxCount: 1
    },
    {
        name: 'images',
        maxCount: 3
    }
]);

exports.resizeTourImages = catchAsync(async(req, res, next) => {
    if(!req.files.imageCover || req.files.images) return next();
    //Processing and storing the cover image
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`
    await sharp(req.files.imageCover[0].buffer).resize(2000, 1333).toFormat('jpeg').jpeg({quality: 90}).toFile(`public/img/tours/${req.body.imageCover}`)
    
    //Processing and storage for other tour images
    req.body.images = [];
    await Promise.all(req.files.images.map(async (file, i) => {
        const fileName = `tour-${req.params.id}-${Date.now()}-${i+1}.jpeg`
        await sharp(file.buffer).resize(2000, 1333).toFormat('jpeg').jpeg({quality: 90}).toFile(`public/img/tours/${fileName}`)
        req.body.images.push(fileName)
    }))
    
    next();
})

exports.aliasTopTours = (req, res, next) => {
    req.query.limit = '5';
    req.query.sort = '-ratingsAverage,price';
    req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
    next();
}

//To get all the tour data from the json file
exports.getAllTours = factory.getAll(Tour)
//To get a particular tour alone based on id at the end of the URL
exports.getTour = factory.getOne(Tour, { path: 'reviews' })

//To add a new tour to the tours json file via an array
exports.createTour = factory.createOne(Tour);

//To update certain parameters of a tour alone
exports.updateTour = factory.updateOne(Tour)

//To delete a tour data based on id
exports.deleteTour = factory.deleteOne(Tour)

exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([
        {
            $match: {
                ratingsAverage: {$gte: 4.5}
            }
        },
        {
            $group: {
                _id: {$toUpper: '$difficulty'},
                numTours: { $sum: 1 },
                numRatings: { $sum: '$ratingsQuantity' },
                avgRating: { $avg: '$ratingsAverage' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' }
            }
        },
        {
            $sort: {
                avgPrice: 1
            }
        }
    ])
    res.status(200).json({
        status: 'Success',
        data: {
            stats, //Since data variable and object name here are same...ES6
        },
    })
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
    const year = req.params.year * 1;
    const plan = await Tour.aggregate([
        {
            $unwind: '$startDates'
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group: {
                _id: { $month: '$startDates' },
                numTourStarts: { $sum: 1 },
                tours: {
                    $push: '$name'
                }
            }
        },
        {
            $addFields: {
                month: '$_id' 
            }
        },
        {
            $project: { // 0 means field will be displayed, 1 means not be displayed
                _id: 0
            }
        },
        {
            $sort: {
                numTourStarts: -1
            }
        },
        {
            $limit: 12
        }
    ])

    res.status(200).json({
        status:'Success',
        data: {
            plan
        }
    })
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, long] = latlng.split(',');

    const radius = unit === 'mi' ? distance/3963.2 : distance/6378.1;

    if(!lat || !long) {
        next(new AppError(`Please provide latitude and longitude in the format lat,lng`, 400));
    }
    
    const tours = await Tour.find({ startLocation: { $geoWithin: {$centerSphere: [[long, lat], radius] } } })

    res.status(200).json({
        status:'Success',
        results: tours.length,
        data: {
            data: tours
        }
    })
})

exports.getDistances = catchAsync(async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, long] = latlng.split(',');

    const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

    if(!lat || !long) {
        next(new AppError(`Please provide latitude and longitude in the format lat,lng`, 400));
    }

    const distances = await Tour.aggregate([
        {
            $geoNear: { //Requires a geospatial index
                near: {
                    type: 'Point',
                    coordinates: [long * 1, lat * 1]
                },
                distanceField: 'distance',
                distanceMultiplier: multiplier //To convert into kilometres
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ]);

    res.status(200).json({
        status:'Success',
        data: {
            data: distances
        }
    });
})