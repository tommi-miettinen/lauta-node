const db = require("../db");
const fs = require("fs").promises;
const aws = require("../aws");
const imageThumbnail = require("image-thumbnail");

const createThumbnail = async (req, filePath) => {
  let options = {
    width: 300,
  };
  try {
    const thumbnail = await imageThumbnail(req.file.path, options);
    const fileName = filePath.split("/").pop();
    const dir = `./public/thumbnail`;
    await fs.writeFile(`${dir}/${fileName}`, thumbnail);
  } catch (error) {
    console.log(error);
  }
};

exports.handleUpload = async (req, res) => {
  console.log("uploading");
  const { category } = req.params;
  try {
    const filePath = req.file.path
      .replace(/\\/g, "/")
      .substring("public".length);
    const path = `${process.env.API_URL}${filePath}`;
    const mimeType = req.params.mimeType.replace("_", "/");
    const postId = parseInt(req.params.postId);
    const isThread = req.params.thread === "true";
    console.log(filePath, "file path");
    aws.uploadToS3(req.file.path, filePath.slice(1), mimeType);
    if (mimeType.includes("image")) {
      await createThumbnail(req, filePath);
      aws.uploadToS3(
        req.file.path.replace("image", "thumbnail"),
        filePath.slice(1).replace("image", "thumbnail"),
        mimeType
      );
    }
    if (isThread) {
      const result = await db
        .getDb()
        .db()
        .collection(category)
        .updateOne({ _id: postId }, { $set: { mediaUrl: path } });
      return res.status(200).json(result);
    }
    const result = await db
      .getDb()
      .db()
      .collection(category)
      .updateOne(
        { posts: { $elemMatch: { _id: postId } } },
        { $set: { "posts.$.mediaUrl": path } }
      );
    return res.status(200).json(result);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};
