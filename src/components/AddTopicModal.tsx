import React, { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, FileStack, Loader2, Sparkles, X } from "lucide-react";
import { MaterialInput, type AttachedFile } from "./MaterialInput";
import { titleFromFilename } from "../lib/course";

/**
 * Adding weeks to a module.
 *
 * Two shapes, because two things actually happen: it is Tuesday and you have
 * this week's lecture, or it is week 9 and you finally load the whole semester
 * in one go. Mass upload maps one file to one week; the single flow lets a
 * week hold several lectures that belong to one theme.
 */

export interface TopicDraft {
  title: string;
  notes: string;
  files: string[];
}

interface Props {
  courseSubject: string;
  nextWeek: number;
  busy: boolean;
  progress: { current: number; total: number; title: string } | null;
  onAdd: (topics: TopicDraft[]) => void;
  onClose: () => void;
}

type Mode = "single" | "batch";

export const AddTopicModal: React.FC<Props> = ({
  courseSubject,
  nextWeek,
  busy,
  progress,
  onAdd,
  onClose,
}) => {
  const [mode, setMode] = useState<Mode>("single");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<AttachedFile[]>([]);

  /**
   * In batch mode each attachment is its own week, so the notes textarea only
   * holds the concatenation the picker produced. Splitting it back apart by the
   * "# filename" headings MaterialInput writes keeps one source of truth.
   */
  const batchDrafts: TopicDraft[] = files.map((f) => ({
    title: titleFromFilename(f.name),
    notes: sectionFor(notes, f.name),
    files: [f.name],
  }));

  const canSingle = notes.trim().length > 40;
  const canBatch = files.length > 0 && batchDrafts.every((d) => d.notes.trim().length > 40);
  const canSubmit = mode === "single" ? canSingle : canBatch;

  function submit() {
    if (mode === "single") {
      onAdd([{ title: title.trim(), notes: notes.trim(), files: files.map((f) => f.name) }]);
    } else {
      onAdd(batchDrafts);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#2D362E]/60 p-4 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="my-8 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#E5E2D9] bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h3 className="font-serif text-xl font-bold">Add lecture material</h3>
            <p className="mt-0.5 text-xs text-[#7A837C]">
              {courseSubject} · next up is week {nextWeek}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-full p-2 text-[#7A837C] transition-colors hover:bg-[#F5F2EA] hover:text-[#2D362E] disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {busy ? (
          <div className="py-14 text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#5E7161]" />
            <p className="text-sm font-bold">
              {progress
                ? `Planning week ${progress.current} of ${progress.total}…`
                : "Gemma 4 is planning…"}
            </p>
            {progress && (
              <>
                <p className="mt-1 text-xs text-[#7A837C]">{progress.title}</p>
                <div className="mx-auto mt-4 h-1.5 w-56 overflow-hidden rounded-full bg-[#E5E2D9]">
                  <motion.div
                    className="h-full rounded-full bg-[#5E7161]"
                    initial={false}
                    animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </>
            )}
            <p className="mt-4 text-[11px] text-[#7A837C]">
              About a minute per week on a local model. Each one is planned from its own
              lecture, not the whole course.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-2 gap-2">
              <ModeButton
                active={mode === "single"}
                onClick={() => setMode("single")}
                icon={Sparkles}
                title="One week"
                sub="One topic, one or more lectures"
              />
              <ModeButton
                active={mode === "batch"}
                onClick={() => setMode("batch")}
                icon={FileStack}
                title="Whole semester"
                sub="Each file becomes its own week"
              />
            </div>

            {mode === "single" && (
              <label className="mb-4 block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#7A837C]">
                  What is week {nextWeek} about? <span className="font-normal">(optional)</span>
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nucleophilic substitution"
                  className="w-full rounded-2xl border border-[#E5E2D9] bg-[#FDFCF8] px-4 py-3 text-sm outline-none focus:border-[#5E7161]"
                />
              </label>
            )}

            <MaterialInput
              notes={notes}
              onNotesChange={setNotes}
              files={files}
              onFilesChange={setFiles}
              rows={7}
            />

            {mode === "batch" && files.length > 0 && (
              <div className="mt-4 rounded-2xl border border-[#E5E2D9] bg-[#F5F2EA] p-4">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#5E7161]">
                  {files.length} {files.length === 1 ? "week" : "weeks"} will be created
                </h4>
                <ol className="space-y-1">
                  {batchDrafts.map((d, i) => (
                    <li key={d.files[0]} className="flex items-center gap-2 text-xs">
                      <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] text-[#5E7161]">
                        wk {nextWeek + i}
                      </span>
                      <span className="truncate font-bold">{d.title}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-[#7A837C]">
                        {d.notes.trim().length.toLocaleString()} chars
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <button
              disabled={!canSubmit}
              onClick={submit}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5E7161] py-3.5 text-sm font-bold text-white transition-colors hover:bg-[#4E5F51] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {mode === "batch" && files.length > 1
                ? `Plan all ${files.length} weeks`
                : `Plan week ${nextWeek}`}
              <ArrowRight className="h-4 w-4" />
            </button>
            {!canSubmit && (
              <p className="mt-2 text-center text-[11px] text-[#7A837C]">
                {mode === "batch"
                  ? "Attach at least one lecture file."
                  : "Attach a lecture or paste at least a paragraph."}
              </p>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

const ModeButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  sub: string;
}> = ({ active, onClick, icon: Icon, title, sub }) => (
  <button
    onClick={onClick}
    className={`rounded-2xl border-2 p-3.5 text-left transition-colors ${
      active ? "border-[#5E7161] bg-[#F0F4F0]" : "border-[#E5E2D9] bg-white hover:border-[#8BA88E]"
    }`}
  >
    <Icon className={`mb-1.5 h-4 w-4 ${active ? "text-[#5E7161]" : "text-[#7A837C]"}`} />
    <div className="text-xs font-bold">{title}</div>
    <div className="text-[11px] text-[#7A837C]">{sub}</div>
  </button>
);

/**
 * MaterialInput prefixes each extracted file with "# <filename>", so a batch
 * upload can be split back into per-file sections without re-reading anything.
 */
function sectionFor(notes: string, filename: string): string {
  const marker = `# ${filename}`;
  const start = notes.indexOf(marker);
  if (start === -1) return "";
  const rest = notes.slice(start + marker.length);
  const nextHeading = rest.search(/\n# [^\n]+\n/);
  return (nextHeading === -1 ? rest : rest.slice(0, nextHeading)).trim();
}
