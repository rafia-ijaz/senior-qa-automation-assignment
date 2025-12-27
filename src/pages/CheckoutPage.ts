import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { parseMoney } from '../utils/money';

export type BillingData = {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  country: string;
  state?: string;
  city: string;
  address1: string;
  address2?: string;
  zip: string;
  phone: string;
  fax?: string;
};

export class CheckoutPage extends BasePage {
  private readonly section: Locator;

  constructor(page: Page) {
    super(page);
    this.section = this.page.locator('.checkout-page');
  }

  async assertLoaded(): Promise<void> {
    const timeout = 20_000;
    const candidates = [
      this.page.locator('.checkout-as-guest-or-register-page'),
      this.page.locator('#checkout-step-billing'),
      this.page.locator('.checkout-page'),
    ];

    await Promise.any(candidates.map((c) => c.waitFor({ state: 'visible', timeout })));
  }

  async checkoutAsGuest(): Promise<void> {
    const guestButton = this.page.getByRole('button', { name: /checkout as guest/i });
    const visible = await guestButton.isVisible().catch(() => false);
    if (visible) {
      await guestButton.click();
    }

    await this.page
      .locator('#checkout-step-billing')
      .waitFor({ state: 'visible', timeout: 20_000 })
      .catch(() => undefined);
  }

  async fillBillingAddress(data: BillingData): Promise<void> {
    await this.page.locator('#BillingNewAddress_FirstName').fill(data.firstName);
    await this.page.locator('#BillingNewAddress_LastName').fill(data.lastName);
    await this.page.locator('#BillingNewAddress_Email').fill(data.email);

    if (data.company !== undefined) {
      await this.page.locator('#BillingNewAddress_Company').fill(data.company);
    }

    await this.page.locator('#BillingNewAddress_CountryId').selectOption({ label: data.country });

    const state = this.page.locator('#BillingNewAddress_StateProvinceId');
    if (data.state && (await state.isVisible().catch(() => false))) {
      await state.selectOption({ label: data.state });
    }

    await this.page.locator('#BillingNewAddress_City').fill(data.city);
    await this.page.locator('#BillingNewAddress_Address1').fill(data.address1);

    if (data.address2 !== undefined) {
      await this.page.locator('#BillingNewAddress_Address2').fill(data.address2);
    }

    await this.page.locator('#BillingNewAddress_ZipPostalCode').fill(data.zip);
    await this.page.locator('#BillingNewAddress_PhoneNumber').fill(data.phone);

    if (data.fax !== undefined) {
      await this.page.locator('#BillingNewAddress_FaxNumber').fill(data.fax);
    }

    await this.continueFromStep('billing');
  }

  async chooseShippingAddressSameAsBilling(): Promise<void> {
    const checkbox = this.page.getByRole('checkbox', { name: /ship to the same address/i });
    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.check();
    }
    await this.continueFromStep('shipping');
  }

  async chooseShippingMethod(containsText: string): Promise<void> {
    const options = this.page.locator('#checkout-step-shipping-method');
    await expect(options).toBeVisible();

    await options
      .locator('label')
      .filter({ hasText: new RegExp(containsText, 'i') })
      .first()
      .click();

    await this.continueFromStep('shipping-method');
  }

  async choosePaymentMethod(containsText: string): Promise<void> {
    const step = this.page.locator('#checkout-step-payment-method');
    await expect(step).toBeVisible();

    await step
      .locator('label')
      .filter({ hasText: new RegExp(containsText, 'i') })
      .first()
      .click();

    await this.continueFromStep('payment-method');
  }

  async continuePaymentInformation(): Promise<void> {
    await this.continueFromStep('payment-info');
  }

  async readOrderTotalBreakdownCents(): Promise<{ subtotal: number; shipping: number; tax: number; total: number }>{
    const totals = this.page.locator('.cart-total');
    await expect(totals).toBeVisible();

    const readRowCents = async (label: RegExp, required = true): Promise<number> => {
      const rows = totals.locator('tr').filter({ hasText: label });
      const count = await rows.count();
      if (count === 0) {
        if (required) {
          throw new Error(`Could not find totals row matching: ${label}`);
        }
        return 0;
      }

      const row = rows.first();

      const preferred = row.locator('.value-summary');
      if ((await preferred.count()) > 0) {
        return parseMoney(((await preferred.first().innerText()) || '').trim()).cents;
      }

      const cells = row.locator('td');
      const lastCell = cells.last();
      return parseMoney(((await lastCell.innerText()) || '').trim()).cents;
    };

    const subtotal = await readRowCents(/sub-?total/i);
    const shipping = await readRowCents(/shipping/i, false);
    const tax = await readRowCents(/tax/i, false);
    const total = await readRowCents(/order total|\btotal\b/i);

    return {
      subtotal,
      shipping,
      tax,
      total,
    };
  }

  async confirmOrder(): Promise<void> {
    await this.page.getByRole('button', { name: /confirm/i }).click();
  }

  private async continueFromStep(stepKey: string): Promise<void> {
    const container = this.page.locator(`#checkout-step-${stepKey}`);
    await container.getByRole('button', { name: /continue/i }).click();
  }
}
