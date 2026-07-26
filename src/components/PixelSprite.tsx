import React, { useEffect, useState } from "react";
import {
  ANIMAL_COLS,
  ANIMAL_ROWS,
  ITEMS_SHEET,
  ITEM_COLS,
  SPECIES,
  avatarFile,
  itemCell,
  type PetSpecies,
} from "../lib/sprites";

/**
 * Crops one cell out of a sprite sheet and scales it with nearest-neighbour so
 * the pixels stay crisp. Everything visual in the app is built from this.
 *
 * The trick: background-size in percent is relative to the element box, so a
 * sheet that is `cols` cells wide rendered at `cols * 100%` puts exactly one
 * cell in the box. Then background-position steps by whole box widths.
 */
interface SheetProps {
  src: string;
  /** How many cells across and down the sheet is. */
  cols: number;
  rows: number;
  col: number;
  row: number;
  /** Rendered size of the single cell, in CSS pixels. */
  size: number;
  className?: string;
  style?: React.CSSProperties;
}

export const PixelSprite: React.FC<SheetProps> = ({
  src,
  cols,
  rows,
  col,
  row,
  size,
  className = "",
  style,
}) => (
  <div
    className={className}
    style={{
      width: size,
      height: size,
      backgroundImage: `url("${src}")`,
      backgroundSize: `${cols * 100}% ${rows * 100}%`,
      backgroundPosition: `${-col * size}px ${-row * size}px`,
      backgroundRepeat: "no-repeat",
      imageRendering: "pixelated",
      ...style,
    }}
  />
);

// ---------------------------------------------------------------------------

/** Animates through the 4 frames of one row of an animal sheet. */
export const AnimalSprite: React.FC<{
  species: PetSpecies;
  stage: "baby" | "adult";
  row?: number;
  size: number;
  fps?: number;
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}> = ({ species, stage, row = 0, size, fps = 4, animate = true, className, style }) => {
  const spec = SPECIES[species] ?? SPECIES.chicken;
  const src = stage === "baby" ? spec.babyFile : spec.adultFile;
  const frame = useFrame(ANIMAL_COLS, fps, animate);

  return (
    <PixelSprite
      src={src}
      cols={ANIMAL_COLS}
      rows={ANIMAL_ROWS}
      col={animate ? frame : 0}
      row={row}
      size={size}
      className={className}
      style={style}
    />
  );
};

/** One item from the items sheet — food, eggs, gems. */
export const ItemSprite: React.FC<{
  item: number;
  size: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ item, size, className, style }) => {
  const { col, row } = itemCell(item);
  return (
    <PixelSprite
      src={ITEMS_SHEET}
      cols={ITEM_COLS}
      rows={12}
      col={col}
      row={row}
      size={size}
      className={className}
      style={style}
    />
  );
};

/** A character from the avatar pack, standing still by default. */
export const AvatarSprite: React.FC<{
  character: number;
  size: number;
  row?: number;
  animate?: boolean;
  className?: string;
  style?: React.CSSProperties;
}> = ({ character, size, row = 0, animate = false, className, style }) => {
  const frame = useFrame(8, 6, animate);
  return (
    <PixelSprite
      src={avatarFile(character)}
      cols={8}
      rows={4}
      col={animate ? frame : 0}
      row={row}
      size={size}
      className={className}
      style={style}
    />
  );
};

// ---------------------------------------------------------------------------

function useFrame(frames: number, fps: number, running: boolean): number {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % frames), 1000 / fps);
    return () => clearInterval(id);
  }, [frames, fps, running]);
  return running ? frame : 0;
}
