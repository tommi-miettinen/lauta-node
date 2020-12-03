const db = require("../db");
const aws = require("../aws");
const moment = require("moment");
moment.locale("fi");

exports.post = async (req, res, next) => {
  const { category } = req.params;
  try {
    const database = db.getDb();
    const postCount = await database
      .db()
      .collection("postCount")
      .findOneAndUpdate(
        {},
        { $inc: { postCount: 1 } },
        { returnNewDocument: true }
      );
    const newThread = {
      _id: postCount.value.postCount,
      title: req.body.title || "",
      content: req.body.content,
      mediaUrl: req.body.mediaUrl,
      createdAt: moment().format("LLL"),
      updatedAt: Date.now(),
      replies: [],
      posts: [],
    };
    database.db().collection(category).insertOne(newThread);
    res.status(201).json(newThread);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

exports.findAll = async (req, res, next) => {
  const { category } = req.params;
  try {
    const database = db.getDb();
    const threads = await database
      .db()
      .collection(category)
      .find()
      .sort({ updatedAt: -1 })
      .toArray();
    res.status(200).send(threads);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

exports.findOne = async (req, res, next) => {
  const id = parseInt(req.params.id);
  const { category } = req.params;
  try {
    const database = db.getDb();
    const threads = await database
      .db()
      .collection(category)
      .findOne({ $or: [{ _id: id }, { "posts._id": id }] });
    res.status(200).send(threads);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

const handleFileDeletion = (deletedThread) => {
  const files = [];
  try {
    deletedThread.posts.forEach((post) => {
      if (post.mediaUrl) {
        if (post.mediaUrl.includes("image")) {
          files.push(
            { Key: post.mediaUrl.split(".com/")[1] },
            {
              Key: post.mediaUrl
                .replace("image", "thumbnail")
                .split(".com/")[1],
            }
          );
        }
        if (
          !post.mediaUrl.includes("youtube") &&
          !post.mediaUrl.includes("image") &&
          post.mediaUrl.length > 1
        ) {
          files.push({ Key: post.mediaUrl.split(".com/")[1] });
        }
      }
    });
    if (deletedThread.mediaUrl) {
      if (deletedThread.mediaUrl.includes("image")) {
        files.push(
          { Key: deletedThread.mediaUrl.split(".com/")[1] },
          {
            Key: deletedThread.mediaUrl
              .replace("image", "thumbnail")
              .split(".com/")[1],
          }
        );
      }
      if (
        !deletedThread.mediaUrl.includes("youtube") &&
        !deletedThread.mediaUrl.includes("image")
      ) {
        files.push({ Key: deletedThread.mediaUrl.split(".com/")[1] });
      }
    }
    if (files.length > 0) {
      aws.deleteFromS3(files, "lauta");
    }
  } catch (error) {
    console.log(error);
  }
};

exports.delete = async (req, res, next) => {
  const threadId = parseInt(req.params.id);
  const { category } = req.params;
  try {
    const result = await db
      .getDb()
      .db()
      .collection(category)
      .findOneAndDelete({ _id: threadId });
    handleFileDeletion(result.value);
    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};
