import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

//Schema

const userSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
  },
  name: {
    type: String,
  },
  password: {
    type: String,
    required: true,
  },
  contact: {
    type: Number,
    required: true,
    unique: true,
  }
});

const User = mongoose.model("User", userSchema);

export { User }