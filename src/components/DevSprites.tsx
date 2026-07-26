import React, { useState } from "react";
import { AnimalSprite, AvatarSprite, ItemSprite, PixelSprite } from "./PixelSprite";
import {
  ANIMAL_COLS,
  ANIMAL_ROWS,
  AVATAR_COUNT,
  EGG_FOR_SPECIES,
  FOODS,
  ITEM,
  ITEM_COLS,
  SPECIES,
  SPECIES_LIST,
  type PetSpecies,
} from "../lib/sprites";

/**
 * Sprite inspector at /dev/sprites — not linked from the app.
 *
 * Sprite sheets are grids of unlabelled cells, and the pack's own item list
 * skips blank cells, so the only reliable way to know what is at a coordinate
 * is to render every coordinate and look. This page exists so row semantics
 * (which row is "sleeping"?) and item indices are read off the screen instead
 * of guessed.
 */

const ITEM_ROWS = 12;

export const DevSprites: React.FC = () => {
  const [animate, setAnimate] = useState(true);
  const [size, setSize] = useState(72);

  return (
    <div className="min-h-screen bg-[#FDFCF8] px-6 py-8 font-sans text-[#2D362E]">
      <header className="mb-8 border-b border-[#E5E2D9] pb-5">
        <h1 className="font-serif text-3xl font-bold">Sprite inspector</h1>
        <p className="mt-1 text-sm text-[#7A837C]">
          Every cell the app can draw, at its real sheet coordinates. Nothing here is
          part of the product — it is how the coordinates get verified.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={animate}
              onChange={(e) => setAnimate(e.target.checked)}
              className="h-4 w-4 accent-[#5E7161]"
            />
            Animate frames
          </label>
          <label className="flex items-center gap-2">
            Size
            <input
              type="range"
              min={32}
              max={128}
              step={8}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
            <span className="w-10 font-mono text-xs">{size}px</span>
          </label>
        </div>
      </header>

      <Section
        title="Animals — every row, both stages"
        note="Row semantics are per-species. Read off which row is facing-viewer, which is grazing/head-down, and which (if any) reads as asleep. Frames animate left to right within a row."
      >
        {SPECIES_LIST.map((spec) => (
          <SpeciesBlock key={spec.id} species={spec.id} animate={animate} size={size} />
        ))}
      </Section>

      <Section
        title="Eggs — one per species"
        note="Cell indices in items.png. The pack's item list.txt omits blank cells, so these were read visually."
      >
        <div className="flex flex-wrap gap-5">
          {SPECIES_LIST.map((spec) => (
            <Tile
              key={spec.id}
              label={`${spec.label} · item ${EGG_FOR_SPECIES[spec.id]}`}
            >
              <ItemSprite item={EGG_FOR_SPECIES[spec.id]} size={size} />
            </Tile>
          ))}
        </div>
      </Section>

      <Section title="Avatars — 8 characters × 4 direction rows, layered">
        <div className="space-y-5">
          {Array.from({ length: AVATAR_COUNT }, (_, i) => i + 1).map((n) => (
            <div key={n} className="flex items-center gap-5">
              <span className="w-16 shrink-0 font-mono text-xs text-[#7A837C]">char{n}</span>
              {[0, 1, 2, 3].map((row) => (
                <Tile key={row} label={`row ${row}`}>
                  <AvatarSprite character={n} size={size} row={row} animate={animate} />
                </Tile>
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Items sheet — all cells with indices"
        note="10 columns × 12 rows of 16px cells. The number under each cell is the index to pass to ItemSprite."
      >
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${ITEM_COLS}, minmax(0, 1fr))`, maxWidth: 900 }}
        >
          {Array.from({ length: ITEM_COLS * ITEM_ROWS }, (_, i) => {
            const named = Object.entries(ITEM).find(([, v]) => v === i)?.[0];
            return (
              <div
                key={i}
                className={`flex flex-col items-center rounded-lg border p-1.5 ${
                  named ? "border-[#8BA88E] bg-[#F0F4F0]" : "border-[#E5E2D9] bg-white"
                }`}
              >
                <ItemSprite item={i} size={40} />
                <span className="mt-1 font-mono text-[10px] text-[#7A837C]">{i}</span>
                {named && (
                  <span className="text-[9px] leading-tight text-[#5E7161]">{named}</span>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        title="Crops sheet — 6 cols x 37 rows of 16px cells (crops.png)"
        note="Each row appears to be one crop's growth stages left to right. Numbers are [col,row]."
      >
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(6, minmax(0,1fr))", maxWidth: 560 }}>
          {Array.from({ length: 6 * 37 }, (_, i) => {
            const col = i % 6;
            const row = Math.floor(i / 6);
            return (
              <div key={i} className="flex flex-col items-center rounded-lg border border-[#E5E2D9] bg-white p-1">
                <PixelSprite src="/pixelart/ui/crops.png" cols={6} rows={37} col={col} row={row} size={40} />
                <span className="mt-0.5 font-mono text-[9px] text-[#7A837C]">{col},{row}</span>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Foods sold in the store">
        <div className="flex flex-wrap gap-5">
          {FOODS.map((f) => (
            <Tile key={f.id} label={`${f.label} · ${f.cost}💎 · +${f.health}hp`}>
              <ItemSprite item={f.item} size={size} />
            </Tile>
          ))}
        </div>
      </Section>

      <Section
        title="Raw sheets"
        note="Full images at 1:1, for when a cell size looks wrong."
      >
        <div className="flex flex-wrap gap-6">
          {SPECIES_LIST.flatMap((spec) => [
            { src: spec.babyFile, label: `${spec.id} baby · ${spec.babyCell}px cells` },
            { src: spec.adultFile, label: `${spec.id} adult · ${spec.adultCell}px cells` },
          ]).map((s) => (
            <figure key={s.src} className="text-center">
              <img
                src={s.src}
                alt={s.label}
                style={{ imageRendering: "pixelated", transform: "scale(2)", transformOrigin: "top left" }}
              />
              <figcaption className="mt-16 font-mono text-[10px] text-[#7A837C]">{s.label}</figcaption>
            </figure>
          ))}
        </div>
      </Section>
    </div>
  );
};

const SpeciesBlock: React.FC<{ species: PetSpecies; animate: boolean; size: number }> = ({
  species,
  animate,
  size,
}) => {
  const spec = SPECIES[species];
  const sleepRow = spec.sleepRow ?? 4;

  return (
    <div className="mb-7 rounded-2xl border border-[#E5E2D9] bg-white p-5">
      <h3 className="mb-4 font-serif text-lg font-bold">
        {spec.label}{" "}
        <span className="font-sans text-xs font-normal text-[#7A837C]">
          baby {spec.babyCell}px · adult {spec.adultCell}px · sleepRow {sleepRow}
        </span>
      </h3>
      {(["baby", "adult"] as const).map((stage) => (
        <div key={stage} className="mb-3 flex flex-wrap items-end gap-4">
          <span className="w-12 shrink-0 font-mono text-xs text-[#7A837C]">{stage}</span>
          {Array.from({ length: ANIMAL_ROWS }, (_, row) => (
            <Tile
              key={row}
              label={`row ${row}${row === sleepRow ? " · sleep" : ""}`}
              highlight={row === sleepRow}
            >
              <AnimalSprite
                species={species}
                stage={stage}
                row={row}
                size={size}
                animate={animate}
              />
            </Tile>
          ))}
          <div className="ml-2 flex gap-1">
            {Array.from({ length: ANIMAL_COLS }, (_, col) => (
              <Tile key={col} label={`f${col}`}>
                <PixelSprite
                  src={stage === "baby" ? spec.babyFile : spec.adultFile}
                  cols={ANIMAL_COLS}
                  rows={ANIMAL_ROWS}
                  col={col}
                  row={sleepRow}
                  size={Math.round(size * 0.6)}
                />
              </Tile>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const Section: React.FC<{ title: string; note?: string; children: React.ReactNode }> = ({
  title,
  note,
  children,
}) => (
  <section className="mb-12">
    <h2 className="font-serif text-xl font-bold">{title}</h2>
    {note && <p className="mb-4 mt-1 max-w-3xl text-xs text-[#7A837C]">{note}</p>}
    <div className={note ? "" : "mt-4"}>{children}</div>
  </section>
);

const Tile: React.FC<{ label: string; highlight?: boolean; children: React.ReactNode }> = ({
  label,
  highlight,
  children,
}) => (
  <div className="text-center">
    <div
      className={`inline-flex items-center justify-center rounded-lg border p-1 ${
        highlight ? "border-[#8BA88E] bg-[#F0F4F0]" : "border-[#E5E2D9] bg-[#FDFCF8]"
      }`}
    >
      {children}
    </div>
    <div className="mt-1 font-mono text-[10px] text-[#7A837C]">{label}</div>
  </div>
);
