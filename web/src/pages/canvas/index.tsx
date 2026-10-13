import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { App, Button, Dropdown, Input, Select } from "antd";
import { Download, FileUp, FolderOpen, HardDrive, MoreHorizontal, Plus, Search, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { readZip } from "@/lib/zip";
import { setMediaBlob } from "@/services/file-storage";
import { setImageBlob } from "@/services/image-storage";
import { CanvasDeleteProjectsDialog } from "@/components/canvas/canvas-delete-projects-dialog";
import { CanvasProjectCard } from "@/components/canvas/canvas-project-card";
import type { CanvasExportFile } from "@/types/canvas-export";
import { useCanvasStore } from "@/stores/canvas/use-canvas-store";
import { useCanvasUiStore } from "@/stores/canvas/use-canvas-ui-store";
import { exportCanvasProjects } from "@/lib/canvas/canvas-export";
import { hasAgentUrlBootstrap } from "@/lib/agent/agent-url-bootstrap";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";

export default function CanvasPage() {
    const { message } = App.useApp();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inputRef = useRef<HTMLInputElement>(null);
    const autoOpenRef = useRef(false);
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("updated");
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const hydrated = useCanvasStore((state) => state.hydrated);
    const projects = useCanvasStore((state) => state.projects);
    const createProject = useCanvasStore((state) => state.createProject);
    const importProject = useCanvasStore((state) => state.importProject);
    const selectedIds = useCanvasUiStore((state) => state.selectedProjectIds);
    const setDeleteIds = useCanvasUiStore((state) => state.setDeleteProjectIds);
    const removeSelectedIds = useCanvasUiStore((state) => state.removeSelectedProjectIds);
    const selectedProjects = projects.filter((project) => selectedIds.includes(project.id));
    const visibleProjects = useMemo(() => {
        const keyword = search.trim().toLocaleLowerCase();
        return projects.filter((project) => project.title.toLocaleLowerCase().includes(keyword)).sort((a, b) => {
            if (sort === "name") return a.title.localeCompare(b.title);
            return Date.parse(sort === "created" ? b.createdAt : b.updatedAt) - Date.parse(sort === "created" ? a.createdAt : a.updatedAt);
        });
    }, [projects, search, sort]);

    const mode = searchParams.get("mode");
    const agentMode = mode === "new" || mode === "recent" || mode === "choose";
    const agentQuery = agentMode ? `?${searchParams.toString()}` : "";
    const enterProject = (id: string) => {
        const agentHash = hasAgentUrlBootstrap(window.location.hash) ? window.location.hash : "";
        navigate(`/canvas/${id}${agentQuery}${agentHash}`, { replace: Boolean(agentHash) });
    };
    const createAndEnter = () => enterProject(createProject(t("canvas.defaultTitle", { count: projects.length + 1 })));
    const importCanvas = async (file?: File) => {
        if (!file) return;
        try {
            const zip = await readZip(file);
            const projectFile = zip.get("projects.json");
            if (!projectFile) throw new Error("missing projects.json");
            const data = JSON.parse(await projectFile.text()) as CanvasExportFile;
            await Promise.all(
                data.projects.flatMap((project) =>
                    project.files.map(async (item) => {
                        const blob = zip.get(item.path);
                        if (!blob) return;
                        const typedBlob = blob.type ? blob : blob.slice(0, blob.size, item.mimeType);
                        await (item.storageKey.startsWith("image:") ? setImageBlob(item.storageKey, typedBlob) : setMediaBlob(item.storageKey, typedBlob));
                    }),
                ),
            );
            data.projects.forEach((item) => importProject(item.project));
            message.success(t("canvas.imported", { count: data.projects.length }));
        } catch {
            message.error(t("canvas.importFailed"));
        } finally {
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    useEffect(() => {
        if (!hydrated || autoOpenRef.current || (mode !== "new" && mode !== "recent")) return;
        autoOpenRef.current = true;
        enterProject(mode === "new" ? createProject(t("canvas.defaultTitle", { count: projects.length + 1 })) : projects[0]?.id || createProject(t("canvas.defaultTitle", { count: projects.length + 1 })));
    }, [createProject, hydrated, mode, projects, t]);

    if (hydrated && (mode === "new" || mode === "recent")) return <main className="flex h-full items-center justify-center bg-background text-sm text-stone-500">{t("canvas.opening")}</main>;

    return (
        <main className="h-full overflow-auto bg-background" style={{ color: theme.node.text }}>
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-5 py-8 sm:px-8 sm:py-10">
                <header className="flex flex-wrap items-end justify-between gap-5">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight">{t("ux.projects.title", { defaultValue: "我的项目" })}</h1>
                        <p className="mt-3 text-sm leading-6" style={{ color: theme.node.muted }}>{t("ux.projects.description", { defaultValue: "接着上次的想法，继续创作。" })}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button disabled={!hydrated} icon={<FileUp className="size-4" />} onClick={() => inputRef.current?.click()}>
                            {t("canvas.import")}
                        </Button>
                        <Button disabled={!hydrated} type="primary" icon={<Plus className="size-4" />} onClick={createAndEnter}>
                            {t("ux.projects.create", { defaultValue: "新建项目" })}
                        </Button>
                        {projects.length ? (
                            <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items: [{ key: "delete-all", label: t("canvas.deleteAll"), icon: <Trash2 className="size-4" />, danger: true, onClick: () => setDeleteIds(projects.map((project) => project.id)) }] }}>
                                <Button type="text" disabled={!hydrated} icon={<MoreHorizontal className="size-5" />} aria-label={t("ux.projects.more", { defaultValue: "更多项目操作" })} />
                            </Dropdown>
                        ) : null}
                    </div>
                </header>

                <div className="flex items-start gap-2 text-xs leading-5" style={{ color: theme.node.muted }}>
                    <HardDrive className="mt-0.5 size-4 shrink-0" />
                    <p>{t("ux.projects.localNotice", { defaultValue: "项目保存在当前浏览器。换设备或清理浏览器前，请先导出备份。" })}</p>
                </div>

                {hydrated && projects.length > 0 ? (
                    <section className="flex flex-wrap items-center justify-between gap-3 border-y py-4" style={{ borderColor: theme.node.stroke }} aria-label={t("ux.projects.filters", { defaultValue: "查找项目" })}>
                        <Input className="w-full sm:!w-80" value={search} onChange={(event) => setSearch(event.target.value)} prefix={<Search className="size-4" />} placeholder={t("ux.projects.search", { defaultValue: "搜索项目名称" })} aria-label={t("ux.projects.search", { defaultValue: "搜索项目名称" })} allowClear />
                        <div className="flex items-center gap-3">
                            <span className="text-xs" style={{ color: theme.node.muted }} aria-live="polite">{t("ux.projects.count", { defaultValue: "{{count}} 个项目", count: visibleProjects.length })}</span>
                            <Select value={sort} onChange={setSort} className="min-w-36" aria-label={t("ux.projects.sort", { defaultValue: "项目排序" })} options={[
                                { value: "updated", label: t("ux.projects.sortUpdated", { defaultValue: "最近编辑" }) },
                                { value: "created", label: t("ux.projects.sortCreated", { defaultValue: "最近创建" }) },
                                { value: "name", label: t("ux.projects.sortName", { defaultValue: "项目名称" }) },
                            ]} />
                        </div>
                    </section>
                ) : null}

                {selectedProjects.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-3" role="region" aria-label={t("ux.projects.batchActions", { defaultValue: "批量操作" })}>
                        <span className="mr-auto text-sm">{t("ux.projects.selected", { defaultValue: "已选择 {{count}} 个项目", count: selectedProjects.length })}</span>
                        <Button type="text" icon={<Download className="size-4" />} onClick={() => void exportCanvasProjects(selectedProjects, `${t("canvas.title")}-${selectedProjects.length}`)}>{t("canvas.exportSelected")}</Button>
                        <Button danger type="text" icon={<Trash2 className="size-4" />} onClick={() => setDeleteIds(selectedProjects.map((project) => project.id))}>{t("canvas.deleteSelected")}</Button>
                        <Button type="text" icon={<X className="size-4" />} onClick={() => removeSelectedIds(selectedIds)}>{t("ux.projects.clearSelection", { defaultValue: "取消选择" })}</Button>
                    </div>
                ) : null}

                {!hydrated ? (
                    <section className="flex min-h-[360px] items-center justify-center text-sm" style={{ color: theme.node.muted }} role="status">{t("canvas.loading")}</section>
                ) : visibleProjects.length ? (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {visibleProjects.map((project) => (
                            <CanvasProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                ) : projects.length ? (
                    <section className="flex min-h-72 flex-col items-center justify-center text-center">
                        <Search className="mb-5 size-8" style={{ color: theme.node.muted }} />
                        <h2 className="text-xl font-medium">{t("ux.projects.noResults", { defaultValue: "没有找到这个项目" })}</h2>
                        <p className="mt-3 text-sm" style={{ color: theme.node.muted }}>{t("ux.projects.noResultsHint", { defaultValue: "试试更短的名称，或查看全部项目。" })}</p>
                        <Button className="mt-5" onClick={() => setSearch("")}>{t("ux.projects.clearSearch", { defaultValue: "清空搜索" })}</Button>
                    </section>
                ) : (
                    <section className="flex min-h-[360px] flex-col items-center justify-center text-center">
                        <FolderOpen className="mb-5 size-10" strokeWidth={1.25} style={{ color: theme.node.muted }} />
                        <h2 className="text-xl font-medium">{t("ux.projects.empty", { defaultValue: "给第一个想法，一个创作空间" })}</h2>
                        <p className="mt-3 max-w-md text-sm leading-6" style={{ color: theme.node.muted }}>{t("ux.projects.emptyHint", { defaultValue: "把参考图、文字和生成结果放在同一个项目里，随时回来继续。" })}</p>
                        <Button type="primary" className="mt-6" icon={<Plus className="size-4" />} onClick={createAndEnter}>
                            {t("ux.projects.create", { defaultValue: "新建项目" })}
                        </Button>
                    </section>
                )}
            </div>

            <input ref={inputRef} type="file" accept="application/zip,.zip" className="hidden" onChange={(event) => void importCanvas(event.target.files?.[0])} />
            <CanvasDeleteProjectsDialog />
        </main>
    );
}
