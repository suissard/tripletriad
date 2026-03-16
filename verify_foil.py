import time
from playwright.sync_api import sync_playwright

def verify_foil():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1280, 'height': 800})

        # Mock APIs to prevent 'Failed to fetch' errors
        page.route("**/api/users/me?populate=role", lambda route: route.fulfill(
            status=200,
            json={"id": 1, "username": "admin", "role": {"name": "Administrator"}}
        ))
        page.route("**/api/game-config?populate=*", lambda route: route.fulfill(
            status=200,
            json={"data": {"id": 1, "attributes": {"theme": "dark"}}}
        ))
        page.route("**/api/cards?populate=*", lambda route: route.fulfill(
            status=200,
            json={"data": [
                {"id": 1, "documentId": "card1", "name": "Test Card 1", "image": {"url": "/uploads/test.png"}}
            ]}
        ))

        # Go to base URL, set token, then navigate
        page.goto("http://localhost:5173/")
        page.evaluate("localStorage.setItem('bo_jwt', 'fake-token-123');")
        page.evaluate("localStorage.setItem('bo_user', JSON.stringify({id: 1, username: 'admin'}));")

        page.goto("http://localhost:5173/admin/foil-editor")

        # Wait for the UI to load
        page.wait_for_selector("text=HOLOEDITOR", timeout=5000)

        # Take a screenshot
        page.screenshot(path="/home/jules/verification/foil_editor.png")
        print("Screenshot saved to /home/jules/verification/foil_editor.png")
        browser.close()

if __name__ == "__main__":
    verify_foil()
