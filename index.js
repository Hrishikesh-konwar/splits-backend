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
  addSettlement,
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

  // console.log("MONGODB_URI:", process.env.MONGODB_URI);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/api/register", register);
app.post("/api/login", login);

app.get("/api/get-groups", validateUser, getGroups);
app.post("/api/create-group", validateUser, createGroup);
app.get("/api/get-group-by-id", validateUser, getGroupDetails);

app.post("/api/add-member", validateUser, addMember);
app.post("/api/remove-member", validateUser, removeMember);

app.post("/api/add-expense", validateUser, addExpense);
app.get("/api/get-expenses", validateUser, getExpenses);
app.post("/api/add-settlement", validateUser, addSettlement);


app.get("/check", (req,res) => {
 res.status(200).send("server is running healthy");
})

app.get("/", (req,res) => {
 res.status(200).send("server is up and running");
})

app.listen(8080, () => {
  console.log("Server running on port 8080");
});
