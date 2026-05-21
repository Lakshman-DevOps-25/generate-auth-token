require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());

const API_VERSION = "v23.0";

/**
 * STEP 1
 * Redirect user to Facebook OAuth
 */
app.get("/auth/facebook", (req, res) => {

  const oauthUrl =
    `https://www.facebook.com/${API_VERSION}/dialog/oauth` +
    `?client_id=${process.env.APP_ID}` +
    `&redirect_uri=${encodeURIComponent(
      process.env.REDIRECT_URI
    )}` +
    `&scope=` +
    [
      "business_management",
      "whatsapp_business_management",
      "whatsapp_business_messaging"
    ].join(",");

  res.redirect(oauthUrl);
});

/**
 * STEP 2
 * Facebook callback
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
       * STEP 3
       * Exchange authorization code
       * for SHORT-LIVED token
       */
      const shortTokenResponse =
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

      const shortLivedToken =
        shortTokenResponse.data.access_token;

      /**
       * STEP 4
       * Exchange SHORT token
       * for LONG-LIVED token
       */
      const longTokenResponse =
        await axios.get(
          `https://graph.facebook.com/${API_VERSION}/oauth/access_token`,
          {
            params: {
              grant_type:
                "fb_exchange_token",

              client_id:
                process.env.APP_ID,

              client_secret:
                process.env.APP_SECRET,

              fb_exchange_token:
                shortLivedToken
            }
          }
        );

      const longLivedToken =
        longTokenResponse.data.access_token;

      const expiresIn =
        longTokenResponse.data.expires_in;

      /**
       * STEP 5
       * Calculate expiry date
       */
      const expiresAt =
        new Date(
          Date.now() +
          expiresIn * 1000
        );

      /**
       * STEP 6
       * Validate token
       */
      const appAccessToken =
        `${process.env.APP_ID}|${process.env.APP_SECRET}`;

      const debugResponse =
        await axios.get(
          `https://graph.facebook.com/debug_token`,
          {
            params: {
              input_token:
                longLivedToken,

              access_token:
                appAccessToken
            }
          }
        );

      /**
       * OPTIONAL:
       * Send WhatsApp message
       */

      const messageResponse =
        await axios.post(
          `https://graph.facebook.com/${API_VERSION}/${process.env.PHONE_NUMBER_ID}/messages`,
          {
            messaging_product:
              "whatsapp",

            to: "918331882058",

            type: "text",

            text: {
              body:
                "Hello from Long-Lived OAuth Token 🚀"
            }
          },
          {
            headers: {
              Authorization:
                `Bearer ${longLivedToken}`,

              "Content-Type":
                "application/json"
            }
          }
        );

      /**
       * FINAL RESPONSE
       */
      return res.json({

        success: true,

        shortLivedToken,

        longLivedToken,

        expiresInSeconds:
          expiresIn,

        expiresAt,

        tokenValidation:
          debugResponse.data,

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

/**
 * START SERVER
 */
app.listen(5000, () => {

  console.log(
    "Server running on port 5000"
  );
});
