class APIFeatures {
    constructor(query, queryString) {
        this.query = query;
        this.queryString = queryString;
    }

    filter() {
        const queryObj = {...this.queryString}; //Deep copy of the query object
        const excludedFields = ['page','sort','limit','fields']; 
        excludedFields.forEach(el => delete queryObj[el]) //To remove the query parameters not required
        
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);//To convert {gte: x} as {$gte: x} to pass to DB as query
        
        //To build the query for advanced filtering in query params such as {$gte: 5} and so on
        this.query = this.query.find(JSON.parse(queryStr));
        return this;
    }

    //To limit the amount of fields in the response data to reduce bandwidth and improve performance
    sort() {
        if (this.queryString.sort) { //If user requires to sort data based on some sorting order
            // If first sort criteria is a draw, then provide second one via commas. Split and join via spaces as this is MongoDB standard
            const sortBy = this.query.sort.split(',').join(' ');
            this.query = this.query.sort(sortBy)
        } else { //If no sort is provided, then arrange in descending order of createdAt time
            this.query = this.query.sort('-createdAt');
        }
        return this;
    }
    
    //To limit the amount of fields in the response data to reduce bandwidth and improve performance
    limitFields() {
        if (this.queryString.fields) { //If user provides certain fields for search
            const fields = this.queryString.fields.split(',').join(' ');
            this.query = this.query.select(fields);
        } else { //If no field is provided, then arrange in descending order of createdAt time
            this.query = this.query.select('-__v');
        }
        return this;
    }

    //Pagination of the response
    paginate() {
        const page = this.queryString.page * 1 || 1;
        const limit = this.queryString.limit * 1 || 100;
        const skip = (page - 1) * limit;

        this.query = this.query.skip(skip).limit(limit);
        
        return this;
    }
}

module.exports = APIFeatures;