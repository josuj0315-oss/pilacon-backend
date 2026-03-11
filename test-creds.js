const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

async function test() {
    const client = new S3Client({
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
    });

    try {
        const data = await client.send(new ListBucketsCommand({}));
        console.log("Success! Buckets:", data.Buckets.map(b => b.Name));
    } catch (err) {
        console.error("Error Code:", err.Code || err.name);
        console.error("Error Message:", err.message);
        if (err.Code === 'SignatureDoesNotMatch') {
            console.log("Credentials or region are likely incorrect.");
        }
    }
}

test();
