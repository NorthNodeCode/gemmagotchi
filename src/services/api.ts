import { AINudge, Course, ProcrastinationRescueData, TrajectoryForecast, QuizQuestion } from '../types';

export async function fetchAINudge(params: {
  petState: any;
  currentCourse?: string;
  lastStudiedMinutesAgo?: number;
  streakDays?: number;
  procrastinationRisk?: string;
}): Promise<AINudge> {
  try {
    const res = await fetch('/api/ai/nudge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Nudge API failed');
    return await res.json();
  } catch (error) {
    console.warn('Using client fallback for AI Nudge:', error);
    const health = params.petState?.health ?? 80;
    if (health < 40) {
      return {
        nudge: "ALERT: Your Spirit Pet is shivering from study drought! Complete 1 micro-task now to revive it!",
        tone: "urgent",
        actionItem: "Do a 2-minute active recall drill right now.",
        petReaction: "Sproutling looks at you with big, drooping eyes..."
      };
    }
    return {
      nudge: "Consistency is key! Solve 1 concept check today to expand your Spirit Farm.",
      tone: "encouraging",
      actionItem: "Start a 10-minute focus session.",
      petReaction: "Sproutling is cheerful and glowing with energy!"
    };
  }
}

export async function generateCourseBreakdown(topic: string, goalHoursPerWeek: number = 3): Promise<Partial<Course>> {
  try {
    const res = await fetch('/api/ai/breakdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, goalHoursPerWeek }),
    });
    if (!res.ok) throw new Error('Breakdown API failed');
    return await res.json();
  } catch (error) {
    console.warn('Using client fallback for Course Breakdown:', error);
    return {
      title: topic,
      description: `Structured active mastery path for ${topic}`,
      estimatedWeeks: 4,
      modules: [
        {
          id: 'mod-1',
          title: `${topic}: Core Fundamentals`,
          description: 'Understanding foundational principles and mental models.',
          durationMins: 20,
          completed: false,
          keyTakeaway: 'Master fundamental terminology and core concepts.'
        },
        {
          id: 'mod-2',
          title: `${topic}: Active Practice & Drills`,
          description: 'Solving concrete problems with active recall.',
          durationMins: 25,
          completed: false,
          keyTakeaway: 'Apply key techniques without looking at references.'
        },
        {
          id: 'mod-3',
          title: `${topic}: Deep Reasoning & Synthesis`,
          description: 'Synthesizing ideas into advanced problem-solving.',
          durationMins: 30,
          completed: false,
          keyTakeaway: 'Solve real-world challenges confidently.'
        }
      ]
    };
  }
}

export async function fetchProcrastinationRescue(currentTopic: string, reasonForFeelingLazy?: string): Promise<ProcrastinationRescueData> {
  try {
    const res = await fetch('/api/ai/procrastination-rescue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentTopic, reasonForFeelingLazy }),
    });
    if (!res.ok) throw new Error('Rescue API failed');
    return await res.json();
  } catch (error) {
    console.warn('Using client fallback for Rescue API:', error);
    return {
      rescueTitle: "2-Minute Zero-Friction Rescue",
      microChallenge: `Spend 120 seconds summarizing 2 main ideas about ${currentTopic}.`,
      quickQuestion: {
        id: 'q-rescue',
        question: `How do you overcome resistance when starting ${currentTopic}?`,
        options: [
          'Commit to just 2 minutes of effortless action',
          'Wait until energy is 100% perfect',
          'Clean the entire desk for 3 hours'
        ],
        correctIndex: 0,
        explanation: 'Action triggers motivation, not the other way around!'
      },
      rewardFocusGems: 25,
      petHealAmount: 35,
      encouragement: "Starting takes zero effort — do this single step to heal your pet!"
    };
  }
}

export async function fetchTrajectoryForecast(params: {
  currentCourse: string;
  averageMinsPerDay: number;
  skippedDaysCount: number;
  streak: number;
}): Promise<TrajectoryForecast> {
  try {
    const res = await fetch('/api/ai/trajectory-forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Forecast API failed');
    return await res.json();
  } catch (error) {
    console.warn('Using client fallback for Trajectory Forecast:', error);
    return {
      summaryText: `Maintaining a 20m/day streak on ${params.currentCourse} boosts 30-day retention to 92% and evolves your pet into an Ancient Guardian!`,
      forecastData: [
        { week: 'Week 1', consistentMastery: 25, procrastinatingMastery: 12, petHealthConsistent: 92, petHealthProcrastinating: 50 },
        { week: 'Week 2', consistentMastery: 52, procrastinatingMastery: 20, petHealthConsistent: 96, petHealthProcrastinating: 35 },
        { week: 'Week 3', consistentMastery: 78, procrastinatingMastery: 25, petHealthConsistent: 100, petHealthProcrastinating: 20 },
        { week: 'Week 4', consistentMastery: 96, procrastinatingMastery: 28, petHealthConsistent: 100, petHealthProcrastinating: 8 }
      ],
      outcomes: {
        ifConsistent: "Complete course mastery in 28 days! Spirit Pet achieves Ancient Guardian status with glowing farm aura.",
        ifProcrastinating: "Stuck at 28% mastery after 1 month. Pet shrinks to wilting state and loses 15 farm crops."
      }
    };
  }
}

export async function fetchAIQuiz(moduleTitle: string, concept: string): Promise<{ questions: QuizQuestion[] }> {
  try {
    const res = await fetch('/api/ai/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduleTitle, concept }),
    });
    if (!res.ok) throw new Error('Quiz API failed');
    return await res.json();
  } catch (error) {
    console.warn('Using client fallback for AI Quiz:', error);
    return {
      questions: [
        {
          id: 'fallback-q1',
          question: `Which active study technique yields the highest retention for ${concept || 'this topic'}?`,
          options: [
            'Active recall and self-testing without notes',
            'Highlighting paragraphs with 5 neon markers',
            'Passive re-reading of slides',
            'Listening to lecture audio while sleeping'
          ],
          correctIndex: 0,
          explanation: 'Forced retrieval strengthens memory consolidation pathways!'
        },
        {
          id: 'fallback-q2',
          question: 'What is the most effective way to prevent procrastination loops?',
          options: [
            'Reducing task size to a 2-minute micro-action',
            'Setting an overwhelming 8-hour uninterrupted study block',
            'Waiting for sudden burst of natural inspiration',
            'Browsing social media for study hacks'
          ],
          correctIndex: 0,
          explanation: 'Lowering the activation energy removes mental friction.'
        }
      ]
    };
  }
}
