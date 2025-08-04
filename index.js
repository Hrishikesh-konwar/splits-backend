import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";

import {
  register,
  login,
  getGroups,
  createGroup,
  getGroupDetails,
  addMember,
  removeMember,
  addExpense,
  getExpenses,
} from "./controller/index.js";
import { validateUser } from "./middleware.js";

dotenv.config();
const app = express();
app.use(cors());

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/register", register);
app.post("/login", login);

app.get("/get-groups", validateUser, getGroups);
app.post("/create-group", validateUser, createGroup);
app.get("/get-group-by-id", validateUser, getGroupDetails);

app.post("/add-member", validateUser, addMember);
app.post("/remove-member", validateUser, removeMember);

app.post("/add-expense", validateUser, addExpense);
app.get("/get-expenses", validateUser, getExpenses);

app.listen(8080, () => {
  console.log("Server running on port 8080");
});
