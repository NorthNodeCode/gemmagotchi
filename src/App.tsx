import React, { useState, useEffect } from 'react';
import { PetState, FarmPlot, Course, CourseModule, StudyLog } from './types';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { FocusStudyRoom } from './components/FocusStudyRoom';
import { SpiritFarm } from './components/SpiritFarm';
import { CourseExplorer } from './components/CourseExplorer';
import { TrajectorySimulator } from './components/TrajectorySimulator';

const INITIAL_PET: PetState = {
  id: 'pet-1',
  name: 'Sproutling',
  type: 'sproutling',
  stage: 'seedling',
  health: 85,
  happiness: 90,
  xp: 35,
  level: 1,
  isSick: false,
  sizeScale: 1.1,
  lastFedAt: new Date().toISOString(),
  accessories: [],
};

const INITIAL_PLOTS: FarmPlot[] = [
  { id: 0, cropType: 'focus_sprout', stage: 3, watered: true },
  { id: 1, cropType: 'sunflower', stage: 2, watered: true },
  { id: 2, cropType: 'wisdom_berry', stage: 1, watered: false },
  { id: 3, cropType: null, stage: 0, watered: false },
  { id: 4, cropType: 'golden_wheat', stage: 2, watered: true },
  { id: 5, cropType: null, stage: 0, watered: false },
];

const INITIAL_COURSES: Course[] = [
  {
    id: 'c1',
    title: 'Gemma 4 AI & Active Learning Systems',
    category: 'Computer Science',
    description: 'Master modern generative AI capabilities, prompt mechanics, and active study system design.',
    iconName: 'BrainCircuit',
    estimatedWeeks: 3,
    progressPercent: 33,
    modules: [
      {
        id: 'c1-m1',
        title: 'Active Recall vs Passive Reading',
        description: 'Why active retrieval consolidates long-term memory pathways.',
        durationMins: 15,
        completed: true,
        keyTakeaway: 'Forced retrieval creates 3x stronger memory retention.',
      },
      {
        id: 'c1-m2',
        title: 'Beating Activation Energy',
        description: 'Using 120-second micro-tasks to bypass brain friction.',
        durationMins: 20,
        completed: false,
        keyTakeaway: 'Starting takes zero effort when broken down.',
      },
      {
        id: 'c1-m3',
        title: 'Gemma 4 Accountability Architecture',
        description: 'Designing proactive AI nudges and feedback loops.',
        durationMins: 25,
        completed: false,
        keyTakeaway: 'Timely nudges prevent procrastination spirals.',
      },
    ],
  },
  {
    id: 'c2',
    title: 'Neuroscience of Memory & Habit Loops',
    category: 'Neuroscience',
    description: 'Explore dopamine reward loops, synaptic plasticity, and spaced repetition.',
    iconName: 'Sparkles',
    estimatedWeeks: 4,
    progressPercent: 0,
    modules: [
      {
        id: 'c2-m1',
        title: 'Dopamine & Focus Loops',
        description: 'How gamified feedback loops trigger flow states.',
        durationMins: 20,
        completed: false,
        keyTakeaway: 'Immediate feedback keeps attention locked in.',
      },
      {
        id: 'c2-m2',
        title: 'Ebbinghaus Forgetting Curve',
        description: 'Optimizing review intervals to prevent knowledge decay.',
        durationMins: 25,
        completed: false,
        keyTakeaway: 'Reviewing before decay resets memory retention.',
      },
    ],
  },
  {
    id: 'c3',
    title: 'Quantitative Machine Learning Fundamentals',
    category: 'Mathematics',
    description: 'Linear algebra, matrix decompositions, and loss optimization.',
    iconName: 'TrendingUp',
    estimatedWeeks: 5,
    progressPercent: 0,
    modules: [
      {
        id: 'c3-m1',
        title: 'Vectors & Matrix Multiplications',
        description: 'Geometric interpretation of linear transformations.',
        durationMins: 25,
        completed: false,
        keyTakeaway: 'Matrices transform high-dimensional vector spaces.',
      },
      {
        id: 'c3-m2',
        title: 'Gradient Descent & Loss Optimization',
        description: 'Backpropagation and parameter weight adjustments.',
        durationMins: 30,
        completed: false,
        keyTakeaway: 'Gradients point in the direction of steepest loss ascent.',
      },
    ],
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'focus' | 'farm' | 'courses' | 'trajectory'>('dashboard');

  // Persisted state
  const [pet, setPet] = useState<PetState>(() => {
    const saved = localStorage.getItem('gemma4_pet');
    return saved ? JSON.parse(saved) : INITIAL_PET;
  });

  const [gems, setGems] = useState<number>(() => {
    const saved = localStorage.getItem('gemma4_gems');
    return saved ? JSON.parse(saved) : 45;
  });

  const [waterMins, setWaterMins] = useState<number>(() => {
    const saved = localStorage.getItem('gemma4_water');
    return saved ? JSON.parse(saved) : 30;
  });

  const [streakDays, setStreakDays] = useState<number>(() => {
    const saved = localStorage.getItem('gemma4_streak');
    return saved ? JSON.parse(saved) : 3;
  });

  const [farmPlots, setFarmPlots] = useState<FarmPlot[]>(() => {
    const saved = localStorage.getItem('gemma4_farm');
    return saved ? JSON.parse(saved) : INITIAL_PLOTS;
  });

  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('gemma4_courses');
    return saved ? JSON.parse(saved) : INITIAL_COURSES;
  });

  const [activeCourseId, setActiveCourseId] = useState<string>('c1');
  const [studyLogs, setStudyLogs] = useState<StudyLog[]>([]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('gemma4_pet', JSON.stringify(pet));
  }, [pet]);

  useEffect(() => {
    localStorage.setItem('gemma4_gems', JSON.stringify(gems));
  }, [gems]);

  useEffect(() => {
    localStorage.setItem('gemma4_water', JSON.stringify(waterMins));
  }, [waterMins]);

  useEffect(() => {
    localStorage.setItem('gemma4_streak', JSON.stringify(streakDays));
  }, [streakDays]);

  useEffect(() => {
    localStorage.setItem('gemma4_farm', JSON.stringify(farmPlots));
  }, [farmPlots]);

  useEffect(() => {
    localStorage.setItem('gemma4_courses', JSON.stringify(courses));
  }, [courses]);

  const activeCourse = courses.find((c) => c.id === activeCourseId) || courses[0];

  // Pet Feeding / Healing
  const handleFeedPet = () => {
    if (gems < 10) return;
    setGems((prev) => prev - 10);
    setPet((prev) => {
      const newHealth = Math.min(100, prev.health + 20);
      const isSick = newHealth < 45;
      const sizeScale = isSick ? 0.6 : Math.min(1.5, 0.8 + (newHealth / 100) * 0.7);
      const newXP = prev.xp + 15;
      let stage = prev.stage;
      let level = prev.level;

      if (newXP >= 100) {
        level += 1;
        stage = level >= 3 ? 'ancient' : level >= 2 ? 'blooming' : 'seedling';
      }

      return {
        ...prev,
        health: newHealth,
        isSick,
        sizeScale,
        xp: newXP % 100,
        level,
        stage,
      };
    });
  };

  // Complete Focus Sprint Session
  const handleCompleteSession = (mins: number, earnedGems: number, healAmt: number) => {
    setGems((prev) => prev + earnedGems);
    setWaterMins((prev) => prev + mins);

    setPet((prev) => {
      const newHealth = Math.min(100, prev.health + healAmt);
      const isSick = newHealth < 45;
      const sizeScale = isSick ? 0.6 : Math.min(1.5, 0.8 + (newHealth / 100) * 0.7);
      return {
        ...prev,
        health: newHealth,
        isSick,
        sizeScale,
        xp: prev.xp + 20,
      };
    });

    setStudyLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        courseTitle: activeCourse ? activeCourse.title : 'Focus Session',
        durationMins: mins,
        gemsEarned: earnedGems,
        petHealAmount: healAmt,
        wasProcrastinationRescued: false,
      },
    ]);
  };

  // Rescue Complete
  const handleRescueComplete = (earnedGems: number, healAmt: number) => {
    setGems((prev) => prev + earnedGems);
    setPet((prev) => {
      const newHealth = Math.min(100, prev.health + healAmt);
      const isSick = newHealth < 45;
      const sizeScale = isSick ? 0.6 : Math.min(1.5, 0.8 + (newHealth / 100) * 0.7);
      return {
        ...prev,
        health: newHealth,
        isSick,
        sizeScale,
        xp: prev.xp + 15,
      };
    });
  };

  // Farm Actions
  const handleWaterPlot = (plotId: number) => {
    if (waterMins < 5) return;
    setWaterMins((prev) => prev - 5);
    setFarmPlots((prev) =>
      prev.map((p) => {
        if (p.id === plotId) {
          const nextStage = Math.min(3, p.stage + 1);
          return { ...p, stage: nextStage, watered: true };
        }
        return p;
      })
    );
  };

  const handlePlantCrop = (plotId: number, cropType: any) => {
    setFarmPlots((prev) =>
      prev.map((p) => (p.id === plotId ? { ...p, cropType, stage: 1, watered: false } : p))
    );
  };

  const handleHarvestPlot = (plotId: number) => {
    setFarmPlots((prev) =>
      prev.map((p) => (p.id === plotId ? { ...p, cropType: null, stage: 0, watered: false } : p))
    );
    setGems((prev) => prev + 20);
    setPet((prev) => ({ ...prev, xp: prev.xp + 25 }));
  };

  // Toggle Module Completion
  const handleToggleModuleComplete = (courseId: string, moduleId: string) => {
    setCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId) {
          const updatedModules = c.modules.map((m) =>
            m.id === moduleId ? { ...m, completed: !m.completed } : m
          );
          const completedCount = updatedModules.filter((m) => m.completed).length;
          const progressPercent = Math.round((completedCount / updatedModules.length) * 100);
          return { ...c, modules: updatedModules, progressPercent };
        }
        return c;
      })
    );
  };

  const handleAddCourse = (newCourse: Course) => {
    setCourses((prev) => [newCourse, ...prev]);
    setActiveCourseId(newCourse.id);
  };

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#2D362E] font-sans antialiased selection:bg-[#5E7161] selection:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pet={pet}
        gems={gems}
        waterMins={waterMins}
        streakDays={streakDays}
        onStartSprint={() => setActiveTab('focus')}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            pet={pet}
            courses={courses}
            activeCourse={activeCourse}
            gems={gems}
            waterMins={waterMins}
            streakDays={streakDays}
            studyLogs={studyLogs}
            farmPlots={farmPlots}
            onFeedPet={handleFeedPet}
            onStartSprint={() => setActiveTab('focus')}
            onNavigateTab={setActiveTab}
            onSelectCourse={setActiveCourseId}
            onTriggerRescue={() => setActiveTab('focus')}
          />
        )}

        {activeTab === 'focus' && (
          <FocusStudyRoom
            currentCourse={activeCourse}
            pet={pet}
            onCompleteSession={handleCompleteSession}
            onRescueComplete={handleRescueComplete}
            onExit={() => setActiveTab('dashboard')}
          />
        )}

        {activeTab === 'farm' && (
          <SpiritFarm
            plots={farmPlots}
            pet={pet}
            studyMinutesAvailable={waterMins}
            gems={gems}
            onWaterPlot={handleWaterPlot}
            onPlantCrop={handlePlantCrop}
            onHarvestPlot={handleHarvestPlot}
          />
        )}

        {activeTab === 'courses' && (
          <CourseExplorer
            courses={courses}
            activeCourseId={activeCourseId}
            onSelectCourse={setActiveCourseId}
            onAddCourse={handleAddCourse}
            onStartModuleSprint={(c, m) => {
              setActiveCourseId(c.id);
              setActiveTab('focus');
            }}
            onToggleModuleComplete={handleToggleModuleComplete}
          />
        )}

        {activeTab === 'trajectory' && (
          <TrajectorySimulator
            currentCourse={activeCourse}
            streak={streakDays}
          />
        )}
      </main>
    </div>
  );
}
