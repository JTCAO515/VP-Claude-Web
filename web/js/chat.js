import { chatStream } from "./api.js";
import { recentQuestions } from "./store.js";
import { showToast } from "./toast.js";

const FOLLOWUP_BANK = [
  "How many days should I spend there?",
  "What's the best season to visit?",
  "Any foreigner-friendly hotel areas nearby?",
  "What local dishes should I try?",
  "How do I get there from the airport?",
];

function buildFollowups(answer) {
  const seed = answer.length % FOLLOWUP_BANK.length;
  return [FOLLOWUP_BANK[seed], FOLLOWUP_BANK[(seed + 1) % FOLLOWUP_BANK.length]];
}

export function initChat() {
  const welcome = document.querySelector("#chatWelcome");
  const log = document.querySelector("#chatLog");
  const form = document.querySelector("#chatForm");
  const input = document.querySelector("#chatInput");
  const status = document.querySelector("#chatStatus");
  const followupsEl = document.querySelector("#followups");
  const template = document.querySelector("#messageTemplate");
  let conversation = [];
  let started = false;

  function addMessage(author, text, kind = "") {
    const node = template.content.firstElementChild.cloneNode(true);
    node.classList.toggle("is-user", kind === "user");
    node.querySelector(".message__author").textContent = author;
    node.querySelector(".message__body").textContent = text;
    log.appendChild(node);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    return node.querySelector(".message__body");
  }

  function renderFollowups(answer) {
    const prompts = buildFollowups(answer);
    followupsEl.replaceChildren(
      ...prompts.map((text) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "followup";
        btn.textContent = text;
        btn.addEventListener("click", () => send(text));
        return btn;
      }),
    );
    followupsEl.hidden = prompts.length === 0;
  }

  async function send(message) {
    if (!message.trim()) return;
    if (!started) {
      welcome.style.display = "none";
      started = true;
    }
    addMessage("You", message, "user");
    recentQuestions.add(message);
    conversation.push({ role: "user", content: message });
    input.value = "";
    input.style.height = "auto";
    followupsEl.hidden = true;
    status.textContent = "VisePanda is thinking...";

    const target = addMessage("VisePanda", "");
    let full = "";
    try {
      await chatStream(message, conversation.slice(0, -1), (delta) => {
        full += delta;
        target.textContent = full;
        window.scrollTo({ top: document.body.scrollHeight, behavior: "auto" });
      });
      conversation.push({ role: "assistant", content: full });
      renderFollowups(full);
    } catch (error) {
      if (!target.textContent.trim()) {
        target.textContent = "I could not reach the guide service. Please try again.";
      } else {
        target.textContent += "\n\n[Connection lost. The answer above may be incomplete.]";
      }
      showToast(error.message, "error");
    } finally {
      status.textContent = "";
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    send(input.value);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(input.value);
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  });

  input.addEventListener("focus", () => document.body.classList.add("is-composing"));
  input.addEventListener("blur", () => document.body.classList.remove("is-composing"));

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => send(chip.dataset.prompt));
  });
}
