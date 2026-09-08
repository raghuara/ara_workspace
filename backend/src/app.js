const express = require("express");

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    message: "ARA Workspace API is running"
  });
});

module.exports = app;