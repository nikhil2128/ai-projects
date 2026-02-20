import { expect, test } from '@playwright/test';

test('login redirects to feed and shows posts', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'token-1',
        user: { id: 1, username: 'alice', email: 'alice@example.com' },
      }),
    });
  });
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, username: 'alice', email: 'alice@example.com' }),
    });
  });
  await page.route('**/api/posts/feed?page=1', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        posts: [
          {
            id: 11,
            imageUrl: '/uploads/test.png',
            caption: 'E2E post',
            filter: 'none',
            userId: 2,
            user: { id: 2, username: 'bob', email: 'bob@example.com' },
            reactionCounts: {},
            userReactions: [],
            totalReactions: 0,
            createdAt: new Date().toISOString(),
          },
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      }),
    });
  });

  await page.goto('/login');
  await page.getByPlaceholder('Username').fill('alice');
  await page.getByPlaceholder('Password').fill('secret123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByText('E2E post')).toBeVisible();
});

test('create page redirects to login when unauthenticated', async ({ page }) => {
  await page.goto('/create');
  await expect(page).toHaveURL(/\/login$/);
});
