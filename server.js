
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

const IMAGE_PATH = path.join(__dirname, "watchparty.png");

let currentImage = "";

/* CORS */
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

/*
  Render page.

  StreamElements Browser Source:
  https://YOUR-APP.onrender.com/
*/
app.get("/", (req, res) => {
  if (!fs.existsSync(IMAGE_PATH)) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          html, body {
            margin: 0;
            width: 100%;
            height: 100%;
            background: transparent;
            overflow: hidden;
          }
        </style>
      </head>

      <body></body>
      </html>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">

      <style>
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background: transparent;
          overflow: hidden;
        }

        img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      </style>
    </head>

    <body>
      <img src="/watchparty.png?v=${Date.now()}">
    </body>
    </html>
  `);
});

/*
  StreamElements calls:

  /update?image=IMAGE_URL
*/
app.get("/update", async (req, res) => {
  try {
    const imageURL = String(req.query.image || "").trim();

    if (!imageURL) {
      return res.status(400).send("Missing image URL");
    }

    console.log("Downloading image:");
    console.log(imageURL);

    const response = await fetch(imageURL, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      return res.status(400).send(
        `Image download failed: ${response.status}`
      );
    }

    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.startsWith("image/")) {
      return res.status(400).send(
        "URL did not return an image."
      );
    }

    const buffer = Buffer.from(
      await response.arrayBuffer()
    );

    fs.writeFileSync(IMAGE_PATH, buffer);

    currentImage = imageURL;

    console.log("Image downloaded successfully.");

    res.type("text").send("OK");

  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to download image.");
  }
});

/*
  Direct PNG URL:

  https://YOUR-APP.onrender.com/watchparty.png
*/
app.get("/watchparty.png", (req, res) => {
  if (!fs.existsSync(IMAGE_PATH)) {
    return res.status(404).send("No image uploaded.");
  }

  res.setHeader("Content-Type", "image/png");

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate"
  );

  res.sendFile(IMAGE_PATH);
});

/*
  Start server.
*/
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Watch Party server running on port ${PORT}`
  );
});
