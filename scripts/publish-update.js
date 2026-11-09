const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load .env from project root
dotenv.config();

const projectRoot = path.resolve(__dirname, "..");
const packageJsonPath = path.join(projectRoot, "package.json");

if (!fs.existsSync(packageJsonPath)) {
  console.error("package.json not found!");
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const version = pkg.version;
console.log(`Publishing update files for version: ${version}...`);

const accountId = process.env.R2_PUBLISH_ACCOUNT_ID;
const accessKeyId = process.env.R2_PUBLISH_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_PUBLISH_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_PUBLISH_BUCKET_NAME || "minecraft";

if (!accountId || !accessKeyId || !secretAccessKey) {
  console.error("Error: S3/R2 publishing credentials not fully defined in .env!");
  console.error("Please configure R2_PUBLISH_ACCOUNT_ID, R2_PUBLISH_ACCESS_KEY_ID, and R2_PUBLISH_SECRET_ACCESS_KEY.");
  process.exit(1);
}

const s3 = new S3Client({
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  region: "auto",
});

const filesToUpload = [
  {
    local: `release/DivLauncher Setup ${version}.exe`,
    remote: `DivLauncher/updates/DivLauncher Setup ${version}.exe`,
    contentType: "application/octet-stream"
  },
  {
    local: `release/DivLauncher Setup ${version}.exe.blockmap`,
    remote: `DivLauncher/updates/DivLauncher Setup ${version}.exe.blockmap`,
    contentType: "application/octet-stream"
  },
  {
    local: "release/latest.yml",
    remote: "DivLauncher/updates/latest.yml",
    contentType: "text/yaml"
  },
  {
    local: "release-notes.md",
    remote: "DivLauncher/release-notes.md",
    contentType: "text/markdown; charset=utf-8"
  }
];

async function upload() {
  for (const file of filesToUpload) {
    const fullPath = path.join(projectRoot, file.local);
    console.log(`Uploading ${fullPath} to R2 bucket ${bucketName} as ${file.remote}...`);
    try {
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${fullPath}. Did you run "npm run dist" first?`);
      }
      const fileBuffer = fs.readFileSync(fullPath);
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: file.remote,
        Body: fileBuffer,
        ContentType: file.contentType,
      });
      await s3.send(command);
      console.log(`Successfully uploaded ${file.local}!`);
    } catch (err) {
      console.error(`Failed to upload ${file.local}:`, err.message);
      process.exit(1);
    }
  }
  console.log(`All version ${version} files published successfully!`);
}

upload();
