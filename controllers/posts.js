const db = require("../db");
const moment = require("moment");
const aws = require("../aws");
moment.locale("fi");

const parseIds = (content) => {
  const regex = />>\d+/gm;
  const ids = content.match(regex);
  return [...new Set(ids)].map((id) => parseInt(id.slice(2)));
};

const handleReplies = async (replyingTo, id, category) => {
  if (replyingTo) {
    await db
      .getDb()
      .db()
      .collection(category)
      .updateMany(
        {},
        { $push: { "posts.$[el].replies": id } },
        { arrayFilters: [{ "el._id": { $in: replyingTo } }] }
      );
  }
  await db
    .getDb()
    .db()
    .collection(category)
    .updateMany({ _id: { $in: replyingTo } }, { $push: { replies: id } });
};

const addPostToThread = async (threadId, newPost, category) => {
  try {
    const id = parseInt(threadId);
    const result = await db
      .getDb()
      .db()
      .collection(category)
      .updateOne(
        { _id: id },
        { $push: { posts: newPost }, $set: { updatedAt: Date.now() } }
      );
    return result;
  } catch (error) {
    console.log(error);
  }
};

const generatePostId = async () => {
  const postCount = await db
    .getDb()
    .db()
    .collection("postCount")
    .findOneAndUpdate(
      {},
      { $inc: { postCount: 1 } },
      { returnNewDocument: true }
    );
  return postCount.value.postCount;
};

exports.postCount = async (req, res) => {
  try {
    const postCount = await db
      .getDb()
      .db()
      .collection("postCount")
      .findOne({}, { postCount: true });
    console.log(postCount);
    res.status(201).json({ postCount });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "An error occurred." });
  }
};

exports.post = async (req, res) => {
  const { content, userId, mediaUrl, threadId } = req.body;
  const { category } = req.params;
  const newPost = {
    _id: await generatePostId(),
    content,
    userId,
    mediaUrl,
    createdAt: moment().format("LLL"),
    replies: [],
  };
  const id = newPost._id;
  try {
    await addPostToThread(threadId, newPost, category);
    await handleReplies(parseIds(content), id, category);
    res.status(201).json(newPost);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "An error occurred." });
  }
};

exports.edit = async (req, res) => {
  const { id, editedContent } = req.body;
  const { category } = req.params;
  try {
    await handleReplies(parseIds(editedContent), id, category);
    const result = await db
      .getDb()
      .db()
      .collection(category)
      .updateOne(
        { posts: { $elemMatch: { _id: id } } },
        { $set: { "posts.$.content": editedContent } }
      );
    res.status(201).json({ asd: "asd" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "An error occurred." });
  }
};

exports.delete = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { category } = req.params;
    const result = await db
      .getDb()
      .db()
      .collection(category)
      .findOneAndUpdate({ "posts._id": id }, { $pull: { posts: { _id: id } } });
    if (!result) {
      return res.status(404);
    }
    if (result && result.value.posts) {
      const path = result.value.posts
        .filter((post) => post._id === id)[0]
        .mediaUrl.split(".com")[1];
      if (path && path.includes("image")) {
        const files = [
          { Key: path.slice(1) },
          { Key: path.replace("image", "thumbnail").slice(1) },
        ];
        aws.deleteFromS3(files, "lauta");
      }
      if (path) {
        aws.deleteFromS3([{ Key: path.slice(1) }], "lauta");
      }
    }
    return res.status(200).json({ message: "Succesfully deleted" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "An error occurred." });
  }
};

exports.findOne = async (req, res) => {
  const id = parseInt(req.params.id);
  const { category } = req.params;
  try {
    const database = db.getDb();
    const result = await database
      .db()
      .collection(category)
      .findOne({ $or: [{ _id: id }, { "posts._id": id }] });
    if (result && result._id === id) {
      const thread = {
        _id: result._id,
        title: result.title,
        content: result.content,
        mediaUrl: result.mediaUrl,
        createdAt: result.createdAt,
        replies: result.replies,
      };
      return res.status(201).json(thread);
    }
    if (result && result.posts) {
      const post = result.posts.filter((post) => post._id === id)[0];
      return res.status(201).json(post);
    }
    if (!result) {
      return res.status(400).json({ error: "error" });
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(500);
  }
};
