require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const db = require("./db");
const bodyParser = require("body-parser");
const multer = require("multer");
const app = express();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const mimeType = req.path.split("/")[3].replace("_", "/");
    const mediaType = mimeType.split("/")[0];
    const dir = `./public/${mediaType}`;
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const id = req.path.split("/")[4];
    const fileExtension = file.originalname.split(".").pop();
    cb(null, `${id}.${fileExtension}`);
  },
});

app.use(cors());
app.use(express.static("public"));
app.use(bodyParser.json({ limit: "50MB" }));
app.use(multer({ storage: storage }).single("file"));
app.use(routes);

const port = process.env.PORT || 8080;

db.initDb((err, db) => {
  if (err) {
    console.log(err);
  } else {
    app.listen(port, () => console.log(`Server started on port ${port}`));
  }
});
