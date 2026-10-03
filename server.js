
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

const IMAGE_PATH = path.join(__dirname, "watchparty.png");

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;

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

  const image = fs.existsSync(IMAGE_PATH)
    ? `<img src="/watchparty.png?v=${Date.now()}">`
    : "";

  res.send(`
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

img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>

</head>

<body>
${image}
</body>
</html>
`);
});


/* Current watch party */
app.get("/watchparty", (req, res) => {

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  res.json(watchParty);
});


/* Get Twitch access token */
async function getTwitchToken() {

  if (
    !TWITCH_CLIENT_ID ||
    !TWITCH_CLIENT_SECRET
  ) {
    throw new Error(
      "Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET"
    );
  }

  const response = await fetch(
    "https://id.twitch.tv/oauth2/token",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded"
      },

      body:
        "client_id=" +
        encodeURIComponent(
          TWITCH_CLIENT_ID
        ) +
        "&client_secret=" +
        encodeURIComponent(
          TWITCH_CLIENT_SECRET
        ) +
        "&grant_type=client_credentials"
    }
  );

  if (!response.ok) {
    throw new Error(
      "Twitch token request failed: " +
      response.status
    );
  }

  const data =
    await response.json();

  return data.access_token;
}


/* Find Twitch user */
async function getTwitchUser(username) {

  const token =
    await getTwitchToken();

  const response = await fetch(
    "https://api.twitch.tv/helix/users?login=" +
    encodeURIComponent(username),
    {
      headers: {
        "Authorization":
          "Bearer " + token,

        "Client-Id":
          TWITCH_CLIENT_ID
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      "Twitch user lookup failed: " +
      response.status
    );
  }

  const data =
    await response.json();

  if (
    !data.data ||
    data.data.length === 0
  ) {
    throw new Error(
      "Twitch user not found: " +
      username
    );
  }

  return data.data[0];
}


/* Download Twitch profile picture */
async function downloadImage(imageURL) {

  const response =
    await fetch(imageURL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0"
      }
    });

  if (!response.ok) {
    throw new Error(
      "Profile image download failed: " +
      response.status
    );
  }

  const buffer =
    Buffer.from(
      await response.arrayBuffer()
    );

  fs.writeFileSync(
    IMAGE_PATH,
    buffer
  );
}


/* Update watch party */
app.get("/update", async (req, res) => {

  try {

    const twitchName =
      String(
        req.query.name || ""
      ).trim();

    const title =
      String(
        req.query.title || ""
      ).trim();

    if (!twitchName) {
      return res
        .status(400)
        .send(
          "Missing Twitch username"
        );
    }

    if (!title) {
      return res
        .status(400)
        .send(
          "Missing watch party title"
        );
    }


    console.log(
      "Looking up Twitch:",
      twitchName
    );


    const twitchUser =
      await getTwitchUser(
        twitchName
      );


    console.log(
      "Twitch profile:",
      twitchUser.profile_image_url
    );


    await downloadImage(
      twitchUser.profile_image_url
    );


    watchParty = {
      live: true,

      name:
        twitchUser.display_name,

      title: title,

      image:
        "/watchparty.png?v=" +
        Date.now()
    };


    console.log(
      "Watch party updated:",
      watchParty
    );


    res.json({
      success: true,
      watchParty
    });

  } catch (error) {

    console.error(
      "UPDATE ERROR:",
      error
    );

    res
      .status(500)
      .send(
        error.message ||
        "Update failed"
      );
  }
});


/* Turn off */
app.get("/off", (req, res) => {

  watchParty.live = false;

  res.json({
    success: true
  });
});


/* Serve downloaded profile picture */
app.get("/watchparty.png", (req, res) => {

  if (
    !fs.existsSync(IMAGE_PATH)
  ) {
    return res
      .status(404)
      .send("No image");
  }

  res.setHeader(
    "Content-Type",
    "image/png"
  );

  res.setHeader(
    "Cache-Control",
    "no-store"
  );

  res.sendFile(
    IMAGE_PATH
  );
});


/* Start server */
app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `Running on port ${PORT}`
    );

  }
);
