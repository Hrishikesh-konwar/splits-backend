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

// Configure mongoose settings
mongoose.set('bufferCommands', false);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB first
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      family: 4,
    });
    console.log("✅ MongoDB connected successfully");
    return true;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    return false;
  }
}

// Handle connection events
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

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


// Health check endpoints
app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected', 
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({
    status: dbState === 1 ? 'healthy' : 'unhealthy',
    database: states[dbState] || 'unknown',
    timestamp: new Date().toISOString()
  });
});

app.get("/check", (req, res) => {
  res.status(200).send("server is running healthy");
});

app.get("/", (req, res) => {
  res.status(200).send("server is up and running");
});

// Start server only after database connection is established
async function startServer() {
  const isConnected = await connectToDatabase();
  
  if (!isConnected) {
    console.error("❌ Failed to connect to database. Exiting...");
    process.exit(1);
  }

  const PORT = process.env.PORT || 8080;
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}

// Start the application
startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
