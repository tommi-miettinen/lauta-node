const express = require("express");
const router = express.Router();
const posts = require("../controllers/posts");
const threads = require("../controllers/threads");
const upload = require("../controllers/upload");

router.post("/upload/:category/:mimeType/:postId/:thread", upload.handleUpload);
router.get("/threads/:category/:id", threads.findOne);
router.delete("/threads/:category/:id", threads.delete);
router.get("/threads/:category", threads.findAll);
router.post("/threads/:category", threads.post);
router.get("/posts/:category/:id", posts.findOne);
router.patch("/posts/:category/:id", posts.edit);
router.delete("/posts/:category/:id", posts.delete);
router.post("/posts/:category", posts.post);
router.get("/postcount", posts.postCount);

module.exports = router;
