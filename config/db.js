import mongoose from "mongoose"

export async function connectDb () {
    try {
        await mongoose.connect('mongodb://localhost:27017/Rental'); // without authentication
        console.log('mongodb databasee connected');
    } catch (error) {
        console.log('MongoDb Connection Error', error);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    await mongoose.disconnect();
    console.log('Client Disconnected');
    process.exit(0);
});