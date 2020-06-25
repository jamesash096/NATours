const Review = require('./../models/reviewModel')
//const catchAsync = require('./../utils/catchAsync')
const factory = require('./handlerFactory');

exports.setTourUserIds = (req, res, next) => {
    if(!req.body.tour) req.body.tour = req.params.tourId
    if(!req.body.user) req.body.user = req.user.id
    next();
}

//To get all reviews
exports.getAllReviews = factory.getAll(Review);
//To get a single review based on review ID
exports.getReview = factory.getOne(Review);
//To create a review
exports.createReview = factory.createOne(Review);
//To delete a review based on review ID
exports.deleteReview = factory.deleteOne(Review);
//To update info for a certain review based on review ID
exports.updateReview = factory.updateOne(Review);