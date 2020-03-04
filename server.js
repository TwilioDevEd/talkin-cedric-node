// server.js
// where your node app starts

const marshaller = require("@aws-sdk/eventstream-marshaller"); // for converting binary event stream messages to and from JSON
const util_utf8_node = require("@aws-sdk/util-utf8-node"); // utilities for encoding and decoding UTF8
const mulaw = require("alawmulaw/mulaw");
const express = require("express");
const hbs = require("express-handlebars");
const expressWebSocket = require("express-ws");
const Transform = require("stream").Transform;
const websocketStream = require("websocket-stream/stream");
const v4 = require("./aws-signature-v4"); // to generate our pre-signed URL

// our converter between binary AWS event stream messages and JSON
const eventStreamMarshaller = new marshaller.EventStreamMarshaller(
  util_utf8_node.toUtf8,
  util_utf8_node.fromUtf8
);

const app = express();
// extend express app with app.ws()
expressWebSocket(app, null, {
  perMessageDeflate: false
});
app.engine("hbs", hbs());
app.set("view engine", "hbs");

// make all the files in 'public' available
app.use(express.static("public"));
app.get("/", (request, response) => {
  response.render("home", { number: process.env.TWILIO_NUMBER, layout: false });
});

// Responds with Twilio instructions to begin the stream
app.get("/twiml", (request, response) => {
  res.setHeader("Content-Type", "application/xml");
  response.render("twiml", { host: request.hostname, layout: false });
});

app.ws("/media", (ws, req) => {
  // Audio Stream coming from Twilio
  const mediaStream = websocketStream(ws);
  const audioTransformerStream = new Transform({
    transform: (chunk, encoding, callback) => {
      const msg = JSON.parse(chunk.toString("utf8"));
      // Only process media messages
      if (msg.event !== "media") return callback();
      // Might not be the right format???
      const mulawBuffer = Buffer.from(msg.media.payload, "base64");
      // Decode to PCM
      const pcm = mulaw.decodeSample(mulawBuffer);
      return callback(null, pcm);
    }
  });
  const awsWs = new WebSocket(getSignedTranscribeWebsocketUrl());
  const awsStream = websocketStream(awsWs, {
    binary: true
  });
  const awsEventTransformerStream = new Transform({
    transform: (chunk, encoding, callback) => {
      const messageWrapper = eventStreamMarshaller.unmarshall(
        Buffer(message.data)
      );
      const messageBody = JSON.parse(
        String.fromCharCode.apply(String, messageWrapper.body)
      );
      if (messageWrapper.headers[":message-type"].value === "event") {
        return callback(null, messageBody);
      } else {
        // THIS SHOULD BE AN ERROR
        return callback(messageBody.Message);
      }
    }
  });
  // Pipe our streams together
  mediaStream
    .pipe(audioTransformerStream)
    .pipe(awsStream)
    .pipe(awsEventTransformerStream);
  // TODO: Deal with the event message
});

function getSignedTranscribeWebsocketUrl() {
  const endpoint = `transcribestreaming.${process.env.AWS_REGION}.amazonaws.com:8443`;

  // get a preauthenticated URL that we can use to establish our WebSocket
  return v4.createPresignedURL(
    "GET",
    endpoint,
    "/stream-transcription-websocket",
    "transcribe",
    crypto
      .createHash("sha256")
      .update("", "utf8")
      .digest("hex"),
    {
      key: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_ACCESS_KEY,
      //'sessionToken': $('#session_token').val(),
      protocol: "wss",
      expires: 15,
      region: process.env.AWS_REGION,
      query: "language-code=en-US&media-encoding=pcm&sample-rate=8000"
    }
  );
}

const listener = app.listen(3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
