import mongoose, {Schema} from "mongoose";

const roleSchema = new Schema({
    value: {
        type: String,
        unique: true,
        required: true,
        default: "USER"
    }
})

const Role = mongoose.model('Role', roleSchema);

export default Role;