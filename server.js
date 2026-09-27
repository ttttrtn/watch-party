const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

const IMAGE_PATH = path.join(__dirname, "watchparty.png");

let watchParty = {
  live: false,
  name: "",
  title: "",
  image: ""
};

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  next();
});

/* Render page */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
html,body {
  margin:0;
  width:100%;
  height:100%;
  background:transparent;
  overflow:hidden;
}

img {
  width:100%;
  height:100%;
  object-fit:contain;
}
</style>
</head>

<body>
${
  fs.existsSync(IMAGE_PATH)
    ? `<img src="/watchparty.png?v=${Date.now()}">`
    : ""
}
</body>
</html>
`);
});

/* Return current data */
app.get("/watchparty", (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(watchParty);
});

/* Download new image */
app.get("/update", async (req, res) => {
  try {
    const name = String(req.query.name || "").trim();
    const title = String(req.query.title || "").trim();
    const imageURL = String(req.query.image || "").trim();

    if (!name) {
      return res.status(400).send("Missing name");
    }

    if (!title) {
      return res.status(400).send("Missing title");
    }

    if (!imageURL) {
      return res.status(400).send("Missing image");
    }

    console.log("Downloading:", imageURL);

    const response = await fetch(imageURL, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      return res
        .status(400)
        .send(`Download failed: ${response.status}`);
    }

    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.startsWith("image/")) {
      return res.status(400).send("URL is not an image");
    }

    const buffer = Buffer.from(
      await response.arrayBuffer()
    );

    fs.writeFileSync(IMAGE_PATH, buffer);

    watchParty = {
      live: true,
      name,
      title,
      image: `/watchparty.png?v=${Date.now()}`
    };

    console.log("Watch party updated:", watchParty);

    res.json({
      success: true,
      watchParty
    });

  } catch (error) {
    console.error(error);
    res.status(500).send("Update failed");
  }
});

/* Turn off */
app.get("/off", (req, res) => {
  watchParty.live = false;

  res.json({
    success: true
  });
});

/* Serve PNG */
app.get("/watchparty.png", (req, res) => {
  if (!fs.existsSync(IMAGE_PATH)) {
    return res.status(404).send("No image");
  }

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "no-store");

  res.sendFile(IMAGE_PATH);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Running on port ${PORT}`);
});

