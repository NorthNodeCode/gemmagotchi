import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FarmPlot, CropType, PetState } from '../types';
import { Droplets, Sparkles, Sun, CloudRain, Flower2, Sprout, Coins, Plus, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SpiritFarmProps {
  plots: FarmPlot[];
  pet: PetState;
  studyMinutesAvailable: number;
  gems: number;
  onWaterPlot: (plotId: number) => void;
  onPlantCrop: (plotId: number, crop: CropType) => void;
  onHarvestPlot: (plotId: number) => void;
}

const CROP_INFO: Record<CropType, { name: string; color: string; icon: string; gemYield: number; xpYield: number }> = {
  sunflower: { name: 'Sunflower of Recall', color: 'from-amber-400 to-yellow-500', icon: '🌻', gemYield: 15, xpYield: 20 },
  wisdom_berry: { name: 'Wisdom Berry', color: 'from-purple-400 to-indigo-500', icon: '🫐', gemYield: 25, xpYield: 30 },
  focus_sprout: { name: 'Focus Sprout', color: 'from-emerald-400 to-green-500', icon: '🌱', gemYield: 10, xpYield: 15 },
  crystal_lotus: { name: 'Crystal Lotus', color: 'from-cyan-400 to-blue-500', icon: '🪷', gemYield: 35, xpYield: 50 },
  golden_wheat: { name: 'Golden Wheat', color: 'from-amber-500 to-amber-600', icon: '🌾', gemYield: 20, xpYield: 25 },
};

export const SpiritFarm: React.FC<SpiritFarmProps> = ({
  plots,
  pet,
  studyMinutesAvailable,
  gems,
  onWaterPlot,
  onPlantCrop,
  onHarvestPlot,
}) => {
  const [selectedPlot, setSelectedPlot] = useState<number | null>(null);
  const isFarmWilting = pet.isSick || pet.health < 45;

  const handleTileClick = (plot: FarmPlot) => {
    if (plot.stage === 3) {
      // Harvest
      onHarvestPlot(plot.id);
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
    } else if (plot.stage === 0) {
      // Open plant selector
      setSelectedPlot(plot.id);
    } else if (!plot.watered && studyMinutesAvailable >= 5) {
      // Water
      onWaterPlot(plot.id);
    }
  };

  return (
    <div className="bg-white border border-[#E5E2D9] rounded-3xl p-6 shadow-sm relative overflow-hidden">
      {/* Weather Header */}
      <div className="flex items-center justify-between mb-4 border-b border-[#E5E2D9] pb-3.5">
        <div>
          <h3 className="text-lg font-serif font-bold text-[#2D362E] flex items-center gap-2">
            {isFarmWilting ? (
              <CloudRain className="w-5 h-5 text-[#B85B56] animate-bounce" />
            ) : (
              <Sun className="w-5 h-5 text-[#D97706] animate-spin-slow" />
            )}
            Spirit Study Sanctuary & Farm
          </h3>
          <p className="text-xs text-[#7A837C] mt-0.5">
            {isFarmWilting
              ? 'Drought Warning! Procrastination has wilted the soil. Complete sessions to rain vitality!'
              : 'Thriving Sanctuary! Water crops with focus minutes to yield Gems & Spirit XP.'}
          </p>
        </div>

        {/* Resources Meter */}
        <div className="flex items-center gap-3 bg-[#F5F2EA] px-3.5 py-2 rounded-2xl border border-[#E5E2D9]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E7161]">
            <Droplets className="w-4 h-4" />
            <span>{studyMinutesAvailable}m Dew</span>
          </div>
          <div className="w-px h-4 bg-[#E5E2D9]" />
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#D97706]">
            <Coins className="w-4 h-4" />
            <span>{gems} Gems</span>
          </div>
        </div>
      </div>

      {/* Grid of Plots */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
        {plots.map((plot) => {
          const crop = plot.cropType ? CROP_INFO[plot.cropType] : null;

          return (
            <motion.div
              key={plot.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleTileClick(plot)}
              className={`relative aspect-square rounded-2xl p-3 border cursor-pointer flex flex-col items-center justify-center transition-all ${
                isFarmWilting
                  ? 'bg-[#FFF5F5] border-[#E8C5B0] hover:border-[#B85B56]'
                  : plot.stage === 3
                  ? 'bg-[#F0F4F0] border-[#5E7161] hover:border-[#4E5F51] shadow-xs ring-1 ring-[#5E7161]/30'
                  : plot.watered
                  ? 'bg-[#F5F2EA] border-[#8BA88E] hover:border-[#5E7161]'
                  : 'bg-[#FDFCF8] border-[#E5E2D9] hover:border-[#8BA88E]'
              }`}
            >
              {/* Stage Visuals */}
              {plot.stage === 0 ? (
                <div className="flex flex-col items-center justify-center text-[#7A837C] gap-1">
                  <div className="w-8 h-8 rounded-full border border-dashed border-[#C8C4B7] flex items-center justify-center">
                    <Plus className="w-4 h-4 text-[#5E7161]" />
                  </div>
                  <span className="text-[10px] font-semibold text-[#7A837C]">Sow Seed</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  {/* Crop Icon Animation */}
                  <motion.div
                    animate={{
                      scale: plot.stage === 3 ? [1, 1.15, 1] : 1,
                      y: plot.stage === 3 ? [-2, 2, -2] : 0,
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-3xl mb-1 filter drop-shadow-xs"
                  >
                    {plot.stage === 1 && '🌱'}
                    {plot.stage === 2 && '🌿'}
                    {plot.stage === 3 && (crop?.icon || '🌻')}
                  </motion.div>

                  {/* Crop Title or Status */}
                  <span className="text-[11px] font-bold text-[#2D362E] line-clamp-1">
                    {plot.stage === 3 ? crop?.name : plot.stage === 1 ? 'Sprouting...' : 'Growing...'}
                  </span>

                  {/* Harvest / Water Action Badge */}
                  {plot.stage === 3 ? (
                    <span className="mt-1 px-2.5 py-0.5 rounded-full bg-[#5E7161] text-white font-bold text-[10px] animate-pulse flex items-center gap-1 shadow-xs">
                      <Sparkles className="w-3 h-3 text-[#F0D194]" /> HARVEST!
                    </span>
                  ) : !plot.watered ? (
                    <span className="mt-1 text-[10px] text-[#5E7161] font-semibold flex items-center gap-1 bg-[#F5F2EA] px-2 py-0.5 rounded-md border border-[#E5E2D9]">
                      <Droplets className="w-3 h-3 text-[#5E7161]" /> Need 5m
                    </span>
                  ) : (
                    <span className="mt-1 text-[10px] text-[#5E7161] font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Watered
                    </span>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Plant Selector Modal */}
      <AnimatePresence>
        {selectedPlot !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-4 p-4 bg-[#F5F2EA] border border-[#E5E2D9] rounded-2xl relative z-10 shadow-xs"
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs font-serif font-bold text-[#2D362E] uppercase tracking-wider flex items-center gap-1.5">
                <Sprout className="w-4 h-4 text-[#5E7161]" /> Choose Seed for Plot #{selectedPlot + 1}
              </h4>
              <button
                onClick={() => setSelectedPlot(null)}
                className="text-[#7A837C] hover:text-[#2D362E] text-xs font-bold px-2 py-1"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(CROP_INFO) as CropType[]).map((type) => {
                const info = CROP_INFO[type];
                return (
                  <button
                    key={type}
                    onClick={() => {
                      onPlantCrop(selectedPlot, type);
                      setSelectedPlot(null);
                    }}
                    className="p-3 bg-white hover:bg-[#FDFCF8] border border-[#E5E2D9] hover:border-[#5E7161] rounded-2xl text-left transition-all flex flex-col justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{info.icon}</span>
                      <span className="text-xs font-bold text-[#2D362E]">{info.name}</span>
                    </div>
                    <div className="text-[10px] text-[#7A837C] flex items-center gap-2">
                      <span className="text-[#D97706] font-bold">+{info.gemYield} 💎</span>
                      <span className="text-[#5E7161] font-bold">+{info.xpYield} XP</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
