import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { parseMoney } from '../utils/money';

export type CartLine = {
  productName: string;
  unitPriceText: string;
  unitPriceCents: number;
  quantity: number;
  subtotalText: string;
  subtotalCents: number;
};

export class CartPage extends BasePage {
  private readonly table: Locator;

  constructor(page: Page) {
    super(page);
    this.table = this.page.locator('.cart');
  }

  async assertLoaded(): Promise<void> {
    await expect(this.page.getByRole('heading', { name: /shopping cart/i })).toBeVisible();
  }

  async setQuantity(productName: string, quantity: number): Promise<void> {
    const row = this.rowByProductName(productName);
    await row.locator('input.qty-input').fill(String(quantity));
  }

  async updateCart(): Promise<void> {
    await this.table.waitFor({ state: 'visible', timeout: 15_000 });

    const update = this.page.locator('input.update-cart-button[type="submit"], input[name="updatecart"]');
    await update.first().click({ timeout: 15_000 });
    await this.page.waitForLoadState('networkidle').catch(() => undefined);

    // Ensure totals have recalculated (especially important for WebKit).
    await expect
      .poll(async () => await this.readCartSubtotalCents(), { timeout: 15_000 })
      .toBeGreaterThan(0);
  }

  async readLines(): Promise<CartLine[]> {
    const rows = this.table.locator('tbody tr');
    const count = await rows.count();
    const lines: CartLine[] = [];

    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const productName = (await row.locator('a.product-name').innerText()).trim();
      const unitPriceText = (await row.locator('.unit-price').innerText()).trim();
      const qtyText = (await row.locator('input.qty-input').inputValue()).trim();
      const subtotalText = (await row.locator('.subtotal').innerText()).trim();

      const unitPrice = parseMoney(unitPriceText);
      const subtotal = parseMoney(subtotalText);

      lines.push({
        productName,
        unitPriceText,
        unitPriceCents: unitPrice.cents,
        quantity: Number.parseInt(qtyText, 10),
        subtotalText,
        subtotalCents: subtotal.cents,
      });
    }

    return lines;
  }

  async readCartSubtotalCents(): Promise<number> {
    const totals = this.page.locator('.cart-total');
    const subtotalRow = totals
      .locator('tr')
      .filter({ has: this.page.getByText(/sub-?total/i) })
      .first();

    const preferred = subtotalRow.locator('.cart-total-right .value-summary');
    if ((await preferred.count()) > 0) {
      const text = ((await preferred.first().innerText()) || '').trim();
      return parseMoney(text).cents;
    }

    const lastCell = subtotalRow.locator('td').last();
    const text = ((await lastCell.innerText()) || '').trim();
    return parseMoney(text).cents;
  }

  async acceptTerms(): Promise<void> {
    const checkbox = this.page.locator('#termsofservice');
    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.check();
      return;
    }

    await this.page.getByLabel(/terms of service/i).check();
  }

  async checkout(): Promise<void> {
    await this.page.getByRole('button', { name: /checkout/i }).click();
  }

  async assertLinePriceMath(): Promise<void> {
    const lines = await this.readLines();
    for (const line of lines) {
      expect.soft(line.subtotalCents, `Line subtotal for "${line.productName}"`).toBe(
        line.unitPriceCents * line.quantity,
      );
    }
  }

  async assertSubtotalEqualsSumOfLines(): Promise<void> {
    const lines = await this.readLines();
    const expected = lines.reduce((sum, l) => sum + l.subtotalCents, 0);
    const actual = await this.readCartSubtotalCents();
    expect(actual).toBe(expected);
  }

  private rowByProductName(productName: string): Locator {
    return this.table.locator('tbody tr').filter({ has: this.page.getByRole('link', { name: productName, exact: true }) });
  }
}
