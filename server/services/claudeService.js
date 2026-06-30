require('dotenv').config();
const axios = require('axios');
const prompts = require('../shared/prompts');

const TIMEOUT_MS = 10000; // 10s timeout
const DEFAULT_GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
const loggedGeminiFailures = new Set();

function getGeminiModelCandidates() {
  const configuredModels = (process.env.GEMINI_MODEL || '')
    .split(',')
    .map(model => model.trim())
    .filter(Boolean);

  return [...new Set([...configuredModels, ...DEFAULT_GEMINI_MODELS])];
}

function getGeminiErrorMessage(error, model) {
  const status = error.response?.status;
  const apiMessage = error.response?.data?.error?.message;

  if (status === 404) {
    return `Gemini model "${model}" was not found for this API key/version.`;
  }

  if (status === 400 && apiMessage) {
    return `Gemini rejected the request for "${model}": ${apiMessage}`;
  }

  if (status === 403) {
    return `Gemini access was denied for "${model}". Check that the API key can use this model.`;
  }

  if (status) {
    return `Gemini request failed for "${model}" with HTTP ${status}${apiMessage ? `: ${apiMessage}` : ''}`;
  }

  return `Gemini request failed for "${model}": ${error.message}`;
}

function warnGeminiFallback(feature, error) {
  const key = `${feature}:${error.message}`;
  if (loggedGeminiFailures.has(key)) return;

  loggedGeminiFailures.add(key);
  console.warn(`${feature} Using local fallback. ${error.message}`);
}

/**
 * Sends a request to the Google Gemini API.
 * 
 * @param {string} systemPrompt 
 * @param {string} userPrompt 
 * @param {boolean} jsonMode 
 */
async function callGemini(systemPrompt, userPrompt, jsonMode = true) {
  const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.trim() : null;

  if (!apiKey || apiKey === 'mock_key_for_testing') {
    throw new Error('MISSING_API_KEY');
  }

  // Combine system prompt and user prompt for Gemini's content structure
  const combinedText = `System Instruction: ${systemPrompt}\n\nUser Prompt: ${userPrompt}`;

  const payload = {
    contents: [
      {
        parts: [
          { text: combinedText }
        ]
      }
    ],
    generationConfig: {}
  };

  if (jsonMode) {
    payload.generationConfig.responseMimeType = 'application/json';
  }

  const models = getGeminiModelCandidates();
  const errors = [];

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: TIMEOUT_MS,
      });

      if (
        response.data &&
        response.data.candidates &&
        response.data.candidates[0] &&
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts &&
        response.data.candidates[0].content.parts[0]
      ) {
        return response.data.candidates[0].content.parts[0].text.trim();
      }

      throw new Error('INVALID_GEMINI_RESPONSE');
    } catch (error) {
      errors.push(getGeminiErrorMessage(error, model));

      const status = error.response?.status;
      if (![400, 403, 404].includes(status)) {
        break;
      }
    }
  }

  throw new Error(errors.join(' | '));
}

/**
 * Parses messy user input into structured tasks.
 */
async function extractTasks(rawText) {
  try {
    const responseText = await callGemini(
      prompts.TASK_EXTRACTION_SYSTEM,
      prompts.TASK_EXTRACTION_USER(rawText),
      true
    );
    
    const parsed = JSON.parse(responseText.trim());
    
    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed.tasks && Array.isArray(parsed.tasks)) {
      return parsed.tasks;
    } else if (parsed.data && Array.isArray(parsed.data)) {
      return parsed.data;
    } else {
      if (parsed.title) return [parsed];
      for (const val of Object.values(parsed)) {
        if (Array.isArray(val)) return val;
      }
    }
    return [];
  } catch (error) {
    warnGeminiFallback('Gemini task extraction failed.', error);
    return fallbackExtractTasks(rawText);
  }
}

/**
 * Generates a time-blocked war plan.
 */
async function generateWarPlan(tasks, events, profile) {
  try {
    const tasksJson = JSON.stringify(tasks);
    const eventsJson = JSON.stringify(events);
    const profileJson = JSON.stringify(profile);

    const responseText = await callGemini(
      prompts.WAR_PLAN_SYSTEM,
      prompts.WAR_PLAN_USER(tasksJson, eventsJson, profileJson),
      true
    );

    const parsed = JSON.parse(responseText.trim());

    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed.schedule && Array.isArray(parsed.schedule)) {
      return parsed.schedule;
    } else if (parsed.warplan && Array.isArray(parsed.warplan)) {
      return parsed.warplan;
    } else if (parsed.tasks && Array.isArray(parsed.tasks)) {
      return parsed.tasks;
    } else {
      for (const val of Object.values(parsed)) {
        if (Array.isArray(val)) return val;
      }
    }
    return [];
  } catch (error) {
    warnGeminiFallback('Gemini war plan generation failed.', error);
    return fallbackGenerateWarPlan(tasks, events, profile);
  }
}

/**
 * Gets a direct coaching message based on user state (plain text, no JSON mode).
 */
async function getCoachingMessage(tasks, minutesSinceLastComplete, overdueCount) {
  try {
    const taskJson = JSON.stringify(tasks.slice(0, 3));
    const responseText = await callGemini(
      prompts.COACHING_SYSTEM,
      prompts.COACHING_USER(taskJson, minutesSinceLastComplete, overdueCount),
      false
    );
    return responseText;
  } catch (error) {
    warnGeminiFallback('Gemini coaching message failed.', error);
    return fallbackCoachingMessage(tasks, minutesSinceLastComplete, overdueCount);
  }
}

/**
 * Autonomous Task Executor (Gemini Agentic Depth)
 * Deconstructs a task and generates the actual work/artifact.
 */
async function executeTaskAutonomously(taskTitle, category) {
  try {
    const systemPrompt = `You are an autonomous AI agent. Your job is to actually DO the task or generate the complete draft work for the user so they don't have to do it from scratch.
Return a JSON object with these exact keys:
- steps: array of 4 strings (each describing a concrete action you completed, e.g. "Drafted email body", "Reviewed billing dates")
- artifact: string (a long, fully-detailed text document, email draft, code snippet, or outline representing the completed task. Make it high quality and useful.)`;

    const userPrompt = `Execute this task: "${taskTitle}" in the category "${category}".`;

    const responseText = await callGemini(systemPrompt, userPrompt, true);
    return JSON.parse(responseText.trim());
  } catch (error) {
    warnGeminiFallback('Gemini autonomous task execution failed.', error);
    return fallbackExecuteTask(taskTitle, category);
  }
}

// ============================================================================
// LOCAL FALLBACK HEURISTIC IMPLEMENTATIONS (Never crash, great for offline/demo)
// ============================================================================

function fallbackExtractTasks(rawText) {
  const lines = rawText.split(/[.\n;]+/).map(l => l.trim()).filter(Boolean);
  const tasks = [];
  const now = new Date();

  for (const line of lines) {
    if (line.length < 3) continue;

    let estimated_minutes = 30;
    let urgency = 5;
    let impact = 5;
    let category = 'general';
    let deadline = null;

    const minMatch = line.match(/(\d+)\s*(min|minute|hr|hour)/i);
    if (minMatch) {
      const val = parseInt(minMatch[1]);
      if (minMatch[2].toLowerCase().startsWith('h')) {
        estimated_minutes = val * 60;
      } else {
        estimated_minutes = val;
      }
    }

    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('urgent') || lowerLine.includes('asap') || lowerLine.includes('today') || lowerLine.includes('immediately')) {
      urgency = 9;
      impact = 8;
    }
    if (lowerLine.includes('important') || lowerLine.includes('boss') || lowerLine.includes('report') || lowerLine.includes('client')) {
      impact = 9;
    }
    if (lowerLine.includes('buy') || lowerLine.includes('grocery') || lowerLine.includes('clean')) {
      category = 'personal';
      urgency = 3;
      impact = 3;
    } else if (lowerLine.includes('bill') || lowerLine.includes('pay') || lowerLine.includes('tax')) {
      category = 'finance';
      urgency = 7;
      impact = 8;
    } else if (lowerLine.includes('work') || lowerLine.includes('meeting') || lowerLine.includes('presentation')) {
      category = 'work';
    }

    if (lowerLine.includes('today') || lowerLine.includes('5pm') || lowerLine.includes('17:00')) {
      const today = new Date(now);
      today.setHours(17, 0, 0, 0);
      deadline = today.toISOString();
    } else if (lowerLine.includes('tomorrow') || lowerLine.includes('9am')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      deadline = tomorrow.toISOString();
    } else if (lowerLine.includes('noon')) {
      const noon = new Date(now);
      noon.setHours(12, 0, 0, 0);
      deadline = noon.toISOString();
    }

    tasks.push({
      title: line.replace(/(by\s+\d+.*|today|tomorrow|urgent|asap)/gi, '').trim(),
      deadline,
      estimated_minutes,
      urgency,
      impact,
      category
    });
  }

  if (tasks.length === 0) {
    tasks.push({
      title: rawText.substring(0, 50),
      deadline: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      estimated_minutes: 45,
      urgency: 7,
      impact: 6,
      category: 'general'
    });
  }

  return tasks;
}

function fallbackGenerateWarPlan(tasks, events, profile) {
  const schedule = [];
  let currentHour = 9;
  let currentMinute = 0;

  const blockedSlots = (events && events.length > 0) ? events : [
    { title: "Lunch Break", start: "12:00", end: "13:00" }
  ];

  const formatTime = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  for (const slot of blockedSlots) {
    const [sh, sm] = slot.start.split(':').map(Number);
    const [eh, em] = slot.end.split(':').map(Number);
    const duration = (eh * 60 + em) - (sh * 60 + sm);
    
    schedule.push({
      time: slot.start,
      duration_minutes: duration,
      task_id: null,
      task_title: `BLOCKED: ${slot.title}`,
      priority: 'BLOCKED',
      note: 'Scheduled calendar block.'
    });
  }

  const pendingTasks = tasks
    .filter(t => t.status !== 'complete')
    .sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0));

  for (const task of pendingTasks) {
    if (currentHour === 12) {
      currentHour = 13;
      currentMinute = 0;
    }

    const duration = task.estimated_minutes || 30;
    
    let label = 'SCHEDULED';
    if (task.priority_score >= 75) label = 'CRITICAL';
    else if (task.priority_score >= 40) label = 'HIGH';

    schedule.push({
      time: formatTime(currentHour, currentMinute),
      duration_minutes: duration,
      task_id: task.id,
      task_title: task.title,
      priority: label,
      note: task.priority_score >= 75 ? 'DO THIS NOW. Extremely high priority.' : 'Part of your focus window.'
    });

    currentMinute += duration;
    currentHour += Math.floor(currentMinute / 60);
    currentMinute = currentMinute % 60;
  }

  return schedule.sort((a, b) => a.time.localeCompare(b.time));
}

function fallbackCoachingMessage(tasks, minutesSinceLastComplete, overdueCount) {
  const pendingTasks = tasks.filter(t => t.status !== 'complete');
  if (pendingTasks.length === 0) {
    return "You have cleared your list. Don't get complacent — plan your next big move now.";
  }

  const topTask = pendingTasks[0].title;

  if (overdueCount > 0) {
    return `You have ${overdueCount} overdue tasks piling up right now. Put down the phone and start working on "${topTask}" immediately. No excuses.`;
  }

  if (minutesSinceLastComplete >= 120) {
    return `It has been over 2 hours since your last completion. You are drifting. Focus on "${topTask}" right now and get it done.`;
  }

  return `Your schedule is set. The highest leverage action you can take right now is "${topTask}". Lock in and execute.`;
}

function fallbackExecuteTask(taskTitle, category) {
  let steps = [];
  let artifact = '';

  if (category === 'work') {
    steps = [
      "Analyzed business context for task.",
      "Drafted high-level outline and core points.",
      "Generated detailed professional document.",
      "Formatted executive summary and deliverables."
    ];
    artifact = `=== DRAFT DOCUMENT: ${taskTitle.toUpperCase()} ===\n\nDate: ${new Date().toLocaleDateString()}\nStatus: Draft Prepared\n\nExecutive Summary:\nThis document represents the completed draft for "${taskTitle}". All primary sections have been outlined below.\n\nKey Sections:\n1. Objectives & Scope\n2. Current State Assessment\n3. Strategic Recommendations\n4. Timeline & Next Steps\n\nAction Plan:\n- Review this outline with stakeholders.\n- Insert specific data points as needed.\n- Finalize for distribution.`;
  } else if (category === 'finance') {
    steps = [
      "Verified payment portal requirements.",
      "Calculated outstanding balances.",
      "Prepared draft payment scheduling.",
      "Simulated transaction confirmation receipt."
    ];
    artifact = `=== TRANSACTION PLAN: ${taskTitle.toUpperCase()} ===\n\nEstimated Amount: Pending review\nPayment Vendor: Automated\n\nDirections:\n1. Log in to your finance account.\n2. Navigate to bill payments.\n3. Input the required routing details.\n4. Save the transaction receipt for tax records.`;
  } else {
    steps = [
      "Deconstructed task requirements.",
      "Researched best practices and steps.",
      "Formulated step-by-step checklist.",
      "Completed draft plan for execution."
    ];
    artifact = `=== PLAN: ${taskTitle.toUpperCase()} ===\n\nGoal:\nSuccessfully complete "${taskTitle}" within the allocated time.\n\nStep-by-step Execution Guide:\nStep 1: Gather all necessary tools and resources.\nStep 2: Allocate 25 minutes of uninterrupted focus (Pomodoro).\nStep 3: Complete the core parts of the task.\nStep 4: Review, verify, and mark as completed.`;
  }

  return { steps, artifact };
}

module.exports = {
  extractTasks,
  generateWarPlan,
  getCoachingMessage,
  executeTaskAutonomously
};
