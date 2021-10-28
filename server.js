require("dotenv").config();
const express = require("express");
const hbs = require("express-handlebars");
const expressWebSocket = require("express-ws");
const Transform = require("stream").Transform;
const websocketStream = require("websocket-stream/stream");
const WaveFile = require("wavefile").WaveFile;
const AmazonTranscribeService = require("./transcribe-service");
const TwilioClient = require("twilio");

const app = express();
// extend express app with app.ws()
expressWebSocket(app, null, {
  perMessageDeflate: false,
});
app.engine("hbs", hbs());
app.set("view engine", "hbs");

// <ake all the files in 'public' available
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
    },
  });
  const pcmStream = new Transform({
    transform: (chunk, encoding, callback) => {
      const wav = new WaveFile();
      wav.fromScratch(1, 8000, "8m", chunk);
      wav.fromMuLaw();
      return callback(null, Buffer.from(wav.data.samples));
    },
  });

  const transcribeService = new AmazonTranscribeService(pcmStream);

  // Pipe our streams together
  mediaStream.pipe(audioStream).pipe(pcmStream);

  transcribeService.on("transcription", (transcription) => {
    console.log(`Processing ${transcription}`);
    const twiml = new TwilioClient.twiml.VoiceResponse();
    twiml.say(
      {
        voice: "Polly.Brian",
        language: "en.GB",
      },
      transcription
    );
    twiml.pause({ length: 120 });
    client.calls(callSid).update({
      twiml: twiml.toString(),
    });
  });

  mediaStream.on("close", () => {
    transcribeService.stop();
  });
});

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  console.trace(err);
  res.status(err.status || 500);
  res.send({
    message: err.message,
    error: {},
  });
});

const listener = app.listen(3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
