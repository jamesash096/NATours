const catchAsync = require('./../utils/catchAsync')
const AppError = require('./../utils/appError')
const APIFeatures = require('./../utils/apiFeatures')

exports.deleteOne = Model => catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndDelete(req.params.id);

    if(!document) {
        return next(new AppError('No document found with that ID', 404))
    }

    res.status(204).json({
        status: 'Success',
        data: null
    });
});

exports.updateOne = Model => catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    })

    if(!document) {
        return next(new AppError('No document found with that ID', 404))
    }

    res.status(200).json({
        status: 'Success',
        data: {
            data: document
        }
    })
});

exports.createOne = Model => catchAsync(async (req,res,next) => {
    const newDoc = await Model.create(req.body) //Using the Tour model directly to insert data into the DB.
    res.status(201).json({
        status: 'Success',
        data: {
            data: newDoc
        }
    });
});

exports.getOne = (Model, populateOptions) => catchAsync(async (req, res, next) => { //:id to specify a parameter, :id? to specify an optional parameter
    let query = Model.findById(req.params.id);
    if(populateOptions) query = query.populate(populateOptions)
    const document = await query;
    
    if(!document) {
        return next(new AppError('No document found with that ID', 404))
    }

    res.status(200).json({
        status: 'Success',
        data: {
            data: document, //Since data variable and object name here are same...ES6
        },
    })
});

exports.getAll = Model => catchAsync(async (req, res, next) => {
    let filter = {}; //To allow for nested GET reviews on Tour
    if(req.params.tourId) filter = { tour: req.params.tourId }; //Used to find all the reviews against a particular tourID

    const features = new APIFeatures(Model.find(filter), req.query).filter().sort().limitFields().paginate();
    const documents = await features.query;

    res.status(200).json({
        status: 'Success',
        results: documents.length,  
        data: {
            data: documents, //Since data variable and object name here are same...ES6
        },
    })
});