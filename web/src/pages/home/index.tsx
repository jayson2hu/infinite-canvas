import { ArrowRight, ArrowUpRight, Check, ChevronRight, FileText, FolderOpen, Image as ImageIcon, LayoutTemplate, Monitor, Package, PencilLine, Plus, Shapes } from "lucide-react";
import { type CSSProperties, type FormEvent, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { canvasThemes } from "@/lib/canvas-theme";
import { createCanvasNode } from "@/lib/canvas/canvas-node-factory";
import { cn } from "@/lib/utils";
import { useProjectCover } from "@/hooks/use-project-cover";
import { useCanvasStore, type CanvasProject } from "@/stores/canvas/use-canvas-store";
import { useConfigStore, useEffectiveConfig } from "@/stores/use-config-store";
import { useThemeStore } from "@/stores/use-theme-store";
import { CanvasNodeType } from "@/types/canvas";
import { homeMessages } from "./messages";

const taskIcons = { product: Package, cover: LayoutTemplate, campaign: Shapes, free: PencilLine };

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--workbench-text)]";
const fieldClass = "w-full rounded-xl border border-[var(--workbench-border)] bg-[var(--workbench-panel)] px-3.5 py-3 text-sm leading-6 text-[color:var(--workbench-text)] outline-none placeholder:text-[color:var(--workbench-placeholder)] focus:border-[var(--workbench-text)] focus:ring-1 focus:ring-[var(--workbench-text)]";

function ProjectPreview({ project }: { project: CanvasProject }) {
    const { source, onError } = useProjectCover(project);
    const textNode = project.nodes.find((node) => node.type === CanvasNodeType.Text && node.metadata?.content);

    return (
        <div className="flex h-28 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--workbench-bg)] sm:w-28" aria-hidden="true">
            {source ? (
                <img src={source} alt="" loading="lazy" className="h-full w-full object-contain" onError={onError} />
            ) : textNode ? (
                <div className="m-2 overflow-hidden rounded border border-[var(--workbench-border)] bg-[var(--workbench-panel)] p-2.5">
                    <FileText className="mb-2 size-3 text-[color:var(--workbench-muted)]" />
                    <p className="line-clamp-4 break-all text-[9px] leading-4 text-[color:var(--workbench-muted)]">{textNode.metadata?.content}</p>
                </div>
            ) : <FolderOpen className="size-7 text-[color:var(--workbench-placeholder)]" strokeWidth={1.4} />}
        </div>
    );
}

export default function IndexPage() {
    const navigate = useNavigate();
    const { i18n } = useTranslation();
    const copy = homeMessages[i18n.resolvedLanguage?.startsWith("zh") ? "zh" : "en"];
    const tasks = copy.tasks;
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const hydrated = useCanvasStore((state) => state.hydrated);
    const projects = useCanvasStore((state) => state.projects);
    const createProject = useCanvasStore((state) => state.createProject);
    const updateProject = useCanvasStore((state) => state.updateProject);
    const config = useEffectiveConfig();
    const isAiConfigReady = useConfigStore((state) => state.isAiConfigReady);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const [taskId, setTaskId] = useState<string>(tasks[0].id);
    const [projectName, setProjectName] = useState("");
    const [goal, setGoal] = useState("");
    const [error, setError] = useState<"nameRequired" | "goalRequired" | null>(null);
    const goalRef = useRef<HTMLTextAreaElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const creatingRef = useRef(false);
    const task = tasks.find((item) => item.id === taskId) || tasks[0];
    const recentProjects = useMemo(() => [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3), [projects]);
    const prompt = `${goal.trim() || copy.emptyPrompt}\n\n${task.direction}`;
    const modelReady = isAiConfigReady(config, config.imageModel || config.model);
    const pageStyle = {
        "--workbench-bg": theme.canvas.background,
        "--workbench-panel": theme.node.panel,
        "--workbench-border": theme.node.stroke,
        "--workbench-text": theme.node.text,
        "--workbench-muted": theme.node.label,
        "--workbench-placeholder": theme.node.placeholder,
    } as CSSProperties;

    const createBlank = () => {
        if (!hydrated || creatingRef.current) return;
        creatingRef.current = true;
        navigate(`/canvas/${createProject(copy.untitled)}`);
    };

    const startProject = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!hydrated || creatingRef.current) return;
        if (!projectName.trim() || !goal.trim()) {
            setError(!projectName.trim() ? "nameRequired" : "goalRequired");
            (!projectName.trim() ? nameRef.current : goalRef.current)?.focus();
            return;
        }
        creatingRef.current = true;
        const brief = createCanvasNode(CanvasNodeType.Text, { x: 230, y: 250 }, {
            content: copy.briefContent(projectName.trim(), task.label, goal.trim()),
            status: "success",
        });
        brief.title = copy.brief;
        brief.height = 300;
        const output = createCanvasNode(CanvasNodeType.Image, { x: 660, y: 250 }, { prompt, status: "idle" });
        output.title = copy.pendingTitle(task.label);
        const id = createProject(projectName.trim());
        const scale = Math.min(1, Math.max(0.25, (window.innerWidth - 80) / 860));
        updateProject(id, {
            nodes: [brief, output],
            connections: [{ id: `brief-${brief.id}-${output.id}`, fromNodeId: brief.id, toNodeId: output.id }],
            viewport: { x: 24, y: 64, k: scale },
        });
        navigate(`/canvas/${id}`);
    };

    return (
        <main className="h-full overflow-y-auto bg-[var(--workbench-bg)] text-[color:var(--workbench-text)]" style={pageStyle}>
            <div className="mx-auto max-w-[1200px] px-5 py-8 sm:px-9 sm:py-10 lg:px-12">
                <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{copy.title}</h1>
                        <p className="mt-2 text-sm leading-6 text-[color:var(--workbench-muted)]">{copy.description}</p>
                    </div>
                    <span className="flex items-center gap-2 text-xs text-[color:var(--workbench-muted)]"><Monitor className="size-3.5" />{copy.localWorkspace}</span>
                </header>

                {!hydrated ? (
                    <div className="mb-7 flex h-24 items-center justify-center rounded-xl border border-[var(--workbench-border)] text-sm text-[color:var(--workbench-muted)]" role="status">{copy.loading}</div>
                ) : recentProjects.length > 0 ? (
                    <section className="mb-9" aria-labelledby="recent-projects-title">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <h2 id="recent-projects-title" className="text-sm font-medium">{copy.recentProjects}</h2>
                            <button type="button" onClick={() => navigate("/canvas")} className={cn("flex cursor-pointer items-center gap-1.5 rounded py-1 text-xs text-[color:var(--workbench-muted)] hover:text-[color:var(--workbench-text)]", focusClass)}>{copy.allProjects}<ArrowUpRight className="size-3.5" /></button>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-3">
                            {recentProjects.map((project, index) => (
                                <button key={project.id} type="button" onClick={() => navigate(`/canvas/${project.id}`)} className={cn("group flex w-[280px] shrink-0 cursor-pointer items-center gap-4 rounded-xl border border-[var(--workbench-border)] bg-[var(--workbench-panel)] p-3 text-left hover:border-[var(--workbench-text)] lg:w-auto lg:min-w-0", focusClass)}>
                                    <ProjectPreview project={project} />
                                    <div className="min-w-0 flex-1">
                                        <h3 className="truncate text-sm font-medium">{project.title}</h3>
                                        <p className="mt-2 text-xs text-[color:var(--workbench-muted)]">{copy.updated(new Date(project.updatedAt).toLocaleDateString(i18n.resolvedLanguage, { month: "short", day: "numeric" }))}</p>
                                        <span className="mt-4 inline-flex items-center gap-1.5 text-xs">{index === 0 ? copy.continueProject : copy.openProject}<ArrowRight className="size-3.5" /></span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>
                ) : null}

                <section aria-labelledby="new-project-title">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <h2 id="new-project-title" className="text-lg font-semibold">{copy.newProject}</h2>
                        <button type="button" disabled={!hydrated} onClick={createBlank} className={cn("flex cursor-pointer items-center gap-1.5 rounded py-1 text-xs text-[color:var(--workbench-muted)] hover:text-[color:var(--workbench-text)] disabled:cursor-wait disabled:opacity-50", focusClass)}><Plus className="size-3.5" />{copy.blankCanvas}</button>
                    </div>
                    <div className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4" role="group" aria-label={copy.taskTypes}>
                        {tasks.map((item) => {
                            const Icon = taskIcons[item.id];
                            const selected = item.id === taskId;
                            return (
                                <button key={item.id} type="button" aria-pressed={selected} onClick={() => setTaskId(item.id)} className={cn("relative cursor-pointer rounded-xl border p-4 text-left hover:border-[var(--workbench-text)] sm:p-5", selected ? "border-[var(--workbench-text)] bg-[var(--workbench-panel)]" : "border-[var(--workbench-border)] bg-transparent", focusClass)}>
                                    <div className="mb-4 flex items-center justify-between"><Icon className="size-5" strokeWidth={1.5} />{selected && <Check className="size-4" aria-hidden="true" />}</div>
                                    <span className="block text-sm font-medium">{item.label}</span>
                                    <span className="mt-1.5 block text-xs leading-5 text-[color:var(--workbench-muted)]">{item.description}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid overflow-hidden rounded-2xl border border-[var(--workbench-border)] bg-[var(--workbench-panel)] lg:grid-cols-[1.25fr_1fr]">
                        <form onSubmit={startProject} className="p-5 sm:p-7" noValidate>
                            <div className="mb-5 flex items-center justify-between gap-3">
                                <h3 className="text-sm font-semibold">{copy.briefForm}</h3>
                                {!goal.trim() && <button type="button" className={cn("cursor-pointer rounded text-xs text-[color:var(--workbench-muted)] underline underline-offset-4 hover:text-[color:var(--workbench-text)]", focusClass)} onClick={() => { setProjectName(projectName.trim() || task.name); setGoal(task.example); setError(null); goalRef.current?.focus(); }}>{copy.fillExample}</button>}
                            </div>
                            <label htmlFor="project-name" className="mb-2 block text-xs font-medium">{copy.projectName}</label>
                            <input ref={nameRef} id="project-name" name="project-name" value={projectName} onChange={(event) => { setProjectName(event.target.value); setError(null); }} className={fieldClass} placeholder={copy.namePlaceholder(task.name)} required autoComplete="off" aria-invalid={Boolean(error && !projectName.trim())} aria-describedby={error ? "project-error" : undefined} />
                            <div className="mb-2 mt-5 flex items-center justify-between gap-2"><label htmlFor="project-goal" className="text-xs font-medium">{copy.goalLabel}</label><span className="text-[11px] text-[color:var(--workbench-muted)]">{copy.goalHelp}</span></div>
                            <textarea ref={goalRef} id="project-goal" name="project-goal" value={goal} onChange={(event) => { setGoal(event.target.value); setError(null); }} className={cn(fieldClass, "min-h-32 resize-y")} placeholder={task.hint} required aria-invalid={Boolean(error && !goal.trim())} aria-describedby={error ? "project-error" : "creation-next-step"} />
                            {error && <p id="project-error" role="alert" className="mt-2 text-xs text-red-700 dark:text-red-300">{copy[error]}</p>}
                            <button type="submit" style={{ color: theme.node.panel, background: theme.node.text }} disabled={!hydrated} className={cn("mt-5 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--workbench-text)] px-4 py-3 text-sm font-medium text-[color:var(--workbench-panel)] hover:opacity-85 disabled:cursor-wait disabled:opacity-50", focusClass)}>{copy.createProject}<ArrowRight className="size-4" /></button>
                            <p className="mt-2.5 text-center text-[11px] leading-5 text-[color:var(--workbench-muted)]">{copy.noGeneration}</p>
                        </form>

                        <aside className="flex flex-col border-t border-[var(--workbench-border)] bg-[var(--workbench-bg)] p-5 sm:p-7 lg:border-t-0 lg:border-l" aria-label={copy.previewLabel}>
                            <h3 className="text-sm font-medium">{copy.previewTitle}</h3>
                            <div className="mt-5 flex items-center gap-2 text-xs text-[color:var(--workbench-muted)]"><FileText className="size-4" /><span>{copy.brief}</span><ChevronRight className="mx-1 size-3.5" /><ImageIcon className="size-4" /><span>{copy.pendingImage}</span></div>
                            <div className="mt-4 flex-1 rounded-xl border border-[var(--workbench-border)] bg-[var(--workbench-panel)] p-4">
                                <div className="mb-3 flex items-center justify-between gap-3"><p className="text-xs font-medium">{copy.draftPrompt}</p><span className="text-[10px] text-[color:var(--workbench-muted)]">{task.label}</span></div>
                                <p className="max-h-44 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-6 text-[color:var(--workbench-muted)]">{prompt}</p>
                            </div>
                            <p id="creation-next-step" className="mt-4 text-xs leading-6 text-[color:var(--workbench-muted)]">{copy.nextStep}</p>
                            {!modelReady && <p className="mt-3 text-xs leading-6 text-[color:var(--workbench-muted)]">{copy.serviceNotConnected}<button type="button" onClick={() => openConfigDialog(false, "channels")} className={cn("ml-1 cursor-pointer rounded text-[color:var(--workbench-text)] underline underline-offset-4", focusClass)}>{copy.connectService}</button></p>}
                        </aside>
                    </div>
                </section>

                {hydrated && projects.length === 0 && <p className="mt-6 flex items-start gap-2 text-xs leading-6 text-[color:var(--workbench-muted)]"><FolderOpen className="mt-1 size-4 shrink-0" />{copy.emptyProjects}</p>}
                <footer className="mt-7 flex flex-wrap items-start justify-between gap-2 border-t border-[var(--workbench-border)] pt-4 text-[11px] leading-5 text-[color:var(--workbench-muted)]">
                    <p>{copy.localBackup}</p>
                    <button type="button" onClick={() => navigate("/canvas")} className={cn("cursor-pointer rounded underline underline-offset-4", focusClass)}>{copy.manageProjects}</button>
                </footer>
            </div>
        </main>
    );
}
