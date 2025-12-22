import { model, Schema, Types } from "mongoose";

const sessionSchema = new Schema({
    userId: {
        type: Types.ObjectId,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 180,
    }
});


const Session = model('Session', sessionSchema);
export default Session;