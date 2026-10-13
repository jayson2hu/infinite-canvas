"""Real-app UX verification in a temporary browser profile; no paid AI calls."""
import json
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parent
base = "http://127.0.0.1:3033"
checks = []
errors = []
requests = []

def state(page):
    return page.evaluate("async () => (await import('/src/stores/canvas/use-canvas-store.ts')).useCanvasStore.getState().projects")

def wait_async(page, expression, arg=None):
    # This installed Playwright version treats an async wait_for_function result
    # as a truthy Promise. Evaluate it fully before checking the condition.
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        if page.evaluate(expression, arg):
            return
        page.wait_for_timeout(50)
    raise AssertionError("Asynchronous application condition did not complete")

def saved(page, project_id):
    wait_async(page, "async (id) => { const {localForageStorage:s}=await import('/src/lib/localforage-storage.ts'); const raw=await s.getItem('infinite-canvas:canvas_store'); return raw && JSON.parse(raw).state.projects.some(p=>p.id===id && p.nodes.length===2); }", project_id)

def home(page):
    page.goto(base)
    expect(page.locator("#project-name")).to_be_visible()
    expect(page.locator("button[type=submit]")).to_be_enabled()

def screenshot(page, name):
    page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
    page.evaluate("() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {})))")
    page.screenshot(path=str(root / name))

def create(page, name, goal, task="商品视觉"):
    home(page)
    page.get_by_role("group", name="创作任务类型").get_by_role("button", name=re.compile(task)).click()
    page.locator("#project-name").fill(name)
    page.locator("#project-goal").fill(goal)
    page.locator("button[type=submit]").click()
    page.wait_for_url(re.compile(r"/canvas/[^/?]+$"))
    page.wait_for_selector("[data-node-id]")
    project_id = page.url.rsplit("/", 1)[-1]
    saved(page, project_id)
    return project_id

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(channel="chrome", headless=True)
    context = browser.new_context(viewport={"width":1440,"height":1050}, reduced_motion="reduce", accept_downloads=True)
    context.set_default_timeout(10000)
    page = context.new_page()
    # Keep the test independent of prompt feeds, releases and third-party services.
    page.route("**/*", lambda route: route.continue_() if route.request.url.startswith((base, "data:", "blob:")) else route.abort())
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("request", lambda request: requests.append({"method":request.method,"url":request.url}))
    home(page)
    page.evaluate("async () => (await import('/src/stores/use-theme-store.ts')).useThemeStore.getState().setTheme('light')")
    expect(page.locator("html")).not_to_have_class(re.compile(r"dark"))
    assert page.locator("button[type=submit]").evaluate("e=>getComputedStyle(e).color!==getComputedStyle(e).backgroundColor")
    screenshot(page, "workbench-light.png")
    page.locator("button[type=submit]").click()
    expect(page.get_by_role("alert")).to_contain_text("起个名字")
    checks.append("Empty form gives an actionable error and the primary action remains legible")

    first = create(page, "青野咖啡上新", "保留牛皮纸包装，以自然光和绿色背景制作新品主图。")
    project = next(item for item in state(page) if item["id"] == first)
    assert len(project["nodes"]) == 2 and len(project["connections"]) == 1
    image_node = next(node for node in project["nodes"] if node["type"] == "image")
    assert image_node["metadata"]["status"] == "idle"
    assert "自然光" in image_node["metadata"]["prompt"]
    page.locator(f'[data-node-id="{image_node["id"]}"]').click(position={"x":100,"y":100})
    screenshot(page, "canvas-start.png")
    page.reload()
    page.wait_for_selector("[data-node-id]")
    restored = next(item for item in state(page) if item["id"] == first)
    assert len(restored["nodes"]) == 2 and len(restored["connections"]) == 1
    checks.append("Task creates a real brief, image draft and connection; all survive a reload")

    second = create(page, "周末散步封面", "城市散步主题，街角咖啡店和树影，给标题留下空间。", "内容封面")
    third = create(page, "秋日咖啡市集", "温暖的咖啡市集，预留日期与地点，清晰而有生活气息。", "活动配图")
    page.goto(base + "/canvas")
    expect(page.get_by_role("heading", name="我的项目", exact=True)).to_be_visible()
    wait_async(page, "async()=> (await import('/src/stores/canvas/use-canvas-store.ts')).useCanvasStore.getState().hydrated")
    expect(page.locator("article")).to_have_count(3)
    page.get_by_role("textbox", name="搜索项目名称").fill("不存在的名称")
    expect(page.get_by_role("heading", name="没有找到这个项目")).to_be_visible()
    page.get_by_role("button", name="清空搜索").click()
    expect(page.locator("article")).to_have_count(3)
    page.get_by_role("textbox", name="搜索项目名称").fill(" 青野 ")
    expect(page.locator("article")).to_have_count(1)
    page.get_by_role("textbox", name="搜索项目名称").fill("")
    page.get_by_role("combobox", name="项目排序").click()
    page.locator(".ant-select-item-option").filter(has_text="项目名称").click()
    names = page.evaluate("names=>[...names].sort((a,b)=>a.localeCompare(b))", ["青野咖啡上新", "周末散步封面", "秋日咖啡市集"])
    expect(page.locator("article h2")).to_have_text(names)
    checks.append("Project search, whitespace handling, no-result recovery and name sorting work")

    page.get_by_role("button", name="青野咖啡上新 的更多操作").click()
    page.get_by_role("menuitem", name="重命名", exact=True).click()
    page.get_by_role("textbox", name="重命名", exact=True).fill("青野咖啡 · 春季上新")
    page.get_by_role("textbox", name="重命名", exact=True).press("Enter")
    expect(page.get_by_role("heading", name="青野咖啡 · 春季上新", exact=True)).to_be_visible()
    page.locator("article input[type=checkbox]").first.check()
    expect(page.get_by_role("region", name="批量操作")).to_be_visible()
    page.get_by_role("button", name="取消选择", exact=True).click()
    expect(page.get_by_role("region", name="批量操作")).not_to_be_visible()
    page.get_by_role("button", name="更多项目操作", exact=True).click()
    page.get_by_role("menuitem", name="删除全部", exact=True).click()
    expect(page.get_by_role("dialog")).to_be_visible()
    page.get_by_role("dialog").get_by_role("button", name=re.compile(r"取\s*消")).click()
    expect(page.locator("article")).to_have_count(3)
    checks.append("Rename and bulk selection work; delete-all still requires confirmation and can be cancelled")

    page.get_by_role("button", name="青野咖啡 · 春季上新 的更多操作").click()
    with page.expect_download() as download_info:
        page.get_by_role("menuitem", name=re.compile("导出")).click()
    download = download_info.value
    assert download.suggested_filename.endswith(".zip")
    checks.append("Existing project export still produces a ZIP download")

    # A small, clearly labelled test asset exercises IndexedDB cover restoration.
    page.evaluate("""async id => {
      const {useCanvasStore}=await import('/src/stores/canvas/use-canvas-store.ts');
      const {uploadImage}=await import('/src/services/image-storage.ts');
      const canvas=document.createElement('canvas');canvas.width=640;canvas.height=400;
      const g=canvas.getContext('2d');g.fillStyle='#c2cbbd';g.fillRect(0,0,640,400);
      g.fillStyle='#e7dabe';g.fillRect(375,90,140,230);g.fillStyle='#355442';g.font='30px sans-serif';
      g.fillText('青野咖啡',50,115);g.font='16px sans-serif';g.fillText('本地预览测试素材',50,152);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      const image=await uploadImage(blob);const project=useCanvasStore.getState().openProject(id);
      useCanvasStore.getState().updateProject(id,{nodes:project.nodes.map(node=>node.type==='image'?{...node,metadata:{...node.metadata,status:'success',storageKey:image.storageKey,content:image.url,naturalWidth:640,naturalHeight:400}}:node)});
    }""", first)
    page.wait_for_function("()=>[...document.querySelectorAll('article img')].some(i=>i.complete&&i.naturalWidth===640)")
    wait_async(page, "async id=>{const {localForageStorage:s}=await import('/src/lib/localforage-storage.ts');const raw=await s.getItem('infinite-canvas:canvas_store');return raw&&JSON.parse(raw).state.projects.find(p=>p.id===id).nodes.some(n=>n.metadata?.storageKey)}", first)
    page.reload()
    page.wait_for_function("()=>[...document.querySelectorAll('article img')].some(i=>i.complete&&i.naturalWidth===640)")
    screenshot(page, "projects-light.png")
    home(page)
    expect(page.locator("#recent-projects-title")).to_be_visible()
    expect(page.locator("#recent-projects-title").locator("..").locator("..").get_by_role("button").nth(1)).to_contain_text("青野咖啡")
    page.wait_for_function("()=>[...document.querySelectorAll('main img')].some(i=>i.complete&&i.naturalWidth===640)")
    screenshot(page, "workbench-returning.png")
    checks.append("Small local image covers survive refresh, and most recently edited project appears first")

    page.get_by_role("button", name="切换到深色主题", exact=True).click()
    expect(page.locator("html")).to_have_class(re.compile(r"dark"))
    assert page.locator("button[type=submit]").evaluate("e=>getComputedStyle(e).color!==getComputedStyle(e).backgroundColor")
    screenshot(page, "workbench-dark.png")
    page.get_by_role("button", name="帮助与偏好", exact=True).click()
    page.get_by_role("button", name="切换到 English", exact=True).click()
    expect(page.get_by_role("heading", name="Creative workspace", exact=True)).to_be_visible()
    page.locator("h1").click()
    screenshot(page, "workbench-english.png")
    checks.append("Theme and language controls remain accessible and update the new workbench")

    page.evaluate("async()=>{(await import('/src/i18n/index.ts')).changeAppLocale('zh-CN');(await import('/src/stores/use-theme-store.ts')).useThemeStore.getState().setTheme('light')}")
    page.set_viewport_size({"width":390,"height":844})
    expect(page.get_by_role("heading", name="创作工作台", exact=True)).to_be_visible()
    assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
    screenshot(page, "workbench-mobile.png")
    page.locator("button[type=submit]").scroll_into_view_if_needed()
    expect(page.locator("#project-goal")).to_be_visible()
    assert page.locator("button[type=submit]").bounding_box()["width"] <= 390
    screenshot(page, "workbench-mobile-form.png")
    page.get_by_role("button", name="打开导航菜单", exact=True).click()
    drawer = page.get_by_role("dialog")
    expect(drawer.get_by_role("link", name="工作台", exact=True)).to_be_visible()
    drawer.get_by_role("link", name="我的项目", exact=True).click()
    expect(page.get_by_role("heading", name="我的项目", exact=True)).to_be_visible()
    assert page.evaluate("document.documentElement.scrollWidth<=innerWidth")
    expect(drawer).not_to_be_visible()
    screenshot(page, "projects-mobile.png")
    checks.append("Mobile workbench and project list fit the viewport; grouped navigation works")

    assert not errors, errors
    assert not [r for r in requests if r["method"] == "POST"], "Unexpected paid or mutating HTTP call"
    checks.append("No browser runtime errors or generation POST requests in the tested flow")
    browser.close()

report = {"scope":"Real local frontend; third-party services blocked; no email, payment or live AI verification", "passed":checks, "browser_errors":errors}
(root / "verification.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps(report,ensure_ascii=True))
