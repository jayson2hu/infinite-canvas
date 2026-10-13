import { Check, Download, Image, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Dropdown, Input } from "antd";
import { useTranslation } from "react-i18next";

import { useCanvasStore, type CanvasProject } from "@/stores/canvas/use-canvas-store";
import { useCanvasUiStore } from "@/stores/canvas/use-canvas-ui-store";
import { exportCanvasProjects } from "@/lib/canvas/canvas-export";
import { hasAgentUrlBootstrap } from "@/lib/agent/agent-url-bootstrap";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import { useProjectCover } from "@/hooks/use-project-cover";

export function CanvasProjectCard({ project }: { project: CanvasProject }) {
    const { i18n, t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const renameProject = useCanvasStore((state) => state.renameProject);
    const selectedIds = useCanvasUiStore((state) => state.selectedProjectIds);
    const editingId = useCanvasUiStore((state) => state.editingProjectId);
    const editingTitle = useCanvasUiStore((state) => state.editingProjectTitle);
    const startEditing = useCanvasUiStore((state) => state.startEditingProject);
    const setEditingTitle = useCanvasUiStore((state) => state.setEditingProjectTitle);
    const stopEditing = useCanvasUiStore((state) => state.stopEditingProject);
    const toggleSelected = useCanvasUiStore((state) => state.toggleSelectedProjectId);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const { source: coverUrl, onError: onCoverError } = useProjectCover(project);
    const editing = editingId === project.id;
    const selected = selectedIds.includes(project.id);
    const open = () => {
        const agentHash = hasAgentUrlBootstrap(window.location.hash) ? window.location.hash : "";
        navigate(`/canvas/${project.id}${searchParams.toString() ? `?${searchParams.toString()}` : ""}${agentHash}`, { replace: Boolean(agentHash) });
    };
    const saveTitle = () => {
        renameProject(project.id, editingTitle);
        stopEditing();
    };

    return (
        <article className="group min-w-0 overflow-hidden rounded-xl border transition-colors" style={{ background: theme.node.panel, borderColor: selected ? theme.node.activeStroke : theme.node.stroke }}>
            <div className="relative">
                <button type="button" onClick={open} disabled={editing} className="flex aspect-[16/10] w-full cursor-pointer items-center justify-center overflow-hidden outline-offset-[-4px] disabled:cursor-default" style={{ background: theme.canvas.background }} aria-label={t("ux.projects.open", { defaultValue: "打开 {{name}}", name: project.title })}>
                    {coverUrl ? (
                        <img src={coverUrl} alt="" loading="lazy" className="size-full object-cover transition-transform duration-200 motion-safe:group-hover:scale-[1.02]" onError={onCoverError} />
                    ) : (
                        <span className="flex max-w-[80%] flex-col items-center gap-3 px-4 text-center" style={{ color: theme.node.muted }}>
                            <Image className="size-7" strokeWidth={1.25} />
                            <span className="text-sm">{project.nodes.length ? t("ux.projects.contentCount", { defaultValue: "{{count}} 个创作内容", count: project.nodes.length }) : t("ux.projects.blankCover", { defaultValue: "从一个想法开始" })}</span>
                        </span>
                    )}
                </button>
                <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => toggleSelected(project.id, event.target.checked)}
                    className="absolute left-4 top-4 size-4 cursor-pointer"
                    style={{ accentColor: theme.node.activeStroke }}
                    aria-label={t("canvas.project.select", { name: project.title })}
                />
            </div>
            <div className="p-4">
                <div className="flex min-w-0 items-start gap-2">
                    {editing ? (
                        <Input className="min-w-0" value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.nativeEvent.isComposing) saveTitle();
                            if (event.key === "Escape") stopEditing();
                        }} aria-label={t("canvas.project.rename")} autoFocus />
                    ) : (
                        <button type="button" className="min-w-0 flex-1 cursor-pointer text-left" onClick={open} title={project.title}>
                            <h2 className="truncate text-base font-semibold leading-7">{project.title}</h2>
                        </button>
                    )}
                    {editing ? (
                        <div className="flex shrink-0 items-center">
                            <Button type="text" size="small" shape="circle" icon={<Check className="size-4" />} onClick={saveTitle} aria-label={t("canvas.project.saveName")} />
                            <Button type="text" size="small" shape="circle" icon={<X className="size-4" />} onClick={stopEditing} aria-label={t("canvas.project.cancelRename")} />
                        </div>
                    ) : (
                        <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items: [
                            { key: "rename", label: t("canvas.project.rename"), icon: <Pencil className="size-4" />, onClick: () => startEditing(project.id, project.title) },
                            { key: "export", label: t("canvas.project.export"), icon: <Download className="size-4" />, onClick: () => void exportCanvasProjects([project], project.title || t("canvas.title")) },
                            { type: "divider" },
                            { key: "delete", label: t("canvas.project.delete"), icon: <Trash2 className="size-4" />, danger: true, onClick: () => setDeleteIds([project.id]) },
                        ] }}>
                            <Button type="text" size="small" icon={<MoreHorizontal className="size-5" />} aria-label={t("ux.projects.projectActions", { defaultValue: "{{name}} 的更多操作", name: project.title })} />
                        </Dropdown>
                    )}
                </div>
                <p className="mt-2 text-xs leading-5" style={{ color: theme.node.muted }}>
                    {t("ux.projects.updated", { defaultValue: "编辑于 {{date}}", date: new Date(project.updatedAt).toLocaleString(i18n.resolvedLanguage, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) })}
                </p>
            </div>
        </article>
    );
}
