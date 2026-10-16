# SignalCheck - Email Threat Review

SignalCheck is a software-only SIH26106 prototype by Team Apex Zero. It reviews an email pasted by the user, highlights common sender, link, urgency, and credential-request clues, and adds a small in-browser Naive Bayes text-classification signal.

## Run the demo

1. Open `index.html` in a current web browser.
2. Choose one of the fictional examples or paste a message.
3. Select **Analyze message** and review the evidence and suggested next steps.

The demo uses plain HTML, CSS, and JavaScript. It needs no install, backend, API key, or internet connection. The classifier runs in the browser. The prototype does not upload or save the email text.

## Important limits

The classifier learns from a small set of fictional examples written for this demo. It has not been validated on real-world email and is not a production security product. A low result does not prove a message is safe. Sender and link checks can produce false positives. Use human review and verify through a trusted channel.

The SIH problem title also mentions geolocation and forensic intelligence. This first prototype does not perform IP geolocation or query a live threat-intelligence feed. Those are possible future modules; any location inferred from an email header would be approximate and must not be treated as proof of sender identity.

## Project structure

- `index.html` - page structure and input form
- `src/styles.css` - responsive visual design
- `src/app.js` - sample messages, local classifier, explainable checks, and results

## Deployment

This is a static site and can be hosted from this folder on GitHub Pages or Vercel. The public repository and deployment URLs should be added to the presentation after the team publishes them.
