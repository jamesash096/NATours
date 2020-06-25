const mongoose = require('mongoose');
const dotenv = require('dotenv')
dotenv.config({ path: './config.env' })

process.on('unhandledRejection', err => {
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1); //0 for success, 1 for unhandled rejection
    });
})

process.on('uncaughtException', err => {
    console.log(err.name, err.message);
    server.close(() => {
        process.exit(1); //0 for success, 1 for unhandled rejection
    });
})

const app = require('./app')
const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD)

mongoose.connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false
}).then(() => console.log('DB Connection established!'))
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
    console.log(`App running on port ${port}`)
});

