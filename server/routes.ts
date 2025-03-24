import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { insertExpenseSchema } from "@shared/schema";
import { z } from "zod";

// Set up multer for image uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(process.cwd(), "uploads");
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniquePrefix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniquePrefix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });
  
  // Serve uploads directory statically
  app.use("/uploads", express.static(uploadsDir));

  // User endpoints
  app.get("/api/user", async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(1); // Default user
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Error fetching user" });
    }
  });

  app.put("/api/user/budget", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        budget: z.number().min(0)
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid budget value" });
      }
      
      const { budget } = result.data;
      const user = await storage.updateUserBudget(1, budget); // Default user
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Error updating budget" });
    }
  });

  // Expense endpoints
  app.get("/api/expenses", async (req: Request, res: Response) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      let dateRange;
      if (startDate && endDate) {
        dateRange = { startDate, endDate };
      }
      
      const expenses = await storage.getExpenses(1, dateRange); // Default user
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Error fetching expenses" });
    }
  });

  app.post("/api/expenses", upload.single("image"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Image is required" });
      }
      
      // Validate request body
      const schema = z.object({
        amount: z.string().transform(val => parseFloat(val)),
        title: z.string().default("groceries")
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid expense data" });
      }
      
      const { amount, title } = result.data;
      
      // Generate thumbnail
      const thumbnailPath = req.file.path.replace(/\.\w+$/, "_thumb$&");
      await sharp(req.file.path)
        .resize(150, 150, { fit: "cover" })
        .toFile(thumbnailPath);
      
      // Create expense
      const imageUrl = `/uploads/${path.basename(req.file.path)}`;
      const thumbnailUrl = `/uploads/${path.basename(thumbnailPath)}`;
      
      const newExpense = await storage.createExpense({
        user_id: 1, // Default user
        amount,
        title,
        image_url: imageUrl,
        image_thumbnail_url: thumbnailUrl,
        expense_date: new Date()
      });
      
      res.status(201).json(newExpense);
    } catch (error) {
      res.status(500).json({ message: "Error creating expense" });
    }
  });

  app.get("/api/expenses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid expense ID" });
      }
      
      const expense = await storage.getExpenseById(id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Error fetching expense" });
    }
  });

  app.delete("/api/expenses/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid expense ID" });
      }
      
      // Get expense to find image paths
      const expense = await storage.getExpenseById(id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      // Delete files if they exist
      if (expense.image_url) {
        const imagePath = path.join(process.cwd(), expense.image_url.replace(/^\/uploads\//, "uploads/"));
        fs.unlink(imagePath, (err) => {
          if (err && err.code !== "ENOENT") {
            console.error("Error deleting image:", err);
          }
        });
      }
      
      if (expense.image_thumbnail_url) {
        const thumbnailPath = path.join(process.cwd(), expense.image_thumbnail_url.replace(/^\/uploads\//, "uploads/"));
        fs.unlink(thumbnailPath, (err) => {
          if (err && err.code !== "ENOENT") {
            console.error("Error deleting thumbnail:", err);
          }
        });
      }
      
      // Delete expense from database
      await storage.deleteExpense(id);
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting expense" });
    }
  });

  // Budget endpoints
  app.get("/api/budget/current", async (req: Request, res: Response) => {
    try {
      const budget = await storage.getCurrentBudget(1); // Default user
      res.json(budget);
    } catch (error) {
      res.status(500).json({ message: "Error fetching current budget" });
    }
  });

  app.get("/api/budget/history", async (req: Request, res: Response) => {
    try {
      const history = await storage.getBudgetHistory(1); // Default user
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Error fetching budget history" });
    }
  });

  app.put("/api/budget", async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        month: z.number().min(1).max(12),
        year: z.number().min(2000).max(3000),
        budget_amount: z.number().min(0)
      });
      
      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid budget data" });
      }
      
      const { month, year, budget_amount } = result.data;
      
      const budget = await storage.setMonthlyBudget({
        user_id: 1, // Default user
        month,
        year,
        budget_amount
      });
      
      res.json(budget);
    } catch (error) {
      res.status(500).json({ message: "Error updating budget" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Import express for the static middleware
import express from "express";
