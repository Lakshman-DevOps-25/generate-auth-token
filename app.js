require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());

const API_VERSION = "v23.0";

/**
 * Step 1
 * Redirect user to Facebook OAuth
 */
app.get("/auth/facebook", (req, res) => {

  const oauthUrl =
    `https://www.facebook.com/${API_VERSION}/dialog/oauth` +
    `?client_id=${process.env.APP_ID}` +
    `&redirect_uri=${process.env.REDIRECT_URI}` +
    `&scope=` +
    [
      "business_management",
      "whatsapp_business_management",
      "whatsapp_business_messaging"
    ].join(",");

  res.redirect(oauthUrl);
});

/**
 * Step 2
 * Facebook redirects here with code
 */
app.get(
  "/auth/facebook/callback",
  async (req, res) => {

    try {

      const code = req.query.code;

      if (!code) {
        return res.status(400).json({
          error: "Authorization code missing"
        });
      }

      /**
       * Exchange code for access token
       */
      const tokenResponse =
        await axios.get(
          `https://graph.facebook.com/${API_VERSION}/oauth/access_token`,
          {
            params: {
              client_id:
                process.env.APP_ID,

              client_secret:
                process.env.APP_SECRET,

              redirect_uri:
                process.env.REDIRECT_URI,

              code
            }
          }
        );

      const accessToken =
        tokenResponse.data.access_token;

      console.log(
        "OAuth Token Generated:"
      );

      console.log(accessToken);

      /**
       * OPTIONAL:
       * Send test WhatsApp message
       */

      const messageResponse =
        await axios.post(
          `https://graph.facebook.com/${API_VERSION}/${process.env.PHONE_NUMBER_ID}/messages`,
          {
            messaging_product:
              "whatsapp",

            to: "919876543210",

            type: "text",

            text: {
              body:
                "Hello from Dynamic OAuth Token 🚀"
            }
          },
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,

              "Content-Type":
                "application/json"
            }
          }
        );

      return res.json({
        success: true,
        accessToken,
        messageResponse:
          messageResponse.data
      });

    } catch (error) {

      console.error(
        error.response?.data ||
        error.message
      );

      return res.status(500).json({
        error:
          error.response?.data ||
          error.message
      });
    }
  }
);

app.listen(5000, () => {
  console.log(
    "Server running on port 5000"
  );
});