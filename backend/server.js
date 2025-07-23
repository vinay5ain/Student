require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
const winston = require("winston");
const path = require("path"); // ✅ Fix: Added to prevent ReferenceError

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use(morgan(":method :url :status :response-time ms - :res[content-length]"));

// Winston Logger Configuration
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    dbName: "StudentDB",
  })
  .then(() => logger.info("Connected to MongoDB"))
  .catch((err) => logger.error("MongoDB connection error:", err));

// Mongoose Schemas and Models
const StudentSchema = new mongoose.Schema({
  name: String,
  email: String,
  enrollmentNumber: String,
  course: String,
  year: String,
});

const TeacherSchema = new mongoose.Schema({
  name: String,
  email: String,
  subject: String,
  experience: Number,
});

const Student = mongoose.model("Student", StudentSchema);
const Teacher = mongoose.model("Teacher", TeacherSchema);

// Routes for Student CRUD
app.post("/api/students", async (req, res) => {
  try {
    const student = new Student(req.body);
    await student.save();
    res.status(201).json(student);
  } catch (error) {
    logger.error("Error creating student:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/students", async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (error) {
    logger.error("Error fetching students:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/students/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (error) {
    logger.error("Error fetching student:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/students/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json(student);
  } catch (error) {
    logger.error("Error updating student:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: "Student not found" });
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    logger.error("Error deleting student:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Routes for Teacher CRUD
app.post("/api/teachers", async (req, res) => {
  try {
    const teacher = new Teacher(req.body);
    await teacher.save();
    res.status(201).json(teacher);
  } catch (error) {
    logger.error("Error creating teacher:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/teachers", async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.json(teachers);
  } catch (error) {
    logger.error("Error fetching teachers:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/teachers/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });
    res.json(teacher);
  } catch (error) {
    logger.error("Error fetching teacher:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/api/teachers/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });
    res.json(teacher);
  } catch (error) {
    logger.error("Error updating teacher:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/api/teachers/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });
    res.json({ message: "Teacher deleted successfully" });
  } catch (error) {
    logger.error("Error deleting teacher:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Serve Frontend
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
