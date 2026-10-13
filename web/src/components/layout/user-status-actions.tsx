import type { CSSProperties } from "react";
import { Popover, Tooltip } from "antd";
import { BookOpen, ExternalLink, History, Keyboard, Languages, MoreHorizontal, Puzzle, Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { GitHubLink } from "@/components/layout/github-link";
import { VersionReleaseModal } from "@/components/layout/version-release-modal";
import { DOCS_URL } from "@/constant/env";
import { changeAppLocale, type AppLocale } from "@/i18n";
import { cn } from "@/lib/utils";
import { canvasThemes } from "@/lib/canvas-theme";
import { useConfigStore } from "@/stores/use-config-store";
import { useThemeStore } from "@/stores/use-theme-store";

type UserStatusActionsProps = {
    compact?: boolean;
    showConfig?: boolean;
    variant?: "default" | "canvas";
    onOpenShortcuts?: () => void;
    onOpenPlugins?: () => void;
};

export function UserStatusActions({ compact = false, showConfig = true, variant = "default", onOpenShortcuts, onOpenPlugins }: UserStatusActionsProps) {
    const { i18n, t } = useTranslation();
    const theme = useThemeStore((state) => state.theme);
    const setTheme = useThemeStore((state) => state.setTheme);
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const canvasTheme = canvasThemes[theme];
    const naturalIconClass = "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-stone-600 transition-colors hover:bg-black/5 hover:text-stone-950 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-white [&_svg]:size-4";
    const iconStyle: CSSProperties | undefined = variant === "canvas" ? { color: canvasTheme.node.text } : undefined;
    const versionStyle = iconStyle;
    const gitHubClassName = "size-7 text-base";
    const gitHubStyle = iconStyle;
    const locale = i18n.resolvedLanguage as AppLocale;
    const nextLocale = locale === "zh-CN" ? "en-US" : "zh-CN";
    const languageLabel = t("topNav.switchLanguage", { language: t(nextLocale === "zh-CN" ? "locale.zhCN" : "locale.enUS") });

    if (compact) {
        const menuClass = "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-stone-700 hover:bg-black/5 dark:text-stone-200 dark:hover:bg-white/10";
        return (
            <div className="flex shrink-0 items-center gap-2">
                {showConfig ? <button type="button" className={naturalIconClass} onClick={() => openConfigDialog(false)} aria-label={t("navigation.config")} title={t("navigation.config")}><Settings2 /></button> : null}
                <AnimatedThemeToggler theme={theme} onThemeChange={setTheme} className={naturalIconClass} aria-label={t(theme === "dark" ? "topNav.lightTheme" : "topNav.darkTheme")} title={t(theme === "dark" ? "topNav.lightTheme" : "topNav.darkTheme")} />
                <Popover trigger="click" placement="bottomRight" content={
                    <div className="w-56">
                        <button type="button" className={menuClass} onClick={() => void changeAppLocale(nextLocale)}><Languages className="size-4" />{languageLabel}</button>
                        <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className={menuClass}><BookOpen className="size-4" />{t("topNav.docs")}</a>
                        <div className="flex items-center gap-3 rounded-md px-3 hover:bg-black/5 dark:hover:bg-white/10"><History className="size-4 shrink-0" /><VersionReleaseModal className="w-full py-2.5 text-left text-sm" triggerLabel={t("version.viewUpdates")} /></div>
                        <a href="https://github.com/basketikun/infinite-canvas" target="_blank" rel="noopener noreferrer" className={menuClass}><ExternalLink className="size-4" />{t("ux.nav.source")}</a>
                    </div>
                }>
                    <button type="button" className={naturalIconClass} aria-label={t("ux.nav.preferences")} title={t("ux.nav.preferences")}><MoreHorizontal /></button>
                </Popover>
            </div>
        );
    }

    return (
        <div className="inline-flex shrink-0 items-center gap-1">
            {onOpenPlugins ? (
                <button type="button" className={naturalIconClass} style={iconStyle} onClick={onOpenPlugins} aria-label={t("topNav.plugins")} title={t("topNav.plugins")}>
                    <Puzzle className="size-4" />
                </button>
            ) : null}
            <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" className={naturalIconClass} style={iconStyle} aria-label={t("topNav.docs")} title={t("topNav.docs")}>
                <BookOpen className="size-4" />
            </a>
            {showConfig ? (
                <button type="button" className={naturalIconClass} style={iconStyle} onClick={() => openConfigDialog(false)} aria-label={t("navigation.config")} title={t("navigation.config")}>
                    <Settings2 className="size-4" />
                </button>
            ) : null}
            <Tooltip title={languageLabel} mouseEnterDelay={0.2}>
                <button type="button" className={`${naturalIconClass} text-[11px] font-semibold tracking-tight`} style={iconStyle} onClick={() => void changeAppLocale(nextLocale)} aria-label={languageLabel}>
                    {locale === "zh-CN" ? "中" : "EN"}
                </button>
            </Tooltip>
            <AnimatedThemeToggler theme={theme} onThemeChange={setTheme} className={naturalIconClass} style={iconStyle} aria-label={t(theme === "dark" ? "topNav.lightTheme" : "topNav.darkTheme")} title={t(theme === "dark" ? "topNav.lightTheme" : "topNav.darkTheme")} />
            <VersionReleaseModal style={versionStyle} />
            <GitHubLink className={cn("bg-transparent hover:bg-transparent dark:hover:bg-transparent", gitHubClassName)} style={gitHubStyle} />
            {onOpenShortcuts ? (
                <button type="button" className={naturalIconClass} style={iconStyle} onClick={onOpenShortcuts} aria-label={t("topNav.shortcuts")} title={t("topNav.shortcuts")}>
                    <Keyboard className="size-4" />
                </button>
            ) : null}
        </div>
    );
}
