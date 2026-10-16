"use strict";

const examples = {
  "account-alert": {
    sender: "Accounts Desk <notice@account-check.example>",
    subject: "Urgent: your mailbox will be disabled",
    body: "Your mailbox will be disabled today. Confirm your password immediately to restore access: https://mail-verify.example/signin"
  },
  "payment-request": {
    sender: "PayPal Help <support@account-alert.example>",
    subject: "Payment on hold - action required",
    body: "Your PayPal payment was placed on hold. Verify your account details immediately: https://account-alert.example/verify"
  },
  "team-meeting": {
    sender: "Krishna Chauhan <krishna@campus.example>",
    subject: "Team meeting notes for Friday",
    body: "Hi, I shared the notes from our project meeting. Please review the agenda before Friday so we can decide who will cover each section. Thanks!"
  },
  "project-update": {
    sender: "Kanha Pandey <kanha@college.example>",
    subject: "Updated project outline",
    body: "I revised the project outline after our discussion. When you have time, please read the new introduction and tell me if anything should change before our next meeting."
  }
};

// Fictional, short examples for a working classroom demonstration.
// This corpus is not a validated security dataset.
const trainingExamples = [
  ["phishing", "urgent verify your account immediately click this link to restore access"],
  ["phishing", "your password expires today confirm your password now"],
  ["phishing", "payment failed update your billing details to avoid suspension"],
  ["phishing", "final warning your mailbox will be disabled sign in to verify"],
  ["phishing", "we detected unusual activity confirm your identity using this secure link"],
  ["phishing", "claim your prize now provide your account details"],
  ["phishing", "invoice overdue send payment immediately using the attached link"],
  ["phishing", "your account has been locked verify your login information"],
  ["phishing", "act now to prevent service interruption enter your password"],
  ["phishing", "gift card payment required today reply with the code"],
  ["phishing", "security alert unusual sign in validate your account now"],
  ["phishing", "click below to confirm bank details and release your transfer"],
  ["ordinary", "hello team please review the meeting notes before friday"],
  ["ordinary", "thanks for sharing the project outline see you tomorrow"],
  ["ordinary", "the weekly report is ready for our discussion this afternoon"],
  ["ordinary", "could you send me the agenda for the next team meeting"],
  ["ordinary", "your presentation slides look good i added comments to the draft"],
  ["ordinary", "lunch is at noon let me know if you want to join us"],
  ["ordinary", "the class schedule changed please check the notice from campus"],
  ["ordinary", "i finished the research summary and saved it with our project files"],
  ["ordinary", "thank you for your feedback i will make those edits this evening"],
  ["ordinary", "the appointment is confirmed for next monday at ten am"],
  ["ordinary", "we will discuss the budget and timeline at our regular meeting"],
  ["ordinary", "please find the updated outline for review before our next call"]
];

function tokens(text) {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(word => word.length > 1);
}

function trainNaiveBayes(rows) {
  const labels = ["phishing", "ordinary"];
  const documents = Object.fromEntries(labels.map(label => [label, 0]));
  const counts = Object.fromEntries(labels.map(label => [label, new Map()]));
  const totals = Object.fromEntries(labels.map(label => [label, 0]));
  const vocabulary = new Set();

  for (const [label, text] of rows) {
    documents[label] += 1;
    for (const word of tokens(text)) {
      vocabulary.add(word);
      counts[label].set(word, (counts[label].get(word) || 0) + 1);
      totals[label] += 1;
    }
  }

  return text => {
    const words = tokens(text).filter(word => vocabulary.has(word));
    if (!words.length) return 0.5;
    const documentCount = rows.length;
    const vocabSize = vocabulary.size;
    const logScore = {};
    for (const label of labels) {
      logScore[label] = Math.log(documents[label] / documentCount);
      for (const word of words) {
        const wordCount = counts[label].get(word) || 0;
        logScore[label] += Math.log((wordCount + 1) / (totals[label] + vocabSize));
      }
    }
    const delta = logScore.phishing - logScore.ordinary;
    return 1 / (1 + Math.exp(Math.max(-40, Math.min(40, -delta))));
  };
}

const phishingLikelihood = trainNaiveBayes(trainingExamples);
const form = document.querySelector("#analysis-form");
const sampleSelect = document.querySelector("#sample-select");
const resultPanel = document.querySelector("#result-panel");

sampleSelect.addEventListener("change", () => {
  const sample = examples[sampleSelect.value];
  if (!sample) return;
  document.querySelector("#sender").value = sample.sender;
  document.querySelector("#subject").value = sample.subject;
  document.querySelector("#body").value = sample.body;
});

form.addEventListener("submit", event => {
  event.preventDefault();
  const sender = document.querySelector("#sender").value.trim();
  const subject = document.querySelector("#subject").value.trim();
  const body = document.querySelector("#body").value.trim();
  if (!sender && !subject && !body) {
    document.querySelector("#body").focus();
    return;
  }
  renderAnalysis({sender, subject, body});
});

function addFinding(findings, text, strength = "normal") {
  if (!findings.some(item => item.text === text)) findings.push({text, strength});
}

function reviewEmail({sender, subject, body}) {
  const fullText = `${sender}\n${subject}\n${body}`;
  const bodyAndSubject = `${subject}\n${body}`.toLowerCase();
  const findings = [];
  const links = [...new Set((body.match(/(?:https?:\/\/|www\.)[^\s<>"']+/gi) || [])
    .map(value => value.replace(/[),.;!?]+$/g, "")))];

  const urgencyTerms = ["urgent", "immediately", "act now", "final warning", "today", "within 24 hours"];
  const credentialTerms = ["confirm your password", "verify your password", "verify your account", "confirm your identity", "enter your password", "account details", "login information"];
  const paymentTerms = ["gift card", "wire transfer", "payment required", "payment failed", "invoice overdue", "billing details"];

  if (urgencyTerms.some(term => bodyAndSubject.includes(term))) {
    addFinding(findings, "The message creates urgency or threatens a service interruption.");
  }
  if (credentialTerms.some(term => bodyAndSubject.includes(term))) {
    addFinding(findings, "The message asks the reader to verify an account or share sign-in details.", "strong");
  }
  if (paymentTerms.some(term => bodyAndSubject.includes(term))) {
    addFinding(findings, "The message asks for payment or billing action.", "strong");
  }

  const emailMatch = sender.match(/([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/i);
  if (emailMatch) {
    const domain = emailMatch[2].toLowerCase();
    const displayName = sender.split("<")[0].toLowerCase();
    const brands = ["paypal", "microsoft", "google", "amazon", "apple", "netflix"];
    const claimedBrand = brands.find(brand => displayName.includes(brand));
    if (claimedBrand && !domain.includes(claimedBrand)) {
      addFinding(findings, `The sender display name mentions ${claimedBrand}, but the email domain does not match it.`, "strong");
    }
  }

  const linkHosts = [];
  for (const link of links) {
    try {
      const url = new URL(link.startsWith("www.") ? `https://${link}` : link);
      const host = url.hostname.toLowerCase();
      linkHosts.push(host);
      if (host.split(".").some(part => part.startsWith("xn--"))) {
        addFinding(findings, `A link uses an encoded domain name (${host}); verify it through the organization’s official site.`, "strong");
      }
      if (/\b(login|verify|secure|account|password|update)\b/i.test(host)) {
        addFinding(findings, `A link host contains account or sign-in wording (${host}).`);
      }
      if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
        addFinding(findings, `A link points directly to an IP address (${host}).`, "strong");
      }
    } catch {
      addFinding(findings, "A link could not be parsed; avoid opening it until its destination is verified.");
    }
  }

  const modelSignal = phishingLikelihood(fullText);
  if (modelSignal >= 0.74) {
    addFinding(findings, "The text classifier found wording similar to the fictional phishing examples used in this demo.");
  }

  const strongCount = findings.filter(item => item.strength === "strong").length;
  let priority = "low";
  if (strongCount >= 2 || (strongCount >= 1 && modelSignal >= 0.74)) priority = "high";
  else if (findings.length > 0 || modelSignal >= 0.74) priority = "medium";

  return {priority, findings, links, linkHosts, modelSignal};
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

function renderAnalysis(message) {
  const result = reviewEmail(message);
  const priorityCopy = {
    high: ["HIGH REVIEW PRIORITY", "Several strong warning signs were found. Verify the sender using a trusted contact method."],
    medium: ["REVIEW CAREFULLY", "Some warning signs were found. Check the sender and link destination before taking action."],
    low: ["FEWER SIGNS FOUND", "This demo did not find clear warning signs. A low result does not prove the email is safe."]
  }[result.priority];
  const signalName = result.modelSignal >= 0.74 ? "Elevated" : result.modelSignal >= 0.52 ? "Mixed" : "Low";
  const findings = result.findings.length
    ? result.findings.map(item => `<li><span class="evidence-icon ${item.strength === "strong" ? "strong" : ""}">!</span><span>${escapeHtml(item.text)}</span></li>`).join("")
    : '<li><span class="evidence-icon">✓</span><span>No obvious warning signs were found by the checks used in this demo.</span></li>';
  const links = result.links.length
    ? `<div class="link-list">${result.links.map((link, index) => `<span class="link-chip" title="${escapeHtml(link)}">${escapeHtml(result.linkHosts[index] || link)}</span>`).join("")}</div>`
    : '<span class="link-empty">No links detected in the message text.</span>';

  resultPanel.innerHTML = `
    <div class="result-top">
      <div><p class="eyebrow">REVIEW SUMMARY</p><h2>${priorityCopy[0]}</h2><p>${priorityCopy[1]}</p></div>
      <span class="priority ${result.priority}">${result.priority.toUpperCase()}</span>
    </div>
    <div class="model-signal"><strong>Local text model:</strong> ${signalName} phishing-like wording signal <span>(not a calibrated probability)</span></div>
    <section class="result-section"><h3>WHY IT WAS FLAGGED</h3><ul class="evidence-list">${findings}</ul></section>
    <section class="result-section"><h3>LINKS FOUND</h3>${links}</section>
    <section class="result-section"><h3>SAFE NEXT STEPS</h3><ol class="next-list"><li>Do not use the email link to sign in or make a payment.</li><li>Open the organization’s official website yourself or contact it using a known number.</li><li>Report the message to your school or workplace security contact if it remains suspicious.</li></ol></section>
    <p class="result-caveat">Demo only: the classifier uses a small synthetic corpus and simple checks. It can miss attacks or flag ordinary messages. Human review is required.</p>`;
}
