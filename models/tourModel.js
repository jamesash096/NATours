//const User = require('./userModel')
const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator')
//Creating a schema as a blueprint for data operations in Atlas
const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Tours must be embellished with a name'],
        unique: true,
        trim: true,
        maxlength: [40, 'Please specify tour name with less or equal to 40 characters'],
        minlength: [10, 'Please specify tour name with greater or equal to 10 characters'],
        //validate: [validator.isAlpha, 'Please provide only characters for a Tour Name']
    },
    slug: String,
    duration: {
        type: Number,
        required: [true, 'Duration of tour to be specified']
    },
    maxGroupSize: {
        type: Number,
        required: [true, 'Please specify the group size for the tour']
    },
    difficulty: {
        type: String,
        required: [true, 'Please specify the difficulty of the tour'],
        enum: {
            values: ['easy','medium','difficult'],
            message: 'Please select a rating from easy, medium or difficult'
        }
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1, 'Please provide a rating between 1 and 5'],
        max: [5, 'Please provide a rating between 1 and 5'],
        set: val => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        required: [true, 'Mention the price of the tour']
    },
    priceDiscount: {
        type: Number,
        validate: {
            validator: function(value){
                //This only points to current document on NEW document creation, and not on update
                return value < this.price;
            },
            message: 'Discount price ({VALUE}) should be lower than regular price!'
        }
        
    },
    summary: {
        type: String,
        trim: true,
        required: [true, 'Please specify the summary of the tour']
    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, 'Please provide the cover image for the tour']
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false
    },
    startDates: [Date],
    secretTour: {
        type: Boolean,
        default: false
    },
    startLocation: { //Geospatial Data
        type: { //These are GeoJSON subfields
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    locations: [
        {
            type: {
                type: String,
                default: 'Point',
                enum: ['Point']
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    guides: [
        {
            type: mongoose.Schema.ObjectId,
            ref: 'User'
        }
    ]
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
})

tourSchema.index({price: 1, ratingsAverage: -1}) //Basically, this creates an order of prices which can be used to search prices gt 1000 and so on, increasing performance
tourSchema.index({slug: 1})
tourSchema.index({ startLocation: '2dsphere' })

tourSchema.virtual('durationWeeks').get(function(){ //Not persistent data. Will be created on call
    return this.duration / 7;
})

tourSchema.virtual('reviews', { //Virtual populate a tour with all of it's reviews to save performance
    ref: 'Review',
    foreignField: 'tour', //To specify the reference of the Tourmodel where the Reviewmodel is
    localField: '_id'
})
//MONGOOSE MIDDLEWARES
//Can be used to modify data in between functions
//MONGOOSE DOCUMENT MIDDLEWARE
tourSchema.pre('save', function(next) { //runs before the .save() and .create() functions of MongoDB and Mongoose
    this.slug = slugify(this.name, {lower: true});
    next();
})

//MONGOOSE QUERY MIDDLEWARE
tourSchema.pre(/^find/, function(next) {
    this.find({ secretTour: {$ne: true} });
    this.start = Date.now();
    next();
})

tourSchema.pre(/^find/, function(next){
    this.populate({ //Populate will fill up the reference ids with the actual data from the users collection
        path: 'guides',
        select: '-__v -passwordChangedAt'    
    })
    next();
})

tourSchema.post(/^find/, function(doc, next) {
    console.log(`Query took ${Date.now() - this.start} milliseconds`);
    next();
})



//AGGREGATION MIDDLEWARE
//tourSchema.pre('aggregate', function(next) { //To exclude any secret tours in aggregate counts
  //  this.pipeline().unshift({
    //    $match: { secretTour: { $ne: true } }
    //})
    //next();     
//})

const Tour = mongoose.model('Tour', tourSchema) //Model names to be uppercased at the start

module.exports = Tour;