import { FileText, FolderOpen, ImagePlus, Images, LayoutDashboard, Maximize2, Settings2, Video } from "lucide-react";

export const navigationTools = [
    {
        slug: "canvas",
        icon: Maximize2,
    },
    {
        slug: "image",
        icon: ImagePlus,
    },
    {
        slug: "video",
        icon: Video,
    },
    {
        slug: "prompts",
        icon: FileText,
    },
    {
        slug: "assets",
        icon: Images,
    },
    {
        slug: "config",
        icon: Settings2,
    },
] as const;

export type NavigationToolSlug = (typeof navigationTools)[number]["slug"];

export const workspaceNavigation = [
    { slug: "", icon: LayoutDashboard, label: "ux.nav.home" },
    { slug: "canvas", icon: FolderOpen, label: "ux.nav.projects" },
    { slug: "assets", icon: Images, label: "ux.nav.assets" },
    { slug: "prompts", icon: FileText, label: "ux.nav.inspiration" },
] as const;

export const advancedNavigation = navigationTools.filter((tool) => tool.slug === "image" || tool.slug === "video" || tool.slug === "config");
