from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:5173')

        page.evaluate("""async () => {
            localStorage.setItem('tt_jwt', 'fake_jwt_for_test');
            localStorage.setItem('tt_user', JSON.stringify({id: 1, username: 'TestUser'}));
        }""")
        page.reload()
        time.sleep(1)

        page.evaluate("""async () => {
            const module = await import('/src/game/state.js');
            module.state.showDevOptions = true;
            module.state.showArchitectureMap = true;
        }""")
        time.sleep(2)

        page.screenshot(path='/home/jules/verification/architecture_map.png')

        # Close Map
        page.locator('button', has_text='Fermer').click()
        time.sleep(1)

        page.evaluate("""async () => {
            const module = await import('/src/game/state.js');
            module.state.showDevTestPage = true;
        }""")
        time.sleep(1)

        # Click a route
        page.locator('button', has_text='Get Current User').click()
        time.sleep(1)

        page.screenshot(path='/home/jules/verification/api_tester.png')

        browser.close()

if __name__ == '__main__':
    run()
