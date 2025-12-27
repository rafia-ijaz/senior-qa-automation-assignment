import { test, expect } from '@playwright/test';
import { readJsonFile } from '../utils/data';
import { buildUniqueEmail } from '../utils/email';
import { HomePage } from '../pages/HomePage';
import { SearchResultsPage } from '../pages/SearchResultsPage';
import { ProductPage } from '../pages/ProductPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage, type BillingData } from '../pages/CheckoutPage';
import { OrderConfirmationPage } from '../pages/OrderConfirmationPage';

type OrderData = {
  billing: Omit<BillingData, 'email'> & { emailPrefix: string };
  shipping: { sameAsBilling: boolean };
  products: Array<{ name: string; quantity: number }>;
  shippingMethodContains: string;
  paymentMethodContains: string;
};

test('Place order with multiple products (price calculation checks)', async ({ page }) => {
  const data = readJsonFile<OrderData>('src/test_data/orderData.json');
  const uniqueEmail = buildUniqueEmail(data.billing.emailPrefix);

  const home = new HomePage(page);
  const results = new SearchResultsPage(page);
  const product = new ProductPage(page);
  const cart = new CartPage(page);
  const checkout = new CheckoutPage(page);
  const confirmation = new OrderConfirmationPage(page);

  await home.goto();

  for (let i = 0; i < data.products.length; i++) {
    const { name } = data.products[i];
    await home.search(name);
    await results.openProductByName(name);
    await product.addToCart();

    // Keep going via the header search for the next product.
    await product.continueShoppingFromNotification();
  }

  await home.openCart();
  await cart.assertLoaded();

  for (const p of data.products) {
    await cart.setQuantity(p.name, p.quantity);
  }
  await cart.updateCart();

  await cart.assertLinePriceMath();
  await cart.assertSubtotalEqualsSumOfLines();

  await cart.acceptTerms();
  await cart.checkout();
  await checkout.checkoutAsGuest();
  await checkout.assertLoaded();

  await checkout.fillBillingAddress({
    firstName: data.billing.firstName,
    lastName: data.billing.lastName,
    email: uniqueEmail,
    company: data.billing.company,
    country: data.billing.country,
    state: data.billing.state,
    city: data.billing.city,
    address1: data.billing.address1,
    address2: data.billing.address2,
    zip: data.billing.zip,
    phone: data.billing.phone,
    fax: data.billing.fax,
  });

  if (data.shipping.sameAsBilling) {
    await checkout.chooseShippingAddressSameAsBilling();
  }

  await checkout.chooseShippingMethod(data.shippingMethodContains);
  await checkout.choosePaymentMethod(data.paymentMethodContains);
  await checkout.continuePaymentInformation();

  const totals = await checkout.readOrderTotalBreakdownCents();
  expect(totals.total, 'Order total math: subtotal + shipping + tax').toBe(
    totals.subtotal + totals.shipping + totals.tax,
  );

  await checkout.confirmOrder();
  await confirmation.assertSuccess();
});
