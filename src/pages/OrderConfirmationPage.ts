import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { parseMoney } from '../utils/money';

export class OrderConfirmationPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async assertSuccess(): Promise<void> {
    await expect(this.page.getByText('Your order has been successfully processed!', { exact: true })).toBeVisible();
  }

  async readOrderTotalCents(): Promise<number> {
    const totals = this.page.locator('.cart-total').first();
    await totals.waitFor({ state: 'visible', timeout: 15_000 });

    const preferred = totals.locator('tr.order-total .value-summary');
    if ((await preferred.count()) > 0) {
      return parseMoney(((await preferred.first().innerText()) || '').trim()).cents;
    }

    const row = totals.locator('tr').filter({ hasText: /order total|\btotal\b/i }).last();
    const value = row.locator('.value-summary, td').last();
    const text = ((await value.innerText()) || '').trim();
    return parseMoney(text).cents;
  }

  async continue(): Promise<void> {
    await this.page.getByRole('button', { name: /continue/i }).click();
  }
}
