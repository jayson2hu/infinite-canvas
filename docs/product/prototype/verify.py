"""Verify the standalone product prototype; no provider, email, or payment calls."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

root = Path(__file__).resolve().parent
screenshots = root / "screenshots"
screenshots.mkdir(exist_ok=True)
checks = []

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True, channel=os.environ.get("PROTOTYPE_BROWSER_CHANNEL"))
    page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto((root / "index.html").as_uri())
    page.wait_for_load_state("networkidle")
    canvas_bounds = page.locator(".board-viewport").bounding_box()
    composer_bounds = page.locator(".composer").bounding_box()
    assert composer_bounds["x"] >= canvas_bounds["x"] + canvas_bounds["width"] - 1
    checks.append("Desktop generation settings appear beside the canvas")
    page.screenshot(path=str(screenshots / "workspace-desktop.png"), full_page=True)

    page.locator("#generate").click()
    expect(page.locator("#generate")).to_be_disabled()
    expect(page.locator("#held-cost")).to_have_text("12")
    expect(page.locator("[data-balance]").first).to_have_text("108")
    page.locator("#complete-task").click()
    expect(page.locator("[data-balance]").first).to_have_text("108")
    expect(page.locator("#spent-balance")).to_have_text("12")
    expect(page.locator("#frozen-balance")).to_have_text("0")
    checks.append("Successful task freezes once and settles without a second deduction")

    page.locator("#generate").click()
    page.locator("#fail-task").click()
    expect(page.locator("[data-balance]").first).to_have_text("108")
    expect(page.locator("#spent-balance")).to_have_text("12")
    expect(page.locator("#frozen-balance")).to_have_text("0")
    checks.append("Failed task restores all frozen points")

    page.locator(".nav-item[data-page=wallet]").click()
    expect(page.locator("#ledger tr")).to_have_count(5)
    page.screenshot(path=str(screenshots / "wallet-desktop.png"), full_page=True)
    page.locator(".recharge").first.click()
    expect(page.locator("#toast")).to_contain_text("不会创建订单或收取费用")
    expect(page.locator("[data-balance]").first).to_have_text("108")
    checks.append("Recharge remains explicitly unconnected and does not create credits")

    page.locator(".nav-item[data-page=workspace]").click()
    page.locator("#quality").select_option("24")
    page.locator("#quantity").select_option("4")
    expect(page.locator("#quote")).to_have_text("96")
    page.locator("#generate").click()
    page.locator("#complete-task").click()
    expect(page.locator("[data-balance]").first).to_have_text("12")
    page.locator("#generate").click()
    expect(page.locator("#generation-notice")).to_contain_text("可用积分不足")
    expect(page.locator("#task-status")).to_be_hidden()
    checks.append("Quantity and quality update the quote; insufficient funds reject the task")

    page.locator("#open-register").click()
    page.locator("#email").fill("creator@example.com")
    page.locator("#consent").check()
    page.locator("#register-submit").click()
    page.locator("#verification-code").fill("111111")
    page.locator("#register-submit").click()
    expect(page.locator("#register-error")).to_contain_text("验证码不正确")
    page.locator("#email").fill("another@example.com")
    expect(page.locator("#verification-fields")).to_be_hidden()
    page.locator("#register-submit").click()
    page.locator("#verification-code").fill("246810")
    page.locator("#register-submit").click()
    expect(page.locator("#register-success")).to_be_visible()
    expect(page.locator("[data-balance]").first).to_have_text("12")
    page.locator("#enter-workspace").click()
    checks.append("Registration demo rejects wrong codes, resets after email changes, and grants no real account or points")

    page.reload()
    page.wait_for_load_state("networkidle")
    expect(page.locator("[data-balance]").first).to_have_text("120")
    page.set_viewport_size({"width":390,"height":844})
    for name in ["workspace", "wallet", "roadmap"]:
        page.locator(f".nav-item[data-page={name}]").click()
        assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"), name
        page.screenshot(path=str(screenshots / f"{name}-mobile.png"), full_page=True)
    page.locator("#open-register").click()
    page.screenshot(path=str(screenshots / "registration-mobile.png"))
    page.keyboard.press("Escape")
    expect(page.locator("#register-dialog")).not_to_be_visible()
    checks.append("All three mobile pages avoid page overflow; dialog closes with Escape")
    assert not errors, errors
    checks.append("No browser runtime errors during the tested flows")
    browser.close()

report = {"scope":"Static prototype only; no production service verification", "passed":checks, "browser_errors":errors}
(root / "verification.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(report, ensure_ascii=False))
