const AWS = require("aws-sdk");
const fs = require("fs").promises;

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "eu-north-1",
});

const s3 = new AWS.S3();

const uploadToS3 = async (source, targetName, contentType) => {
  console.log(source, targetName);
  console.log("preparing to upload...");
  console.log(contentType);
  const data = await fs.readFile(source);
  const putParams = {
    ContentType: contentType,
    Bucket: "lauta",
    Key: targetName,
    Body: data,
    ACL: "public-read",
  };
  s3.putObject(putParams, (err, data) => {
    if (err) {
      console.log("Could nor upload the file. Error :", err);
    } else {
      fs.unlink(source);
      console.log("Successfully uploaded the file", data);
    }
  });
};

const deleteFromS3 = (files, bucketName) => {
  let params = {
    Bucket: bucketName,
    Delete: {
      Objects: files,
    },
  };
  s3.deleteObjects(params, (err, data) => {
    console.log("deleting", files);
    console.log("from", bucketName);
    if (err) {
      console.log(err);
    }
    console.log("Successfully deleted the file", data);
  });
};

module.exports = {
  uploadToS3,
  deleteFromS3,
};
