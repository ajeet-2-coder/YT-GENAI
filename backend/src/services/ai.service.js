const Groq = require("groq-sdk");

// ─────────────────────────────────────────────
// Client Initialization
// ─────────────────────────────────────────────
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─────────────────────────────────────────────
// Prompt Builder
// ─────────────────────────────────────────────
const buildInterviewReportPrompt = (jobDescription, resume, selfDescription) => {
    return `You are an expert career coach and technical interviewer.
Analyze the job description, resume, and self description provided below.
Return ONLY a valid JSON object — no markdown, no code fences, no explanation, no extra text whatsoever.

─────────────────────────────────────────────
JOB DESCRIPTION:
${jobDescription}

RESUME:
${resume?.trim() || "Not provided"}

SELF DESCRIPTION:
${selfDescription?.trim() || "Not provided"}
─────────────────────────────────────────────

Return EXACTLY this JSON structure with no additional fields:

{
  "title": "<job title extracted from job description>",
  "matchScore": <integer 0–100 representing resume-to-job fit>,
  "technicalQuestions": [
    {
      "question": "<technical interview question>",
      "intention": "<why this question is asked>",
      "answer": "<ideal detailed answer>"
    }
  ],
  "behavioralQuestions": [
    {
      "question": "<behavioral interview question>",
      "intention": "<why this question is asked>",
      "answer": "<ideal answer using the STAR method>"
    }
  ],
  "skillGaps": [
    {
      "skill": "<skill name>",
      "severity": "<exactly one of: low | medium | high>"
    }
  ],
  "preparationPlan": [
    {
      "day": <integer starting from 1>,
      "focus": "<main focus area for the day>",
      "tasks": ["<task 1>", "<task 2>", "<task 3>"]
    }
  ]
}

─────────────────────────────────────────────
STRICT RULES — violating any rule will break the app:
1. Return ONLY the raw JSON object. No markdown. No \`\`\`json. No preamble.
2. "technicalQuestions"  → exactly 5 items.
3. "behavioralQuestions" → exactly 5 items.
4. "skillGaps"           → 3 to 6 items based on resume vs job description gaps.
5. "preparationPlan"     → exactly 7 items (one per day, day 1 through 7).
6. "severity"            → must be lowercase: "low", "medium", or "high" only.
7. "matchScore"          → must be a number (not a string), between 0 and 100.
8. Every "tasks" array   → must contain at least 2 strings.
─────────────────────────────────────────────`;
};

// ─────────────────────────────────────────────
// Safe JSON Parser
// ─────────────────────────────────────────────
const safeParseJSON = (rawText) => {
    // Attempt 1: direct parse after stripping markdown fences
    try {
        const cleaned = rawText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();

        const parsed = JSON.parse(cleaned);
        return { success: true, data: parsed };
    } catch (_) {
        // fall through to next attempt
    }

    // Attempt 2: extract first {...} block using regex
    try {
        const match = rawText.match(/\{[\s\S]*\}/);
        if (match) {
            const parsed = JSON.parse(match[0]);
            return { success: true, data: parsed };
        }
    } catch (_) {
        // fall through
    }

    return {
        success: false,
        error: "AI returned a response that could not be parsed as JSON.",
        raw: rawText,
    };
};

// ─────────────────────────────────────────────
// Response Validator & Sanitizer
// ─────────────────────────────────────────────
const VALID_SEVERITIES = ["low", "medium", "high"];

const validateAndSanitize = (data) => {
    const errors = [];

    // title
    if (!data.title || typeof data.title !== "string") {
        errors.push("Missing or invalid 'title'");
    }

    // matchScore
    if (typeof data.matchScore !== "number" || data.matchScore < 0 || data.matchScore > 100) {
        errors.push("'matchScore' must be a number between 0 and 100");
    }

    // technicalQuestions
    if (!Array.isArray(data.technicalQuestions) || data.technicalQuestions.length === 0) {
        errors.push("'technicalQuestions' must be a non-empty array");
    } else {
        data.technicalQuestions.forEach((q, i) => {
            if (!q.question) errors.push(`technicalQuestions[${i}] missing 'question'`);
            if (!q.intention) errors.push(`technicalQuestions[${i}] missing 'intention'`);
            if (!q.answer)    errors.push(`technicalQuestions[${i}] missing 'answer'`);
        });
    }

    // behavioralQuestions
    if (!Array.isArray(data.behavioralQuestions) || data.behavioralQuestions.length === 0) {
        errors.push("'behavioralQuestions' must be a non-empty array");
    } else {
        data.behavioralQuestions.forEach((q, i) => {
            if (!q.question) errors.push(`behavioralQuestions[${i}] missing 'question'`);
            if (!q.intention) errors.push(`behavioralQuestions[${i}] missing 'intention'`);
            if (!q.answer)    errors.push(`behavioralQuestions[${i}] missing 'answer'`);
        });
    }

    // skillGaps — sanitize severity to lowercase with fallback
    if (!Array.isArray(data.skillGaps) || data.skillGaps.length === 0) {
        errors.push("'skillGaps' must be a non-empty array");
    } else {
        data.skillGaps = data.skillGaps.map((gap, i) => {
            if (!gap.skill) errors.push(`skillGaps[${i}] missing 'skill'`);
            const normalized = gap.severity?.toLowerCase();
            return {
                ...gap,
                severity: VALID_SEVERITIES.includes(normalized) ? normalized : "medium",
            };
        });
    }

    // preparationPlan
    if (!Array.isArray(data.preparationPlan) || data.preparationPlan.length === 0) {
        errors.push("'preparationPlan' must be a non-empty array");
    } else {
        data.preparationPlan.forEach((plan, i) => {
            if (typeof plan.day !== "number") errors.push(`preparationPlan[${i}] 'day' must be a number`);
            if (!plan.focus) errors.push(`preparationPlan[${i}] missing 'focus'`);
            if (!Array.isArray(plan.tasks) || plan.tasks.length === 0) {
                errors.push(`preparationPlan[${i}] 'tasks' must be a non-empty array`);
            }
        });
    }

    return { isValid: errors.length === 0, errors, data };
};

// ─────────────────────────────────────────────
// Core AI Call with Retry
// ─────────────────────────────────────────────
const callGroqWithRetry = async (prompt, retries = 2) => {
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            const response = await client.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 4000,
            });

            const rawText = response.choices[0].message.content;

            const { success, data, error, raw } = safeParseJSON(rawText);

            if (!success) {
                if (attempt <= retries) {
                    console.warn(`[AI Service] JSON parse failed on attempt ${attempt}. Retrying...`);
                    continue;
                }
                throw new Error(`JSON parse failed after ${attempt} attempts: ${error}\nRaw: ${raw}`);
            }

            const { isValid, errors, data: sanitized } = validateAndSanitize(data);

            if (!isValid) {
                if (attempt <= retries) {
                    console.warn(`[AI Service] Validation failed on attempt ${attempt}:`, errors, "Retrying...");
                    continue;
                }
                throw new Error(`Validation failed after ${attempt} attempts:\n${errors.join("\n")}`);
            }

            return sanitized;

        } catch (err) {
            // Re-throw non-parse/validation errors immediately (e.g. network, auth)
            if (
                !err.message.includes("JSON parse failed") &&
                !err.message.includes("Validation failed")
            ) {
                throw err;
            }
            if (attempt > retries) throw err;
        }
    }
};

// ─────────────────────────────────────────────
// Main Exported Service Function
// ─────────────────────────────────────────────

/**
 * Generates a structured interview report using Groq AI (Llama 3.3 70B).
 *
 * @param {Object} params
 * @param {string} params.jobDescription    - The full job description text
 * @param {string} [params.resume]          - The candidate's resume text (optional)
 * @param {string} [params.selfDescription] - The candidate's self description (optional)
 * @returns {Promise<Object>} Validated report data ready to save to MongoDB
 *
 * @example
 * const reportData = await generateInterviewReport({ jobDescription, resume, selfDescription });
 * const report = new InterviewReportModel({ ...reportData, user: userId, jobDescription, resume, selfDescription });
 * await report.save();
 */
const generateInterviewReport = async ({ jobDescription, resume = "", selfDescription = "" }) => {
    if (!jobDescription || typeof jobDescription !== "string" || !jobDescription.trim()) {
        throw new Error("jobDescription is required and cannot be empty.");
    }

    const prompt = buildInterviewReportPrompt(jobDescription, resume, selfDescription);

    try {
        const reportData = await callGroqWithRetry(prompt, 2);
        return reportData;
    } catch (err) {
        console.error("[AI Service] generateInterviewReport failed:", err.message);
        throw new Error(`Failed to generate interview report: ${err.message}`);
    }
};

module.exports = {
    generateInterviewReport,
};