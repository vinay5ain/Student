const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const morgan = require("morgan");
const winston = require("winston");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ✅ Root route to prevent "Cannot GET /"
app.get("/", (req, res) => {
  res.send("🎓 Student Management API is Live!");
});

// Winston Logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Morgan Logging
app.use(
  morgan(":method :url :status :response-time ms - :res[content-length]")
);

// Custom Logger Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      params: req.params,
      query: req.query,
      body: req.method !== "GET" ? req.body : undefined,
    });
  });
  next();
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/student-management-app")
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Schemas & Models
const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  course: { type: String, required: true },
  enrollmentDate: { type: Date, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true });

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
}, { timestamps: true });

const Student = mongoose.model("Student", studentSchema);
const Course = mongoose.model("Course", courseSchema);

// Course Routes
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find().sort({ name: 1 });
    logger.info(`Retrieved ${courses.length} courses`);
    res.json(courses);
  } catch (error) {
    logger.error("Error fetching courses:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/courses", async (req, res) => {
  try {
    const course = new Course(req.body);
    const savedCourse = await course.save();
    logger.info("New course created", { courseId: savedCourse._id });
    res.status(201).json(savedCourse);
  } catch (error) {
    logger.error("Error creating course:", error);
    res.status(400).json({ message: error.message });
  }
});

app.get("/api/courses/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (error) {
    logger.error("Error fetching course:", error);
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/courses/:id", async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!course) return res.status(404).json({ message: "Course not found" });
    logger.info("Course updated", { courseId: course._id });
    res.json(course);
  } catch (error) {
    logger.error("Error updating course:", error);
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/courses/:id", async (req, res) => {
  try {
    const count = await Student.countDocuments({ course: req.params.id });
    if (count > 0) {
      return res.status(400).json({ message: "Cannot delete course with enrolled students" });
    }
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });
    logger.info("Course deleted", { courseId: course._id });
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    logger.error("Error deleting course:", error);
    res.status(500).json({ message: error.message });
  }
});

// Student Routes
app.get("/api/students", async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    logger.info(`Retrieved ${students.length} students`);
    res.json(students);
  } catch (error) {
    logger.error("Error fetching students:", error);
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/students", async (req, res) => {
  try {
    const student = new Student(req.body);
    const savedStudent = await student.save();
    logger.info("Student created", { studentId: savedStudent._id });
    res.status(201).json(savedStudent);
  } catch (error) {
    logger.error("Error creating student:", error);
    res.status(400).json({ message: error.message });
  }
});

app.get('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (error) {
    logger.error("Error fetching student:", error);
    res.status(500).json({ message: error.message });
  }
});

app.put("/api/students/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!student) return res.status(404).json({ message: "Student not found" });
    logger.info("Student updated", { studentId: student._id });
    res.json(student);
  } catch (error) {
    logger.error("Error updating student:", error);
    res.status(400).json({ message: error.message });
  }
});

app.delete("/api/students/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    logger.info("Student deleted", { studentId: student._id });
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    logger.error("Error deleting student:", error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/students/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const students = await Student.find({
      $or: [
        { name: new RegExp(q, "i") },
        { email: new RegExp(q, "i") },
        { course: new RegExp(q, "i") }
      ]
    });
    logger.info("Search completed", { count: students.length });
    res.json(students);
  } catch (error) {
    logger.error("Search error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Dashboard Stats
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const activeStudents = await Student.countDocuments({ status: 'active' });
    const totalCourses = await Course.countDocuments();
    const activeCourses = await Course.countDocuments({ status: 'active' });
    const graduates = await Student.countDocuments({ status: 'inactive' });
    const courseCounts = await Student.aggregate([
      { $group: { _id: "$course", count: { $sum: 1 } } }
    ]);
    res.json({
      totalStudents, activeStudents, totalCourses, activeCourses,
      graduates, courseCounts,
      successRate: totalStudents > 0 ? Math.round((graduates / totalStudents)*100) : 0
    });
  } catch (error) {
    logger.error("Dashboard stats error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health/detailed', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    const memory = {
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      unit: 'MB'
    };
    const uptimeSec = Math.round(process.uptime());
    const formatUptime = secs => {
      const d = Math.floor(secs/(3600*24));
      const h = Math.floor((secs%(3600*24))/3600);
      const m = Math.floor((secs%3600)/60);
      const s = secs%60;
      return `${d}d ${h}h ${m}m ${s}s`;
    };
    res.status(200).json({
      status: 'UP',
      timestamp: new Date(),
      database: { status: dbStatus },
      system: {
        memory,
        uptime: { seconds: uptimeSec, formatted: formatUptime(uptimeSec) },
        nodeVersion: process.version,
        platform: process.platform
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (err) {
    res.status(500).json({ status: 'DOWN', error: err.message });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    body: req.body,
  });
  res.status(500).json({ message: "Internal server error" });
});

// ✅ Serve frontend
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
