import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { User } from "../schema/user.js";
import { Group } from "../schema/groups.js";
import { get } from "mongoose";

export const register = async (req, res) => {
  const { name, contact, password } = req.body;

  if (!name || !contact || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const existingMember = await User.findOne({ contact });
  if (existingMember) {
    return res.status(400).json({ message: "User already exists" });
  }

  const user = {
    name,
    contact,
    password: await bcrypt.hash(password, 10),
  };

  const result = await User.create(user);

  if (!result) {
    return res.status(500).json({ message: "User registration failed" });
  }

  const token = jwt.sign(
    { id: result.id, name: result.name, contact: result.contact },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );
  return res
    .status(200)
    .json({ message: "User registered successfully", token });
};

export const login = async (req, res) => {
  const { contact, password } = req.body;
  if (!contact || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const user = await User.findOne({ contact });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, contact: user.contact },
    process.env.JWT_SECRET,
    {
      expiresIn: "1h",
    }
  );

  return res
    .status(200)
    .json({ message: "User logged in successfully", token });
};

export const getGroups = async (req, res) => {
  const user = req.user;
  const { id, name, contact } = user;
  const groups = await Group.find({
    "members.contact": user.contact,
  }).lean();

  return res
    .status(200)
    .json({ message: "Groups retrieved successfully", groups });
};

export const createGroup = async (req, res) => {
  try {
    const { groupName, members } = req.body;
    const user = req.user;
    if (!groupName || !members || members.length === 0) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const getMembers = await User.find(
      { contact: { $in: members } },
      { name: 1, contact: 1 }
    ).lean();
    const currentUser = {
      id: user.id,
      name: user.name,
      contact: user.contact,
    };

    getMembers.push(currentUser);

    const result = await Group.create({ groupName, members: getMembers });

    if (!result) {
      return res.status(500).json({ message: "Group creation failed" });
    }
    return res
      .status(200)
      .json({ message: "Group created successfully", group: result });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" , error: err.message });
  }
};

export const addMember = async (req, res) => {
  const { groupId, memberContact } = req.body;
  if (!groupId || !memberContact) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const group = await Group.findOne({ id: groupId });
  if (!group) {
    return res.status(404).json({ message: "Group not found" });
  }

  const memberDetails = await User.findOne({ contact: memberContact });
  if (!memberDetails) {
    return res.status(404).json({ message: "Member not found" });
  }
  const existingMember = group.members.find(
    (member) => member.contact === memberContact
  );
  if (existingMember) {
    return res
      .status(400)
      .json({ message: "Member already exists in the group" });
  }
  // Add member to group
  group.members.push(memberDetails);
  await group.save();

  return res.status(200).json({ message: "Member added successfully" });
};

export const removeMember = async (req, res) => {
  const { groupId, memberContact } = req.body;
  if (!groupId || !memberContact) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const group = await Group.findOne({ id: groupId });
  if (!group) {
    return res.status(404).json({ message: "Group not found" });
  }

  group.members = group.members.filter(
    (member) => member.contact !== memberContact
  );
  await group.save();

  return res.status(200).json({ message: "Member removed successfully" });
};

// export const getMembers = async (req, res) => {
//   console.log(req.body);
//   res.status(200).json({ message: "Members retrieved successfully" });
// };

export const addExpense = async (req, res) => {
  const { groupId, amount, description, paidBy, sharedby } = req.body;
  if (!groupId || !amount || !description || !paidBy || !sharedby) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const group = await Group.findOne({ id: groupId });
  if (!group) {
    return res.status(404).json({ message: "Group not found" });
  }
  const expense = {
    amount,
    description,
    paidBy,
    sharedby,
  };
  group.expenses.push(expense);
  await group.save();
  return res
    .status(200)
    .json({ message: "Expense added successfully", expense });
};

const getGroupedSettlements = async (expenses, settlements = []) => {
  // Track direct debts between users based on actual expenses
  const debts = {};

  function ensureUser(userId, userName) {
    if (!debts[userId]) {
      debts[userId] = { name: userName, owes: {}, owedBy: {} };
    }
  }

  // Step 1: Calculate direct debts for each expense
  for (const expense of expenses) {
    const { amount, paidBy, sharedby } = expense;
    const share = amount / sharedby.length;

    ensureUser(paidBy.id, paidBy.name);

    for (const user of sharedby) {
      ensureUser(user.id, user.name);

      // If someone other than the payer shares the expense, they owe the payer
      if (user.id !== paidBy.id) {
        if (!debts[user.id].owes[paidBy.id]) {
          debts[user.id].owes[paidBy.id] = { name: paidBy.name, amount: 0 };
        }
        debts[user.id].owes[paidBy.id].amount += share;
      }
    }
  }

  // Step 2: Subtract settled amounts
  for (const settlement of settlements) {
    const { from, to, amount, fromName, toName } = settlement;
    
    // Find debtor by contact
    let debtorId = null;
    let creditorId = null;
    
    for (const [userId, userData] of Object.entries(debts)) {
      // Find users by name (since settlement uses contact but debts use user id)
      if (userData.name === fromName) {
        debtorId = userId;
      }
      if (userData.name === toName) {
        creditorId = userId;
      }
    }
    
    // Reduce the debt by the settled amount
    if (debtorId && creditorId && debts[debtorId] && debts[debtorId].owes[creditorId]) {
      debts[debtorId].owes[creditorId].amount -= amount;
      
      // Remove debt if fully settled
      if (debts[debtorId].owes[creditorId].amount <= 0.01) {
        delete debts[debtorId].owes[creditorId];
      }
    }
  }

  // Step 3: Net out mutual debts (if A owes B and B owes A)
  for (const [debtorId, debtorData] of Object.entries(debts)) {
    for (const [creditorId, creditorInfo] of Object.entries(debtorData.owes)) {
      if (debts[creditorId] && debts[creditorId].owes[debtorId]) {
        const debtorOwes = creditorInfo.amount;
        const creditorOwes = debts[creditorId].owes[debtorId].amount;

        if (debtorOwes > creditorOwes) {
          creditorInfo.amount = debtorOwes - creditorOwes;
          delete debts[creditorId].owes[debtorId];
        } else if (creditorOwes > debtorOwes) {
          debts[creditorId].owes[debtorId].amount = creditorOwes - debtorOwes;
          delete debtorData.owes[creditorId];
        } else {
          delete debtorData.owes[creditorId];
          delete debts[creditorId].owes[debtorId];
        }
      }
    }
  }

  // Step 4: Format the result
  const result = [];
  for (const [debtorId, debtorData] of Object.entries(debts)) {
    const owesArray = [];
    for (const [creditorId, creditorInfo] of Object.entries(debtorData.owes)) {
      if (creditorInfo.amount > 0.01) {
        owesArray.push({
          to: creditorInfo.name,
          amount: Math.round(creditorInfo.amount * 100) / 100,
        });
      }
    }

    if (owesArray.length > 0) {
      result.push({
        [debtorData.name]: owesArray,
      });
    }
  }

  return result;
};

export const addSettlement = async (req, res) => {
  try {
    const { groupId, from, to, amount, fromName, toName } = req.body;
    
    if (!groupId || !from || !to || !amount || !fromName || !toName) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const group = await Group.findOne({ id: groupId });
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    // Add settlement record
    const settlement = {
      from,
      to,
      amount,
      fromName,
      toName,
      settledAt: new Date()
    };

    group.settlements.push(settlement);
    await group.save();

    return res.status(200).json({ 
      message: "Settlement recorded successfully", 
      settlement 
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ 
      message: "Internal server error", 
      error: err.message 
    });
  }
};

export const getExpenses = async (req, res) => {
  const { groupId } = req.query;
  if (!groupId) {
    return res.status(400).json({ message: "Group ID is required" });
  }

  // Fetch the group by ID
  const group = await Group.findOne({ id: groupId });

  if (!group) {
    return res.status(404).json({ message: "Group not found" });
  }

  const groupedSettlements = await getGroupedSettlements(group.expenses, group.settlements || []);

  return res.status(200).json({
    message: "Expenses retrieved successfully",
    expenses: group.expenses,
    balance: groupedSettlements,
    settlements: group.settlements || []
  });
};

export const getGroupDetails = async (req, res) => {
  const { groupId } = req.query;

  if (!groupId) {
    return res.status(400).json({ message: "Group ID is required" });
  }

  const group = await Group.findOne({ id: groupId });
  if (!group) {
    return res.status(404).json({ message: "Group not found" });
  }

  return res.status(200).json({
    message: "Group details retrieved successfully",
    group,
  });
};
