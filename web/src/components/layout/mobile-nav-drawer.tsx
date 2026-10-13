import { Drawer } from "antd";
import { Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { advancedNavigation, workspaceNavigation } from "@/constant/navigation-tools";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/stores/use-agent-store";

type MobileNavDrawerProps = { open: boolean; activeSlug: string; onClose: () => void };

export function MobileNavDrawer({ open, activeSlug, onClose }: MobileNavDrawerProps) {
    const { t } = useTranslation();
    const togglePanel = useAgentStore((state) => state.togglePanel);
    const panelOpen = useAgentStore((state) => state.panelOpen);
    const linkClass = (active: boolean) => cn("flex items-center gap-3 rounded-lg px-3 py-3 text-sm", active ? "bg-stone-100 font-medium text-stone-950 dark:bg-stone-800 dark:text-stone-100" : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800");

    return (
        <Drawer title={t("meta.title")} placement="left" size={280} open={open} onClose={onClose} className="lg:hidden">
            <nav aria-label={t("topNav.navigation")} className="space-y-1">
                {workspaceNavigation.map((tool) => (
                    <Link key={tool.slug} to={`/${tool.slug}`} onClick={onClose} aria-current={activeSlug === tool.slug ? "page" : undefined} className={linkClass(activeSlug === tool.slug)}>
                        <tool.icon className="size-4" />{t(tool.label)}
                    </Link>
                ))}
                <p className="px-3 pb-2 pt-7 text-xs text-stone-500">{t("ux.nav.tools")}</p>
                {advancedNavigation.map((tool) => (
                    <Link key={tool.slug} to={`/${tool.slug}`} onClick={onClose} aria-current={activeSlug === tool.slug ? "page" : undefined} className={linkClass(activeSlug === tool.slug)}>
                        <tool.icon className="size-4" />{t(`navigation.${tool.slug}`)}
                    </Link>
                ))}
                <button type="button" className={`${linkClass(false)} w-full`} onClick={() => { togglePanel(); onClose(); }}>
                    <Bot className="size-4" />{t(panelOpen ? "topNav.closeAgent" : "ux.nav.localAgent")}
                </button>
            </nav>
            <p className="mt-8 border-t border-stone-200 px-3 pt-5 text-xs leading-6 text-stone-500 dark:border-stone-800">{t("ux.nav.localNotice")}</p>
        </Drawer>
    );
}
