const mongoose = require('mongoose');
const Tour = require('./tourModel')

const reviewSchema = new mongoose.Schema({
    review: {
        type: String,
        required: [true, 'Please provide a review!'],
        minlength: [5, 'Please provide a review with more than five characters.']
    },
    reviewRating: {
        type: Number,
        required: [true, 'Please provide a rating for the tour'],
        min: 1,
        max: 5
    },
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false
    },
    tour: {
        type: mongoose.Schema.ObjectId,
        ref: 'Tour',
        required: [true, 'Review must belong to a tour!']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: [true, 'Review must belong to a user!']
    }
}, {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

reviewSchema.index({ tour:1, user:1 }, { unique: true }) //To restrict users from writing multiple reviews for a single tour

reviewSchema.pre(/^find/, function(next){
    this.populate({
        path: 'user',
        select: 'name photo'
    })
    next();
})
reviewSchema.statics.calcAverageRatings = async function(tourId) {
    const stats = await this.aggregate([
        {
            $match: {tour: tourId}
        },
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$reviewRating' }
            }
        }
    ])
    if(stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating
        })
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5
        })
    }
};

reviewSchema.post('save', function(){
    //this points to current review
    this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.pre(/^findOneAnd/, async function(next){
    this.rev = await this.findOne();
    next();
});

reviewSchema.post(/^findOneAnd/, async function(next){
    //await this.findOne(); does not work here, query has already executed
    await this.rev.constructor.calcAverageRatings(this.rev.tour);
    next();
});


const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;