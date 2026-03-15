from playwright.sync_api import sync_playwright
import json

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Mocking Strapi API
    def handle_route_auth(route):
        route.fulfill(status=200, json={"jwt": "fake_token", "user": {"id": 1, "username": "Super Admin", "role": {"type": "admin"}}})

    def handle_route_cards(route):
        route.fulfill(status=200, json={"data": [{"id": 1, "attributes": {"name": "Test Card", "rarity": "Legendary", "image": {"url": "/test.png"}}}]})

    def handle_route_foil(route):
        if route.request.method == 'GET':
            route.fulfill(status=200, json={"data": []})
        else:
            route.fulfill(status=200, json={"data": {"id": 1}})

    page.route("**/api/auth/local", handle_route_auth)
    page.route("**/api/cards*", handle_route_cards)
    page.route("**/api/foil-effects*", handle_route_foil)

    # Set auth in local storage
    page.goto('http://localhost:5174/')
    page.evaluate("localStorage.setItem('bo_jwt', 'fake_token')")
    page.evaluate("localStorage.setItem('bo_user', JSON.stringify({id: 1, username: 'Super Admin'}))")

    # Go to foil editor
    page.goto('http://localhost:5174/foil-editor')
    page.wait_for_timeout(2000)

    # Check if cards are loaded
    options = page.locator('select option').all_inner_texts()
    print(f"Card options: {len(options)}")

    # Select first available card
    if len(options) > 1:
        page.select_option('select', index=1)
        page.wait_for_timeout(1000)

        # Click save
        page.locator('button:has-text("Sauvegarder l\'effet")').click(force=True)
        page.wait_for_timeout(1000)

    page.screenshot(path='foil_editor.png')
    browser.close()
