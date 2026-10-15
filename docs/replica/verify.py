"""Verify the original site in a new browser context, without AI credentials.

Requires Python, playwright, and Chrome. Start the Vite server first.
Optional --proxy applies only to this browser and bypasses the local server.
"""

import argparse
import base64
import hashlib
import json
import re
import subprocess
import tempfile
import zipfile
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument("--base-url", default="http://127.0.0.1:3036")
parser.add_argument("--reference-url")
parser.add_argument("--proxy")
args = parser.parse_args()
root = Path(__file__).resolve().parent
repo = root.parents[1]
base = args.base_url.rstrip("/")
baseline = "3a6b64b602ad062b29fac66902ed18a7ef5fd9dc"
checks, errors, ai_requests = [], [], []
report = {
    "upstream_commit": baseline,
    "base_url": base,
    "browser": "Chrome, isolated context",
    "checks": checks,
    "page_errors": errors,
    "ai_requests": ai_requests,
    "limits": [
        "No paid AI generation or real API credentials used.",
        "No production deployment, Docker, Agent, WebDAV, or remote plugin execution tested.",
        "Visual comparison covers the desktop homepage header and hero, not every application state.",
    ],
}


def screenshot(page, name):
    page.screenshot(path=str(root / name), animations="disabled")


def no_overflow(page):
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), page.url


with sync_playwright() as p:
    options = {"channel": "chrome", "headless": True}
    if args.proxy:
        options["proxy"] = {"server": args.proxy, "bypass": "127.0.0.1,localhost"}
    browser = p.chromium.launch(**options)
    context = browser.new_context(viewport={"width": 1440, "height": 1000}, locale="zh-CN", reduced_motion="reduce")
    page = context.new_page()
    page.on("pageerror", lambda error: errors.append(str(error)))

    def block_ai(route):
        ai_requests.append({"method": route.request.method, "url": route.request.url})
        route.abort()

    context.route("**/v1/**", block_ai)
    try:
        web_tree = subprocess.check_output(["git", "rev-parse", "HEAD:web"], cwd=repo, text=True).strip()
        original_tree = subprocess.check_output(["git", "rev-parse", baseline + ":web"], cwd=repo, text=True).strip()
        assert web_tree == original_tree
        subprocess.run(["git", "diff", "--exit-code", baseline, "--", "web", "canvas-agent", "canvas-proxy", "plugins", "LICENSE", "VERSION"], cwd=repo, check=True)
        report["web_tree"] = web_tree
        checks.append("Application source, assets, plugins, version, and license match upstream.")

        page.goto(base, wait_until="networkidle")
        expect(page.get_by_role("heading", name="无限画布", exact=True)).to_be_visible()
        expect(page.get_by_role("button", name="打开画布", exact=True)).to_be_visible()
        page.locator("main img").first.wait_for(state="visible")
        no_overflow(page)
        screenshot(page, "home-dark.png")
        checks.append("Original desktop homepage and navigation render.")

        if args.reference_url:
            region = {"x": 0, "y": 0, "width": 1440, "height": 825}
            local_hero = page.screenshot(clip=region, animations="disabled")
            reference_context = browser.new_context(viewport={"width": 1440, "height": 1000}, locale="zh-CN", reduced_motion="reduce")
            reference = reference_context.new_page()
            reference.goto(args.reference_url, wait_until="networkidle")
            reference.locator("main img").first.wait_for(state="visible")
            screenshot(reference, "reference-home.png")
            reference_hero = reference.screenshot(clip=region, animations="disabled")
            report["homepage_visual_comparison"] = {
                "reference_url": args.reference_url,
                "region": region,
                "local_png_sha256": hashlib.sha256(local_hero).hexdigest(),
                "reference_png_sha256": hashlib.sha256(reference_hero).hexdigest(),
                "identical": local_hero == reference_hero,
            }
            report["homepage_visual_comparison"].update(page.evaluate("""async ([left, right]) => {
                const decode = async data => {
                    const image = new Image();
                    image.src = 'data:image/png;base64,' + data;
                    await image.decode();
                    const canvas = document.createElement('canvas');
                    canvas.width = image.width; canvas.height = image.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(image, 0, 0);
                    return ctx.getImageData(0, 0, image.width, image.height).data;
                };
                const [a, b] = await Promise.all([decode(left), decode(right)]);
                let different = 0, significant = 0;
                for (let i = 0; i < a.length; i += 4) {
                    const delta = Math.max(...[0, 1, 2].map(c => Math.abs(a[i+c] - b[i+c])));
                    if (delta > 0) different++;
                    if (delta > 20) significant++;
                }
                return {different_pixels: different, pixels_with_channel_delta_over_20: significant, total_pixels: a.length / 4};
            }""", [base64.b64encode(local_hero).decode(), base64.b64encode(reference_hero).decode()]))
            reference_context.close()

        page.get_by_role("button", name="切换到浅色主题", exact=True).click()
        expect(page.locator("html")).not_to_have_class(re.compile(r"\bdark\b"))
        screenshot(page, "home-light.png")
        page.reload(wait_until="networkidle")
        expect(page.locator("html")).not_to_have_class(re.compile(r"\bdark\b"))
        checks.append("Theme switches and persists across reload.")
        page.get_by_role("button", name="切换到深色主题", exact=True).click()

        page.get_by_role("button", name="打开画布", exact=True).click()
        page.get_by_role("button", name="新建画布", exact=True).first.click()
        page.wait_for_url("**/canvas/*")
        expect(page.locator("[data-node-id]")).to_have_count(0)
        project_url = page.url
        page.get_by_role("button", name="文本", exact=True).click()
        node = page.locator("[data-node-id]")
        expect(node).to_have_count(1)
        page.get_by_text("双击编辑文字", exact=True).dblclick()
        node.locator("textarea").fill("原版画布验收：编辑、拖动、撤销和本地保存。")
        node.locator("textarea").press("Escape")
        page.mouse.click(420, 180)
        expect(node).to_contain_text("原版画布验收")
        before = node.bounding_box()
        page.mouse.move(before["x"] + 80, before["y"] + 80)
        page.mouse.down()
        page.mouse.move(before["x"] + 165, before["y"] + 5, steps=12)
        page.mouse.up()
        page.wait_for_function("x => document.querySelector('[data-node-id]').getBoundingClientRect().x > x + 50", arg=before["x"])
        moved_style = node.get_attribute("style")
        # Upstream batches history with a 180 ms debounce; allow that commit to finish.
        page.wait_for_timeout(250)
        page.get_by_role("button", name="撤销", exact=True).click()
        page.wait_for_function("x => Math.abs(document.querySelector('[data-node-id]').getBoundingClientRect().x - x) < 2", arg=before["x"])
        page.get_by_role("button", name="重做", exact=True).click()
        expect(node).to_have_attribute("style", moved_style)
        zoom = page.get_by_role("slider", name="放大/缩小画布")
        previous_zoom = zoom.input_value()
        zoom.focus()
        zoom.press("ArrowRight")
        assert zoom.input_value() != previous_zoom
        page.get_by_role("button", name="重置视图", exact=True).click()
        page.reload(wait_until="networkidle")
        expect(page.locator("[data-node-id]")).to_contain_text("原版画布验收")
        assert page.url == project_url
        screenshot(page, "canvas-desktop.png")
        checks.append("Canvas creation, text editing, dragging, undo/redo, zoom, and reload persistence pass.")

        page.get_by_role("button", name="打开画布菜单", exact=True).click()
        with page.expect_download() as download_event:
            page.get_by_role("menuitem", name="导出当前画布").click()
        with tempfile.TemporaryDirectory() as folder:
            exported_path = Path(folder) / "canvas.zip"
            download_event.value.save_as(exported_path)
            with zipfile.ZipFile(exported_path) as archive:
                data = json.loads(archive.read("projects.json"))
                assert data["projects"][0]["project"]["nodes"][0]["metadata"]["content"].startswith("原版画布验收")
        checks.append("Canvas export downloads a valid ZIP containing edited node content.")

        page.goto(base + "/image", wait_until="networkidle")
        expect(page.get_by_role("button", name="开始生成", exact=True)).to_be_disabled()
        screenshot(page, "image-desktop.png")
        page.get_by_placeholder("描述画面主体、风格、构图、光线和用途").fill("一张蓝色花瓶的产品照片")
        page.get_by_role("button", name="开始生成", exact=True).click()
        expect(page.get_by_role("dialog")).to_be_visible()
        expect(page.get_by_role("dialog")).to_contain_text("API Key")
        assert not ai_requests
        checks.append("Empty prompt disables generation; missing credentials open settings without an AI request.")

        for path, heading in [("video", "视频创作台"), ("assets", "我的资产"), ("prompts", "提示词中心")]:
            page.goto(base + "/" + path, wait_until="networkidle")
            expect(page.get_by_role("heading", name=heading, exact=True)).to_be_visible()
            no_overflow(page)
        checks.append("Video workbench, assets, and prompt-library routes render.")

        page.set_viewport_size({"width": 390, "height": 844})
        for path, filename in [("", "home-mobile.png"), ("image", "image-mobile.png")]:
            page.goto(base + "/" + path, wait_until="networkidle")
            no_overflow(page)
            screenshot(page, filename)
        checks.append("Homepage and image workbench render at 390 px without document overflow.")
        assert not errors, errors
        checks.append("No uncaught browser runtime errors during these checks.")
        report["status"] = "passed"
    except Exception as error:
        report["status"] = "failed"
        report["failure"] = str(error)
        screenshot(page, "failure.png")
        raise
    finally:
        (root / "verification.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        browser.close()

print(json.dumps(report, ensure_ascii=False, indent=2))
