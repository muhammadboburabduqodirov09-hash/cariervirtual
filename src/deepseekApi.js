const FALLBACK_QUIZZES = {
  /* ---- career shifts ---- */
  "Barista": [
    { q: "A customer says their latte is too cold. What do you do first?", options: ["Ignore it", "Apologise and remake it", "Tell them to wait", "Charge extra"], answer: 1 },
    { q: "Which habit keeps the espresso machine hygienic?", options: ["Wipe the steam wand after every use", "Clean it once a week", "Only rinse the cups", "Never touch it"], answer: 0 },
    { q: "The line is long and a new customer arrives. Best move?", options: ["Skip the line", "Close the till", "Make drinks randomly", "Greet them warmly and take orders in turn"], answer: 3 }
  ],
  "Web Developer": [
    { q: "A button doesn't work on mobile. First step?", options: ["Delete the page", "Reproduce the bug and check the console", "Blame the user", "Restart the router"], answer: 1 },
    { q: "Why do developers use Git?", options: ["To track changes and undo mistakes", "To make pages slower", "To hide code", "To print code"], answer: 0 },
    { q: "A client wants a 2-week job by Friday. You…", options: ["Say yes and rush", "Disappear", "Explain honestly and offer a smaller first version", "Copy someone's site"], answer: 2 }
  ],
  "Hotel Steward": [
    { q: "You find a wallet in a room you're cleaning. You…", options: ["Keep it", "Leave it on the bed", "Hand it to reception right away", "Hide it"], answer: 2 },
    { q: "Best order for cleaning a room?", options: ["Floor first, then dust", "Only make the bed", "Skip the bathroom", "Dust high to low, floor last"], answer: 3 },
    { q: "A guest asks for extra towels while you're busy. You…", options: ["Note it and bring them politely soon", "Say 'later'", "Ignore the request", "Tell them to find some"], answer: 0 }
  ],
  "Courier": [
    { q: "The address on a parcel looks wrong. First step?", options: ["Throw it away", "Open the parcel", "Check the order and call the customer", "Leave it anywhere"], answer: 2 },
    { q: "Traffic is heavy and you're late. Best action?", options: ["Run red lights", "Tell the customer and keep driving safely", "Turn off your phone", "Skip the delivery"], answer: 1 },
    { q: "How should hot food be carried?", options: ["In an insulated bag, kept upright", "Loose on the seat", "Upside down", "Next to shoes"], answer: 0 }
  ],
  "Store Manager": [
    { q: "Shelves are empty but stock is in the back. You…", options: ["Close the store", "Hide the stock", "Wait for questions", "Restock the busiest shelves first"], answer: 3 },
    { q: "A customer has a receipt and a broken item. You…", options: ["Refuse", "Follow the refund policy politely", "Argue", "Give double"], answer: 1 },
    { q: "Profit means…", options: ["Money earned minus costs", "All the money in the till", "Only the prices", "Number of customers"], answer: 0 }
  ],
  /* ---- real-life growth habits ---- */
  "reading": [
    { q: "Why do we read a little every day instead of all at once?", options: ["It builds a strong habit and memory", "Books get scared", "Pages disappear", "It's a rule for no reason"], answer: 0 },
    { q: "You hit a word you don't know. Best move?", options: ["Close the book", "Skip the whole page", "Guess from context or look it up", "Cry"], answer: 2 },
    { q: "What shows you really understood the chapter?", options: ["Reading it super fast", "Retelling the main idea in your own words", "Counting the pages", "Holding the book upside down"], answer: 1 }
  ],
  "poem": [
    { q: "Best way to memorise a poem?", options: ["Read it once", "Learn it line by line, then recite aloud", "Sleep on the book", "Only read the title"], answer: 1 },
    { q: "You're stuck on homework. First step?", options: ["Give up", "Copy a friend", "Re-read the task and try a small first step", "Hide the notebook"], answer: 2 },
    { q: "Why recite the poem to your family?", options: ["To make noise", "Practice builds confidence and memory", "To finish faster", "No reason"], answer: 1 }
  ],
  "cleanup": [
    { q: "What's the smartest order to clean a room?", options: ["Push everything under the bed", "Declutter first, then dust, then floor", "Only clean what visitors see", "Spray water everywhere"], answer: 1 },
    { q: "Why keep your room tidy?", options: ["It saves time and keeps your mind calm", "It makes the floor shiny only", "Parents said so, that's all", "No benefit"], answer: 0 },
    { q: "You break something while cleaning. You…", options: ["Hide it", "Blame the cat", "Tell your parent honestly", "Glue it secretly"], answer: 2 }
  ],
  "coding": [
    { q: "Your code has an error. First step?", options: ["Delete everything", "Read the error message and find the line", "Close the laptop", "Write more code on top"], answer: 1 },
    { q: "Why practice 30 minutes daily instead of 5 hours once a week?", options: ["Computers like short sessions", "Small regular practice sticks better", "It's cheaper", "No reason"], answer: 1 },
    { q: "Best way to learn a new skill?", options: ["Only watch videos", "Try it yourself, make mistakes, retry", "Wait until you're older", "Memorise the manual"], answer: 1 }
  ]
};

const FALLBACK_QUIZ = (topic) => ({
  source: "offline",
  questions: (FALLBACK_QUIZZES[topic] || FALLBACK_QUIZZES.Barista).map((q) => ({ ...q }))
});

const getApiKey = () => {
  // Vite exposes only variables prefixed with VITE_ to browser code.
  // For a real production deployment, proxy this request through a server
  // so the secret is never shipped to the browser.
  return import.meta.env.VITE_DEEPSEEK_API_KEY || "";
};

export async function generateDeepSeekQuiz(topic) {
  const fallback = FALLBACK_QUIZ(topic);
  const key = getApiKey();

  if (!key) return fallback;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You write kid-friendly practical quizzes about jobs and good habits. Reply with JSON only."
          },
          {
            role: "user",
            content:
              `Create 3 short practical scenario questions for a child completing the task "${topic}". ` +
              'Each has exactly 4 options. Return JSON: {"questions":[{"q":"...","options":["..","..","..",".."],"answer":0}]} ' +
              "where answer is the index (0-3) of the correct option."
          }
        ]
      })
    });

    if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}`);

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek returned no message content");

    const parsed = JSON.parse(content.replace(/```json|```/g, "").trim());
    const questions = parsed?.questions;

    const valid =
      Array.isArray(questions) &&
      questions.length >= 3 &&
      questions.slice(0, 3).every(
        (q) =>
          typeof q?.q === "string" &&
          Array.isArray(q?.options) &&
          q.options.length === 4 &&
          q.options.every((o) => typeof o === "string") &&
          Number.isInteger(q.answer) &&
          q.answer >= 0 &&
          q.answer <= 3
      );

    return valid
      ? { source: "deepseek", questions: questions.slice(0, 3) }
      : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
