import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";

//Schema

const membersSchema = new mongoose.Schema({
  id: {
    type: String,
  },
  name: {
    type: String,
  },
  contact: {
    type: Number,
  },
});

const expensesSchema = new mongoose.Schema({
  id: {
    type: String,        
    default: uuidv4,            
    unique: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  paidBy: {
    type: membersSchema,
    required: true,
  },
  sharedby: {
    type: [membersSchema],
    required: true,
  }
});

const settlementsSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
  },
  from: {
    type: String, // Contact number of person who paid
    required: true,
  },
  to: {
    type: String, // Contact number of person who received payment
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  settledAt: {
    type: Date,
    default: Date.now,
  },
  fromName: {
    type: String,
    required: true,
  },
  toName: {
    type: String,
    required: true,
  }
});

const groupSchema = new mongoose.Schema({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
  },
  groupName: {
    type: String,
  },
  members: {
    type: [membersSchema],
    default: [],
  },
  expenses: {
    type: [expensesSchema],
    default: [],
  },
  settlements: {
    type: [settlementsSchema],
    default: [],
  },
});

const Group = mongoose.model("Group", groupSchema);

export { Group };
