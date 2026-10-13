import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { CANVAS_IMAGE_PREVIEW_MAX_EDGE } from "@/lib/image-thumbnail";
import { ensureImagePreview, getImagePreviewRevision, previewUrlFor, resolveImageUrl, subscribeImagePreviews } from "@/services/image-storage";
import type { CanvasProject } from "@/stores/canvas/use-canvas-store";
import { CanvasNodeType } from "@/types/canvas";

export function useProjectCover(project: CanvasProject) {
    useSyncExternalStore(subscribeImagePreviews, getImagePreviewRevision);
    const [original, setOriginal] = useState<{ key: string; url: string }>();
    const [failedSource, setFailedSource] = useState<string>();
    const cover = useMemo(() => {
        for (const node of [...project.nodes].reverse()) {
            if (node.type !== CanvasNodeType.Image || !node.metadata) continue;
            const metadata = node.metadata;
            const images = metadata.images?.filter((image) => image.status === "success" && (image.storageKey || image.content));
            const image = images?.find((item) => item.id === metadata.primaryImageId) || images?.[0];
            if (image) return image;
            if (metadata.status === "success" && (metadata.storageKey || metadata.content)) return metadata;
        }
    }, [project.nodes]);
    const storageKey = cover?.storageKey;
    const naturalLongEdge = Math.max(cover?.naturalWidth || 0, cover?.naturalHeight || 0);
    const useOriginal = naturalLongEdge > 0 && naturalLongEdge <= CANVAS_IMAGE_PREVIEW_MAX_EDGE;

    useEffect(() => {
        if (!storageKey) return;
        let canceled = false;
        // Small images deliberately have no thumbnail. Resolve them from storage,
        // without using a blob URL persisted by an earlier browser session.
        const request = useOriginal ? resolveImageUrl(storageKey) : ensureImagePreview(storageKey);
        void request.then((url) => {
            if (!canceled && useOriginal) setOriginal({ key: storageKey, url: url || "" });
        }).catch(() => undefined);
        return () => { canceled = true; };
    }, [storageKey, useOriginal]);

    const content = cover?.content;
    const source = storageKey
        ? previewUrlFor(storageKey) || (useOriginal && original?.key === storageKey ? original.url : undefined)
        : content && !content.startsWith("blob:") ? content : undefined;

    return { source: source !== failedSource ? source : undefined, onError: () => setFailedSource(source) };
}
