import { model, Schema } from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [3, "name must be at least 3 characters long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator(val) {
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(val);
        },
        message: "Please enter a valid email",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
    },
    role: {
      type: String,
      default: "user",
    },
    image: {
      type: String,
      default: null,
    },
  },
  {
    strict: "throw", // throw usually use for throw erros strict default value is "true".
    timestamps: true,
  }
);

// password compare method
userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

userSchema.pre("save", async function () {
    console.log('pre hook')
    console.log(this.isModified('password'))
    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 10);

});

const User = model("User", userSchema);
export default User;
