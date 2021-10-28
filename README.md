[![Learn to code with TwilioQuest](https://img.shields.io/static/v1?label=TwilioQuest&message=Learn%20to%20code%21&color=F22F46&labelColor=1f243c&style=flat-square&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAASFBMVEUAAAAZGRkcHBwjIyMoKCgAAABgYGBoaGiAgICMjIyzs7PJycnMzMzNzc3UoBfd3d3m5ubqrhfrMEDu7u739/f4vSb/3AD///9tbdyEAAAABXRSTlMAAAAAAMJrBrEAAAKoSURBVHgB7ZrRcuI6EESdyxXGYoNFvMD//+l2bSszRgyUYpFAsXOeiJGmj4NkuWx1Qeh+Ekl9DgEXOBwOx+Px5xyQhDykfgq4wG63MxxaR4ddIkg6Ul3g84vCIcjPBA5gmUMeXESrlukuoK33+33uID8TWeLAdOWsKpJYzwVMB7bOzYSGOciyUlXSn0/ABXTosJ1M1SbypZ4O4MbZuIDMU02PMbauhhHMHXbmebmALIiEbbbbbUrpF1gwE9kFfRNAJaP+FQEXCCTGyJ4ngDrjOFo3jEL5JdqjF/pueR4cCeCGgAtwmuRS6gDwaRiGvu+DMFwSBLTE3+jF8JyuV1okPZ+AC4hDFhCHyHQjdjPHUKFDlHSJkHQXMB3KpSwXNGJPcwwTdZiXlRN0gSp0zpWxNtM0beYE0nRH6QIbO7rawwXaBYz0j78gxjokDuv12gVeUuBD0MDi0OQCLvDaAho4juP1Q/jkAncXqIcCfd+7gAu4QLMACCLxpRsSuQh0igu0C9Svhi7weAGZg50L3IE3cai4IfkNZAC8dfdhsUD3CgKBVC9JE5ABAFzg4QL/taYPAAWrHdYcgfLaIgAXWJ7OV38n1LEF8tt2TH29E+QAoDoO5Ve/LtCQDmKM9kPbvCEBApK+IXzbcSJ0cIGF6e8gpcRhUDogWZ8JnaWjPXc/fNnBBUKRngiHgTUSivSzDRDgHZQOLvBQgf8rRt+VdBUUhwkU6VpJ+xcOwQUqZr+mR0kvBUgv6cB4+37hQAkXqE8PwGisGhJtN4xAHMzrsgvI7rccXqSvKh6jltGlrOHA3Xk1At3LC4QiPdX9/0ndHpGVvTjR4bZA1ypAKgVcwE5vx74ulwIugDt8e/X7JgfkucBMIAr26ndnB4UCLnDOqvteQsHlgX9N4A+c4cW3DXSPbwAAAABJRU5ErkJggg==)](https://twilio.com/quest?utm_source=gh-badge&utm_medium=referral&utm_campaign=talkin-cedric)

# Talkin' Cedric

This project uses [Twilio Media Streams](https://www.twilio.com/media-streams) and [Amazon Transcribe](https://aws.amazon.com/transcribe/). It will convert your speech to text and repeat what you said back to you in the voice of Cedric, your favorite robot, star of [TwilioQuest](https://twilio.com/quest?utm_source=gh&utm_medium=referral&utm_campaign=talkin-cedric).

## Installation

Install the [Twilio CLI](https://twil.io/cli)

### Glitch

1. Locate your Twilio number

    ```bash
    twilio phone-numbers:list
    ```

1. Set your incoming voice Webhook to your Glitch URL

    ```bash
    twilio phone-numbers:update +15552223344 --voice-url="https://your-glitch-project.glitch.me/twiml"
    ```

1. Copy the [`.env.example`](./.env.example) keys and configure the values in your [`.env`](./.env) file.

    ```bash
    cp .env.example .env
    ```
    See [Twilio Account Settings](#twilio-account-settings) to locate the necessary Twilio environment variables.
### Develop locally

1. Install your dependencies

    ```bash
    npm install
    ```

1. Configure your environment

    ```bash
    npx configure-env
    ```

1. Locate your existing phone number

    ```bash
    twilio phone-numbers:list
    ```

1. Set up an ngrok tunnel to your local server

    ```bash
    twilio phone-numbers:update +15552223344 --voice-url="https://localhost:3000/twiml"
    ```

## Learn more

* [More Twilio Media Streams examples](https://github.com/twilio/media-streams)
* [`<Stream>` Documenation](https://www.twilio.com/docs/voice/twiml/stream)
* [Amazon Transcribe using Websockets Documentation](https://docs.aws.amazon.com/transcribe/latest/dg/websocket.html)
* [Amazon Transcribe Websockets Sample Application](https://github.com/aws-samples/amazon-transcribe-websocket-static)

## Meta

* No warranty expressed or implied. Software is as is. Diggity.
* [MIT License](http://www.opensource.org/licenses/mit-license.html)
* Lovingly crafted by Twilio Developer Education.
