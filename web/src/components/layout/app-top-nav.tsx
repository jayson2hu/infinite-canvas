import { Bot, ChevronDown, Menu } from "lucide-react";
import { Button, Dropdown } from "antd";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useRef, useState } from "react";

import { advancedNavigation, workspaceNavigation } from "@/constant/navigation-tools";
import { AppConfigModal } from "@/components/layout/app-config-modal";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";
import { UserStatusActions } from "@/components/layout/user-status-actions";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/stores/use-agent-store";

export function AppTopNav() {
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const autoConnectRef = useRef(false);
    const agentToken = useAgentStore((state) => state.token);
    const agentEnabled = useAgentStore((state) => state.enabled);
    const agentConnected = useAgentStore((state) => state.connected);
    const connectAgent = useAgentStore((state) => state.connectAgent);
    const togglePanel = useAgentStore((state) => state.togglePanel);
    const panelOpen = useAgentStore((state) => state.panelOpen);
    const hideHeader = /^\/canvas\/[^/]+/.test(pathname);
    const slug = pathname.split("/").filter(Boolean)[0] || "";
    const activeAdvancedTool = advancedNavigation.find((tool) => tool.slug === slug);

    useEffect(() => {
        if (autoConnectRef.current || agentEnabled || agentConnected || !agentToken.trim()) return;
        autoConnectRef.current = true;
        connectAgent({ silent: true });
    }, [agentConnected, agentEnabled, agentToken, connectAgent]);

    return (
        <>
            {!hideHeader ? (
                <header className="z-20 h-16 shrink-0 border-b border-stone-200 bg-background dark:border-stone-800">
                    <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
                        <div className="flex min-w-0 items-center gap-3 lg:gap-10">
                            <Link to="/" className="flex shrink-0 items-center gap-2 text-stone-950 dark:text-stone-100" aria-label={t("ux.nav.brandHome")}>
                                <span className="size-6 shrink-0 bg-current" aria-hidden="true" style={{ mask: "url(/logo.svg) center / contain no-repeat", WebkitMask: "url(/logo.svg) center / contain no-repeat" }} />
                                <span className="text-base font-semibold">{t("meta.title")}</span>
                            </Link>
                            <Button type="text" className="!flex !size-8 !min-w-8 !p-0 lg:!hidden" icon={<Menu className="size-5" />} onClick={() => setMobileNavOpen(true)} aria-label={t("topNav.openMenu")} />
                            <nav className="hidden h-16 items-center gap-7 lg:flex" aria-label={t("topNav.navigation")}>
                                {workspaceNavigation.map((tool) => (
                                    <Link key={tool.slug} to={`/${tool.slug}`} aria-current={tool.slug === slug ? "page" : undefined} className={cn("relative flex h-full items-center whitespace-nowrap text-sm after:absolute after:inset-x-0 after:bottom-0 after:h-0.5", tool.slug === slug ? "font-medium text-stone-950 after:bg-stone-950 dark:text-stone-100 dark:after:bg-stone-100" : "text-stone-500 hover:text-stone-950 dark:text-stone-400 dark:hover:text-stone-100")}>
                                        {t(tool.label)}
                                    </Link>
                                ))}
                                <Dropdown trigger={["click"]} menu={{ selectedKeys: activeAdvancedTool ? [activeAdvancedTool.slug] : [], items: [
                                    ...advancedNavigation.map((tool) => ({ key: tool.slug, icon: <tool.icon className="size-4" />, label: <Link to={`/${tool.slug}`}>{t(`navigation.${tool.slug}`)}</Link> })),
                                    { type: "divider" },
                                    { key: "agent", icon: <Bot className="size-4" />, label: t(panelOpen ? "topNav.closeAgent" : "ux.nav.localAgent"), onClick: togglePanel },
                                ] }}>
                                    <Button type="text" className={activeAdvancedTool ? "!font-medium" : "!text-stone-500 dark:!text-stone-400"}>
                                        {t(activeAdvancedTool ? `navigation.${activeAdvancedTool.slug}` : "ux.nav.tools")}<ChevronDown className="size-3.5" />
                                    </Button>
                                </Dropdown>
                            </nav>
                        </div>
                        <UserStatusActions compact />
                    </div>
                </header>
            ) : null}
            <MobileNavDrawer open={mobileNavOpen} activeSlug={slug} onClose={() => setMobileNavOpen(false)} />
            <AppConfigModal />
        </>
    );
}
