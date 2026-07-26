import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PetState, PetType } from '../types';
import { Heart, Sparkles, Zap, ShieldAlert, Award, Smile, Frown, Flame, Leaf, Cloud, Plus } from 'lucide-react';
import confetti from 'canvas-confetti';

interface PetCompanionProps {
  pet: PetState;
  onFeedPet: () => void;
  onPetClick?: () => void;
  gems: number;
}

export const PetCompanion: React.FC<PetCompanionProps> = ({ pet, onFeedPet, onPetClick, gems }) => {
  const [isInteracting, setIsInteracting] = useState(false);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);

  const getHealthColor = (health: number) => {
    if (health >= 75) return 'from-[#5E7161] to-[#8BA88E]';
    if (health >= 45) return 'from-[#C89B7B] to-[#D97706]';
    return 'from-[#C86D6D] to-[#B85B56]';
  };

  const triggerPetReaction = () => {
    setIsInteracting(true);
    setTimeout(() => setIsInteracting(false), 1200);

    if (pet.isSick || pet.health < 45) {
      setSpeechBubble("I'm feeling weak... study with me so I can grow big again! 💧");
    } else if (pet.health >= 80) {
      setSpeechBubble("I'm brimming with vitality! Let me show off my farm powers! ✨");
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
    } else {
      setSpeechBubble("Let me know when you're ready for our next focus sprint! 📚");
    }

    setTimeout(() => setSpeechBubble(null), 3500);
    if (onPetClick) onPetClick();
  };

  // Render vector SVG Spirit graphics according to type, stage, and sick/healthy state
  const renderPetSprite = () => {
    const scale = pet.sizeScale || (pet.health / 100 * 0.8 + 0.6);
    const isSick = pet.isSick || pet.health < 45;

    return (
      <div className="relative flex items-center justify-center p-4">
        {/* Aura / Halo behind pet */}
        <motion.div
          animate={{
            scale: isSick ? [0.8, 0.85, 0.8] : [1, 1.15, 1],
            opacity: isSick ? [0.15, 0.25, 0.15] : [0.3, 0.5, 0.3],
          }}
          transition={{ repeat: Infinity, duration: isSick ? 3 : 2, ease: "easeInOut" }}
          className={`absolute rounded-full blur-2xl w-48 h-48 ${
            isSick
              ? 'bg-[#C86D6D]/30'
              : pet.type === 'sproutling'
              ? 'bg-[#8BA88E]/40'
              : pet.type === 'pyros'
              ? 'bg-[#C89B7B]/40'
              : 'bg-[#7A837C]/30'
          }`}
        />

        {/* Floating Speech Bubble */}
        <AnimatePresence>
          {speechBubble && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: -65, scale: 1 }}
              exit={{ opacity: 0, y: -80, scale: 0.8 }}
              className="absolute top-0 z-20 bg-[#F5F2EA] border border-[#E5E2D9] text-[#2D362E] text-xs font-medium px-3.5 py-2 rounded-xl shadow-lg max-w-xs text-center pointer-events-none"
            >
              {speechBubble}
              <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-[#F5F2EA] border-r border-b border-[#E5E2D9] rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pet Sprite Character */}
        <motion.div
          onClick={triggerPetReaction}
          style={{ transform: `scale(${scale})` }}
          animate={{
            y: isSick ? [0, 4, 0] : isInteracting ? [-18, 0, -10, 0] : [0, -12, 0],
            rotate: isSick ? [-3, 3, -3] : isInteracting ? [-8, 8, -4, 0] : [0, 2, -2, 0],
          }}
          transition={{
            repeat: isInteracting ? 0 : Infinity,
            duration: isSick ? 4 : isInteracting ? 0.6 : 3,
            ease: "easeInOut",
          }}
          className={`relative cursor-pointer transition-transform duration-500 filter ${
            isSick ? 'saturate-50 brightness-90' : 'drop-shadow-[0_10px_20px_rgba(94,113,97,0.25)]'
          }`}
        >
          {/* Sproutling Spirit */}
          {pet.type === 'sproutling' && (
            <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Body */}
              <ellipse cx="80" cy="95" rx="42" ry="38" fill={isSick ? "#8C968D" : "#5E7161"} />
              <ellipse cx="80" cy="98" rx="34" ry="28" fill={isSick ? "#7A837C" : "#4A5A4D"} />
              {/* Belly Soft Highlight */}
              <ellipse cx="80" cy="102" rx="24" ry="18" fill={isSick ? "#B2B8B3" : "#A8C69F"} opacity="0.8" />
              
              {/* Head Sprout / Bloom Flowers */}
              {pet.stage === 'seedling' && (
                <path d="M80 57 C75 42 65 35 60 30 C75 35 80 48 80 57 C80 48 85 35 100 30 C95 35 85 42 80 57 Z" fill={isSick ? "#9CA39D" : "#8BA88E"} />
              )}
              {pet.stage === 'blooming' && (
                <g>
                  <path d="M80 57 C75 42 65 35 60 30 C75 35 80 48 80 57 Z" fill="#8BA88E" />
                  <circle cx="80" cy="35" r="10" fill="#C86D6D" />
                  <circle cx="80" cy="35" r="5" fill="#F0D194" />
                </g>
              )}
              {pet.stage === 'ancient' && (
                <g>
                  <path d="M80 57 Q60 20 40 30 Q70 40 80 57 Z" fill="#5E7161" />
                  <path d="M80 57 Q100 20 120 30 Q90 40 80 57 Z" fill="#5E7161" />
                  <circle cx="80" cy="28" r="14" fill="#C86D6D" />
                  <circle cx="80" cy="28" r="7" fill="#F0D194" />
                  {/* Ancient Horns / Leaves */}
                  <path d="M55 75 Q40 60 30 70" stroke="#2D362E" strokeWidth="5" strokeLinecap="round" />
                  <path d="M105 75 Q120 60 130 70" stroke="#2D362E" strokeWidth="5" strokeLinecap="round" />
                </g>
              )}

              {/* Eyes */}
              {isSick ? (
                <g>
                  {/* Sad closed/drooping eyes */}
                  <path d="M66 90 Q72 96 78 90" stroke="#2D362E" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                  <path d="M82 90 Q88 96 94 90" stroke="#2D362E" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                  {/* Tear drop */}
                  <circle cx="62" cy="98" r="3" fill="#60A5FA" opacity="0.8" />
                </g>
              ) : (
                <g>
                  {/* Happy Big Eyes */}
                  <circle cx="68" cy="88" r="7" fill="#2D362E" />
                  <circle cx="92" cy="88" r="7" fill="#2D362E" />
                  <circle cx="70" cy="86" r="2.5" fill="#FFFFFF" />
                  <circle cx="94" cy="86" r="2.5" fill="#FFFFFF" />
                  {/* Cheeks */}
                  <ellipse cx="60" cy="95" rx="5" ry="3" fill="#C86D6D" opacity="0.5" />
                  <ellipse cx="100" cy="95" rx="5" ry="3" fill="#C86D6D" opacity="0.5" />
                </g>
              )}

              {/* Mouth */}
              {isSick ? (
                <path d="M74 106 Q80 102 86 106" stroke="#2D362E" strokeWidth="3" strokeLinecap="round" fill="none" />
              ) : (
                <path d="M74 100 Q80 108 86 100" stroke="#2D362E" strokeWidth="3" strokeLinecap="round" fill="none" />
              )}

              {/* Little feet */}
              <ellipse cx="65" cy="130" rx="10" ry="6" fill={isSick ? "#7A837C" : "#3F4D41"} />
              <ellipse cx="95" cy="130" rx="10" ry="6" fill={isSick ? "#7A837C" : "#3F4D41"} />
            </svg>
          )}

          {/* Pyros Flame Fox */}
          {pet.type === 'pyros' && (
            <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Flame Tail */}
              <path d="M110 110 Q145 90 135 60 Q115 80 110 100 Z" fill={isSick ? "#A88D7D" : "#C89B7B"} />
              <path d="M115 105 Q135 85 128 68 Q115 82 112 98 Z" fill={isSick ? "#C7B2A3" : "#F0D194"} />

              {/* Body */}
              <ellipse cx="80" cy="98" rx="40" ry="35" fill={isSick ? "#8C6E5C" : "#C89B7B"} />
              <ellipse cx="80" cy="102" rx="22" ry="16" fill={isSick ? "#C2AC9E" : "#FDFCF8"} />

              {/* Ears */}
              <polygon points="52,65 42,30 68,52" fill={isSick ? "#6E5445" : "#A67A5B"} />
              <polygon points="108,65 118,30 92,52" fill={isSick ? "#6E5445" : "#A67A5B"} />
              <polygon points="54,62 46,38 65,52" fill={isSick ? "#B59E90" : "#F0D194"} />
              <polygon points="106,62 114,38 95,52" fill={isSick ? "#B59E90" : "#F0D194"} />

              {/* Eyes */}
              {isSick ? (
                <g>
                  <path d="M66 88 L78 92" stroke="#2D362E" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M94 88 L82 92" stroke="#2D362E" strokeWidth="3.5" strokeLinecap="round" />
                </g>
              ) : (
                <g>
                  <circle cx="68" cy="85" r="7" fill="#2D362E" />
                  <circle cx="92" cy="85" r="7" fill="#2D362E" />
                  <circle cx="70" cy="83" r="2.5" fill="#FFFFFF" />
                  <circle cx="94" cy="83" r="2.5" fill="#FFFFFF" />
                </g>
              )}

              {/* Nose & Mouth */}
              <polygon points="77,93 83,93 80,97" fill="#2D362E" />
              {isSick ? (
                <path d="M75 104 Q80 100 85 104" stroke="#2D362E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              ) : (
                <path d="M75 99 Q80 105 85 99" stroke="#2D362E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              )}
            </svg>
          )}

          {/* Aether Cloud Owl */}
          {pet.type === 'aether' && (
            <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Wings */}
              <ellipse cx="40" cy="95" rx="18" ry="30" fill={isSick ? "#6E7A75" : "#728A81"} transform="rotate(-15 40 95)" />
              <ellipse cx="120" cy="95" rx="18" ry="30" fill={isSick ? "#6E7A75" : "#728A81"} transform="rotate(15 120 95)" />

              {/* Body */}
              <ellipse cx="80" cy="92" rx="42" ry="38" fill={isSick ? "#5A6661" : "#5E7161"} />
              <ellipse cx="80" cy="96" rx="28" ry="22" fill={isSick ? "#9CA6A2" : "#A8C69F"} />

              {/* Feather Tufts / Horns */}
              <path d="M55 58 Q45 35 68 50 Z" fill={isSick ? "#424E4A" : "#4A5A4D"} />
              <path d="M105 58 Q115 35 92 50 Z" fill={isSick ? "#424E4A" : "#4A5A4D"} />

              {/* Big Owl Eyes */}
              <circle cx="65" cy="82" r="14" fill="#2D362E" />
              <circle cx="95" cy="82" r="14" fill="#2D362E" />
              {isSick ? (
                <g>
                  <circle cx="65" cy="82" r="6" fill="#7A837C" />
                  <circle cx="95" cy="82" r="6" fill="#7A837C" />
                </g>
              ) : (
                <g>
                  <circle cx="65" cy="82" r="8" fill="#D97706" />
                  <circle cx="95" cy="82" r="8" fill="#D97706" />
                  <circle cx="65" cy="82" r="4" fill="#2D362E" />
                  <circle cx="95" cy="82" r="4" fill="#2D362E" />
                  <circle cx="67" cy="80" r="2" fill="#FFFFFF" />
                  <circle cx="97" cy="80" r="2" fill="#FFFFFF" />
                </g>
              )}

              {/* Beak */}
              <polygon points="76,88 84,88 80,98" fill="#D97706" />
            </svg>
          )}
        </motion.div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-[#E5E2D9] rounded-3xl p-6 shadow-sm relative overflow-hidden">
      {/* Background Decorative Dots */}
      <div className="absolute inset-0 bg-[radial-gradient(#8BA88E_0.8px,transparent_0.8px)] [background-size:20px_20px] opacity-25 pointer-events-none" />

      {/* Top Header & Status Badges */}
      <div className="relative z-10 flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[#F5F2EA] border border-[#E5E2D9] text-[#5E7161]">
            {pet.type === 'sproutling' && <Leaf className="w-5 h-5" />}
            {pet.type === 'pyros' && <Flame className="w-5 h-5 text-[#C89B7B]" />}
            {pet.type === 'aether' && <Cloud className="w-5 h-5 text-[#5E7161]" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-serif font-bold text-[#2D362E] tracking-tight">{pet.name}</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAE6D9] border border-[#E5E2D9] text-[#5E7161] uppercase tracking-wider">
                Lvl {pet.level} • {pet.stage}
              </span>
            </div>
            <p className="text-xs text-[#7A837C]">
              {pet.isSick || pet.health < 45 ? (
                <span className="text-[#B85B56] font-semibold flex items-center gap-1">
                  <Frown className="w-3.5 h-3.5 inline" /> Sick & Shrinking (Procrastination Damage)
                </span>
              ) : (
                <span className="text-[#5E7161] font-semibold flex items-center gap-1">
                  <Smile className="w-3.5 h-3.5 inline" /> Healthy & Thriving Vitality
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Level XP Pill */}
        <div className="text-right">
          <div className="text-xs font-semibold text-[#2D362E] flex items-center justify-end gap-1">
            <Award className="w-3.5 h-3.5 text-[#D97706]" /> {pet.xp} XP
          </div>
          <p className="text-[10px] text-[#7A837C]">Next stage at 100 XP</p>
        </div>
      </div>

      {/* Main Pet Display Stage */}
      {renderPetSprite()}

      {/* Health & Happiness Gauges */}
      <div className="relative z-10 space-y-3 mt-1">
        {/* Vital Health Bar */}
        <div>
          <div className="flex justify-between items-center text-xs font-semibold mb-1">
            <span className="text-[#2D362E] flex items-center gap-1.5">
              <Heart className={`w-3.5 h-3.5 ${pet.health < 45 ? 'text-[#B85B56] animate-pulse' : 'text-[#5E7161]'}`} />
              Spirit Health
            </span>
            <span className={pet.health < 45 ? 'text-[#B85B56] font-bold' : 'text-[#5E7161] font-bold'}>
              {pet.health}% {pet.isSick && '(Shrunk)'}
            </span>
          </div>
          <div className="w-full bg-[#F5F2EA] rounded-full h-3 p-0.5 border border-[#E5E2D9]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pet.health}%` }}
              transition={{ duration: 0.8 }}
              className={`h-full rounded-full bg-gradient-to-r ${getHealthColor(pet.health)} shadow-xs`}
            />
          </div>
        </div>

        {/* Size Scale Indicator */}
        <div className="flex items-center justify-between text-xs text-[#7A837C] bg-[#F5F2EA] p-2.5 rounded-2xl border border-[#E5E2D9]">
          <span className="flex items-center gap-1.5 text-[#2D362E] font-medium">
            <Zap className="w-3.5 h-3.5 text-[#D97706]" /> Spirit Size Scale:
          </span>
          <span className="font-mono text-[#5E7161] font-bold">
            {(pet.sizeScale || 1).toFixed(2)}x {pet.sizeScale > 1 ? '(ROBUST)' : pet.sizeScale < 0.8 ? '(MINI)' : '(NORMAL)'}
          </span>
        </div>

        {/* Procrastination Warning or Feed Action */}
        {pet.isSick || pet.health < 45 ? (
          <div className="bg-[#FFF5F5] border border-[#E8C5B0] rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#B85B56] shrink-0 animate-bounce" />
              <div>
                <p className="text-xs font-bold text-[#B85B56]">Spirit is shrinking from skipping sessions!</p>
                <p className="text-[11px] text-[#7A837C]">Complete focus sessions or feed with 15 Focus Gems to heal!</p>
              </div>
            </div>
            <button
              onClick={onFeedPet}
              disabled={gems < 15}
              className="px-3.5 py-2 text-xs font-bold bg-[#B85B56] hover:bg-[#A34E4A] disabled:opacity-50 text-white rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" /> Heal (15 💎)
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onFeedPet}
              disabled={gems < 10}
              className="w-full py-2.5 px-4 bg-[#5E7161] hover:bg-[#4E5F51] disabled:bg-[#EAE6D9] disabled:text-[#7A837C] text-white font-semibold text-xs rounded-2xl transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4 text-[#A8C69F]" />
              Nurture Spirit Seed (10 💎) +20 Health
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
