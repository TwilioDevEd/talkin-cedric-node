require("dotenv").config();
const fs = require("fs");
const crypto = require("crypto");
const marshaller = require("@aws-sdk/eventstream-marshaller"); // for converting binary event stream messages to and from JSON
const util_utf8_node = require("@aws-sdk/util-utf8-node"); // utilities for encoding and decoding UTF8
const express = require("express");
const hbs = require("express-handlebars");
const expressWebSocket = require("express-ws");
const Transform = require("stream").Transform;
const websocket = require("websocket-stream");
const websocketStream = require("websocket-stream/stream");
const v4 = require("./lib/aws-signature-v4"); // to generate our pre-signed URL
const WaveFile = require('wavefile').WaveFile;
const TwilioClient = require("twilio");


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
app.post("/twiml", (request, response) => {
  response.setHeader("Content-Type", "application/xml");
  response.render("twiml", { host: request.hostname, layout: false });
});

app.ws("/media", (ws, req) => {
  // Audio Stream coming from Twilio
  const mediaStream = websocketStream(ws);
  let callSid;
  const client = new TwilioClient();
  const audioStream = new Transform({
    transform: (chunk, encoding, callback) => {
      const msg = JSON.parse(chunk.toString("utf8"));
      if (msg.event === "start") {
        callSid = msg.start.callSid;
        console.log(`Captured call ${callSid}`);
      }
      // Only process media messages
      if (msg.event !== "media") return callback();
      // This is mulaw
      return callback(null, Buffer.from(msg.media.payload, "base64"));
    }
  });
  const pcmStream = new Transform({
    transform: (chunk, encoding, callback) => {
      const wav = new WaveFile();
      wav.fromScratch(1, 8000, '8m', chunk);
      wav.fromMuLaw();
      return callback(null, Buffer.from(wav.data.samples));
    },
  });
  const audioEventMessageTransformer = new Transform({
    transform: (chunk, encoding, callback) => {
      const message = {
        headers: {
          ":message-type": {
            type: "string",
            value: "event"
          },
          ":event-type": {
            type: "string",
            value: "AudioEvent"
          }
        },
        body: Buffer.from(chunk)
      };
      const binary = eventStreamMarshaller.marshall(message);
      return callback(null, Buffer.from(binary));
    }
  });
  const awsUrl = getSignedTranscribeWebsocketUrl();

  const awsWsStream = websocket(awsUrl, {
    binaryType: "arraybuffer"
  });
  const awsEventTransformerStream = new Transform({
    transform: (chunk, encoding, callback) => {
      const messageWrapper = eventStreamMarshaller.unmarshall(Buffer.from(chunk));
      const messageBody = JSON.parse(
        String.fromCharCode.apply(String, messageWrapper.body)
      );
      if (messageWrapper.headers[":message-type"].value === "event") {
        const results = messageBody.Transcript.Results;
        if (results.length === 0) return callback();
        let transcript = results[0].Alternatives[0].Transcript;
        transcript = decodeURIComponent(escape(transcript));
        if (results[0].IsPartial) {
          // console.log(`Partial transcript: ${transcript}`);
          return callback();
        } else {
          // console.log(`Full transcript: ${transcript}`);
          return callback(null, transcript);
        }
      } else {
        // THIS SHOULD BE AN ERROR
        return callback(messageBody.Message);
      }
    }
  });
  // Pipe our streams together
  const fileStream = fs.createWriteStream("test.pcm");
  mediaStream
    .pipe(audioStream)
    .pipe(pcmStream)
    .pipe(audioEventMessageTransformer)
    .pipe(awsWsStream)
    .pipe(awsEventTransformerStream);
    
  awsEventTransformerStream.on("data", (data) => {
    console.log(`Processing ${data}`);
    client.calls(callSid).update({
      twiml: `<Response><Say voice="Polly.Brian" language="en.GB">${data}</Say><Pause length="120" /></Response>`
    });
  });
  
  mediaStream.on('close', () => {
    console.log('Closing, sending empty buffer to transcribe');
    audioEventMessageTransformer.write(Buffer.from([]));
  });
  
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
      //sessionToken: 'talkin-cedric',
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
