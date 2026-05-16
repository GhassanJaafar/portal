// ─────────────────────────────────────────────────────────────────────────────
// questions.js — Al Rabat University English Testing Platform
// Each question: { text, options: [string, string, string], answer: 0|1|2 }
// ─────────────────────────────────────────────────────────────────────────────

const QUESTIONS = {

  // ── PLACEMENT TEST (mixed A → C difficulty) ──────────────────────────────
  placement: [
    {
      text: "Choose the correct word: My sister ___ at a hospital.",
      options: ["works", "work", "working"],
      answer: 0
    },
    {
      text: "What is the past tense of 'buy'?",
      options: ["bought", "buyed", "buys"],
      answer: 0
    },
    {
      text: "She has lived in London ___ 2010.",
      options: ["since", "for", "from"],
      answer: 0
    },
    {
      text: "Which sentence is correct?",
      options: [
        "He doesn't like coffee.",
        "He don't like coffee.",
        "He not like coffee."
      ],
      answer: 0
    },
    {
      text: "If it ___ tomorrow, we will cancel the trip.",
      options: ["rains", "will rain", "rained"],
      answer: 0
    },
    {
      text: "The passive form of 'They built the bridge in 1990' is:",
      options: [
        "The bridge was built in 1990.",
        "The bridge built in 1990.",
        "The bridge is built in 1990."
      ],
      answer: 0
    },
    {
      text: "I wish I ___ how to play the piano.",
      options: ["knew", "know", "will know"],
      answer: 0
    },
    {
      text: "The word 'benevolent' most closely means:",
      options: ["Kind and generous", "Cruel and harsh", "Shy and reserved"],
      answer: 0
    },
    {
      text: "Which sentence uses a relative clause correctly?",
      options: [
        "The man who called you is my uncle.",
        "The man which called you is my uncle.",
        "The man whose called you is my uncle."
      ],
      answer: 0
    },
    {
      text: "Choose the grammatically correct sentence:",
      options: [
        "Hardly had she left when it started raining.",
        "Hardly she had left when it started raining.",
        "Hardly she left when it started raining."
      ],
      answer: 0
    }
  ],

  // ── A LEVEL — A1/A2 (Beginner to Elementary) ─────────────────────────────
  A: [
    {
      text: "Choose the correct word: I ___ a student.",
      options: ["am", "is", "are"],
      answer: 0
    },
    {
      text: "Which is correct? 'She has ___ apple.'",
      options: ["an", "a", "the"],
      answer: 0
    },
    {
      text: "What is the plural of 'child'?",
      options: ["children", "childs", "childrens"],
      answer: 0
    },
    {
      text: "I ___ TV every evening.",
      options: ["watch", "watches", "watching"],
      answer: 0
    },
    {
      text: "Which word is the opposite of 'hot'?",
      options: ["cold", "warm", "cool"],
      answer: 0
    },
    {
      text: "'I'm hungry' means:",
      options: ["I want to eat", "I want to sleep", "I want to drink"],
      answer: 0
    },
    {
      text: "She ___ to school by bus.",
      options: ["goes", "go", "going"],
      answer: 0
    },
    {
      text: "Which sentence is correct?",
      options: [
        "There are four people in my family.",
        "There is four people in my family.",
        "There have four people in my family."
      ],
      answer: 0
    },
    {
      text: "What does 'expensive' mean?",
      options: ["Costs a lot of money", "Is very old", "Is very heavy"],
      answer: 0
    },
    {
      text: "Choose the correct response to 'How are you?'",
      options: [
        "I'm fine, thank you.",
        "I'm twenty years old.",
        "I'm a teacher."
      ],
      answer: 0
    }
  ],

  // ── B LEVEL — B1/B2 (Intermediate to Upper-Intermediate) ─────────────────
  B: [
    {
      text: "By the time she arrived, we ___ for two hours.",
      options: ["had been waiting", "have been waiting", "were waiting"],
      answer: 0
    },
    {
      text: "The negotiators reached a ___ agreement after long talks.",
      options: ["tentative", "tentatively", "tentativeness"],
      answer: 0
    },
    {
      text: "Identify the correct sentence:",
      options: [
        "Not only did she pass, but she also got the highest score.",
        "Not only she passed, but she also got the highest score.",
        "Not only did she passed, but she also got the highest score."
      ],
      answer: 0
    },
    {
      text: "The word 'ambiguous' means:",
      options: [
        "Having more than one possible meaning",
        "Very clear and obvious",
        "Strongly committed to something"
      ],
      answer: 0
    },
    {
      text: "If they ___ harder, they would have passed the exam.",
      options: ["had studied", "studied", "would have studied"],
      answer: 0
    },
    {
      text: "Which is the correct passive form of 'Someone stole my wallet'?",
      options: [
        "My wallet was stolen.",
        "My wallet is stolen.",
        "My wallet has stolen."
      ],
      answer: 0
    },
    {
      text: "The phrasal verb 'put off' means:",
      options: ["postpone", "endure", "refuse"],
      answer: 0
    },
    {
      text: "Choose the correct word: The new policy will ___ affect thousands of workers.",
      options: ["significantly", "significant", "significance"],
      answer: 0
    },
    {
      text: "Which sentence is grammatically correct?",
      options: [
        "She suggested going to the museum.",
        "She suggested to go to the museum.",
        "She suggested go to the museum."
      ],
      answer: 0
    },
    {
      text: "What does 'to beat around the bush' mean?",
      options: [
        "To avoid talking about the main point",
        "To walk without a clear direction",
        "To argue loudly with someone"
      ],
      answer: 0
    }
  ],

  // ── C LEVEL — C1/C2 (Advanced to Proficiency) ────────────────────────────
  C: [
    {
      text: "The professor's lecture was so ___ that most students struggled to follow.",
      options: ["abstruse", "abstract", "absorbing"],
      answer: 0
    },
    {
      text: "Identify the correct sentence:",
      options: [
        "Had she known about the meeting, she would have attended.",
        "If she would have known about the meeting, she would have attended.",
        "Would she have known about the meeting, she would attend."
      ],
      answer: 0
    },
    {
      text: "The word 'equivocate' means:",
      options: [
        "To speak ambiguously to avoid commitment",
        "To be completely honest and direct",
        "To repeat a statement for emphasis"
      ],
      answer: 0
    },
    {
      text: "Which sentence demonstrates correct use of the subjunctive?",
      options: [
        "It is essential that he be present at the hearing.",
        "It is essential that he is present at the hearing.",
        "It is essential that he being present at the hearing."
      ],
      answer: 0
    },
    {
      text: "What does the idiom 'to split hairs' mean?",
      options: [
        "To argue about trivial, minor details",
        "To divide something equally",
        "To cause conflict between people"
      ],
      answer: 0
    },
    {
      text: "Choose the correct relative pronoun: 'The results, ___ were inconclusive, prompted further research.'",
      options: ["which", "that", "whose"],
      answer: 0
    },
    {
      text: "The prefix in 'misanthrope' suggests:",
      options: ["Hatred or strong dislike", "Excess or too much", "Below or beneath"],
      answer: 0
    },
    {
      text: "Identify the sentence with correct parallel structure:",
      options: [
        "She enjoys reading, writing, and debating.",
        "She enjoys to read, writing, and to debate.",
        "She enjoys reading, to write, and debating."
      ],
      answer: 0
    },
    {
      text: "The literary term 'soliloquy' refers to:",
      options: [
        "A character speaking thoughts aloud when alone",
        "A formal conversation between two characters",
        "A lengthy description of a setting"
      ],
      answer: 0
    },
    {
      text: "Choose the sentence that uses 'albeit' correctly:",
      options: [
        "The plan succeeded, albeit with some complications.",
        "The plan succeeded albeit, with some complications.",
        "Albeit the plan succeeded, with some complications."
      ],
      answer: 0
    }
  ]
};

// ── PLACEMENT TEST: score → level mapping ────────────────────────────────────
// Score out of 10
const PLACEMENT_RANGES = [
  { min: 0, max: 3, level: 'A', label: 'A1/A2', description: 'Beginner – Elementary' },
  { min: 4, max: 7, level: 'B', label: 'B1/B2', description: 'Intermediate – Upper Intermediate' },
  { min: 8, max: 10, level: 'C', label: 'C1/C2', description: 'Advanced – Proficiency' }
];

// ── PASS THRESHOLD ────────────────────────────────────────────────────────────
// Minimum correct answers (out of 10) to pass a level exam
const PASS_SCORE = 6;

// ── SERVICE PRICES (SDG) ──────────────────────────────────────────────────────
const PRICES = {
  placement:   3500,
  level:       4000,
  certificate: 5000
};

// ── VIDEO LESSON URLS ─────────────────────────────────────────────────────────
// Replace with real YouTube video IDs before going live
const LESSON_VIDEOS = {
  A: 'https://www.youtube.com/embed/REPLACE_WITH_A_LEVEL_VIDEO_ID',
  B: 'https://www.youtube.com/embed/REPLACE_WITH_B_LEVEL_VIDEO_ID',
  C: 'https://www.youtube.com/embed/REPLACE_WITH_C_LEVEL_VIDEO_ID',
  certificate: 'https://www.youtube.com/embed/REPLACE_WITH_CERTIFICATE_VIDEO_ID'
};
