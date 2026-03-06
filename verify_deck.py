from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Go to front-end dev server
        page.goto("http://localhost:5173/")

        # Wait a moment for vue to mount
        page.wait_for_timeout(1000)

        # Open right drawer
        drawer_btn = page.locator('.right-drawer-btn')
        if drawer_btn.is_visible():
            drawer_btn.click()
            page.wait_for_timeout(500)

        # Go to Decks tab
        decks_tab = page.locator('button.nav-btn', has_text="Decks")
        if decks_tab.is_visible():
            decks_tab.click()
            page.wait_for_timeout(500)

        # Click new deck
        new_deck_btn = page.locator('button.add-deck-btn')
        if new_deck_btn.is_visible():
            new_deck_btn.click()
            page.wait_for_timeout(500)

        # We should now see the deck builder with Cover buttons
        page.screenshot(path="deck_verification.png")
        print("Screenshot taken")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
