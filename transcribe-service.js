const EventEmitter = require("events");
const Transform = require("stream").Transform;
const websocket = require("websocket-stream");
const crypto = require("crypto");
const marshaller = require("@aws-sdk/eventstream-marshaller"); // for converting binary event stream messages to and from JSON
const util_utf8_node = require("@aws-sdk/util-utf8-node"); // utilities for encoding and decoding UTF8
const v4 = require("./lib/aws-signature-v4"); // to generate our pre-signed URL

// our converter between binary AWS event stream messages and JSON
const eventStreamMarshaller = new marshaller.EventStreamMarshaller(
  util_utf8_node.toUtf8,
  util_utf8_node.fromUtf8
);

function getAudioEventMessageTransformer() {
  return new Transform({
    transform: (chunk, encoding, callback) => {
      const message = {
        headers: {
          ":message-type": {
            type: "string",
            value: "event",
          },
          ":event-type": {
            type: "string",
            value: "AudioEvent",
          },
        },
        body: Buffer.from(chunk),
      };
      const binary = eventStreamMarshaller.marshall(message);
      return callback(null, Buffer.from(binary));
    },
  });
}

function getAwsEventTransformerStream() {
  return new Transform({
    transform: (chunk, encoding, callback) => {
      const messageWrapper = eventStreamMarshaller.unmarshall(
        Buffer.from(chunk)
      );
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
        // This is the error
        return callback(messageBody.Message);
      }
    },
  });
}

function getSignedTranscribeWebsocketUrl() {
  const endpoint = `transcribestreaming.${process.env.AWS_REGION}.amazonaws.com:8443`;

  // get a preauthenticated URL that we can use to establish our WebSocket
  return v4.createPresignedURL(
    "GET",
    endpoint,
    "/stream-transcription-websocket",
    "transcribe",
    crypto.createHash("sha256").update("", "utf8").digest("hex"),
    {
      key: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_ACCESS_KEY,
      protocol: "wss",
      expires: 15,
      region: process.env.AWS_REGION,
      query: "language-code=en-US&media-encoding=pcm&sample-rate=8000",
    }
  );
}

class AmazonTranscribeService extends EventEmitter {
  constructor(pcmStream) {
    super();
    const awsUrl = getSignedTranscribeWebsocketUrl();
    const awsWsStream = websocket(awsUrl, {
      binaryType: "arraybuffer",
    });
    this.audioEventMessageTransformer = getAudioEventMessageTransformer();
    this.awsEventTransformerStream = getAwsEventTransformerStream();
    pcmStream
      .pipe(this.audioEventMessageTransformer)
      .pipe(awsWsStream)
      .pipe(this.awsEventTransformerStream);

    this.awsEventTransformerStream.on("data", (data) => {
      const transcription = data.toString('utf8');
      this.emit("transcription", transcription);
    });
  }

  stop() {
    console.log('Closing, sending empty buffer to Transcribe');
    this.audioEventMessageTransformer.write(Buffer.from([]));
  }
}

module.exports = AmazonTranscribeService;
