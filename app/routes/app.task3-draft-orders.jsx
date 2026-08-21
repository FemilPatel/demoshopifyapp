import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * TASK 3: Quick Draft Order Creator
 * 
 * Requirements:
 * 1. Form to select product variant + quantity + enter customer email.
 * 2. On Submit:
 *    - Create a Draft Order using Admin API (draftOrderCreate).
 *    - If subtotal > $100 -> apply 10% discount.
 *    - Return and display draft order invoice URL.
 * 3. Display created draft order details on page.
 */

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  // Fetch available products & variants for selector
  const response = await admin.graphql(
    `#graphql
    query getProductsForDraftOrders {
      products(first: 10) {
        nodes {
          id
          title
          variants(first: 5) {
            nodes {
              id
              title
              price
            }
          }
        }
      }
    }`
  );

  const data = await response.json();
  const products = data?.data?.products?.nodes || [];

  return { products };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const variantId = formData.get("variantId");
  const quantity = parseInt(formData.get("quantity"), 10);
  const email = formData.get("email");
  const price = parseFloat(formData.get("price") || "0");

  if (!variantId || !email || isNaN(quantity) || quantity <= 0) {
    return { success: false, error: "Please select a variant, enter a valid email, and enter a quantity >= 1." };
  }

  const estimatedSubtotal = price * quantity;
  const isDiscountEligible = estimatedSubtotal > 100;

  // Build DraftOrderInput payload
  const draftOrderInput = {
    email: email,
    lineItems: [
      {
        variantId: variantId,
        quantity: quantity,
      },
    ],
  };

  if (isDiscountEligible) {
    draftOrderInput.appliedDiscount = {
      title: "10% Order Discount (Subtotal > $100)",
      value: 10.0,
      valueType: "PERCENTAGE",
    };
  }

  const response = await admin.graphql(
    `#graphql
    mutation createDraftOrder($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          name
          invoiceUrl
          totalPrice
          subtotalPrice
          appliedDiscount {
            title
            value
            valueType
            amountSet {
              shopMoney {
                amount
                currencyCode
              }
            }
          }
          customer {
            email
          }
        }
        userErrors {
          field
          message
        }
      }
    }`,
    {
      variables: {
        input: draftOrderInput,
      },
    }
  );

  const data = await response.json();
  const userErrors = data?.data?.draftOrderCreate?.userErrors || [];

  if (userErrors.length > 0) {
    return { success: false, error: userErrors.map((e) => e.message).join(", ") };
  }

  const draftOrder = data?.data?.draftOrderCreate?.draftOrder;

  return {
    success: true,
    draftOrder,
    discountApplied: isDiscountEligible,
  };
};

export default function DraftOrderCreatorTask() {
  const { products } = useLoaderData();
  const fetcher = useFetcher();

  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedVariantPrice, setSelectedVariantPrice] = useState("0");
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState("");

  const allVariants = products.flatMap((p) =>
    p.variants.nodes.map((v) => ({
      variantId: v.id,
      label: `${p.title} - ${v.title} ($${v.price})`,
      price: v.price,
    }))
  );

  const handleVariantChange = (e) => {
    const vId = e.target.value;
    setSelectedVariantId(vId);
    const found = allVariants.find((v) => v.variantId === vId);
    setSelectedVariantPrice(found ? found.price : "0");
  };

  const estimatedTotal = (parseFloat(selectedVariantPrice || "0") * quantity).toFixed(2);
  const willGetDiscount = parseFloat(estimatedTotal) > 100;
  const isSubmitting = fetcher.state !== "idle";

  return (
    <s-page heading="Task 3: Quick Draft Order Creator">
      <s-section heading="Create Draft Order with Auto-Discount">
        <s-paragraph>
          Create custom draft orders for customers. If order subtotal exceeds $100, a 10% discount will automatically be applied.
        </s-paragraph>

        {/* Feedback Messages */}
        {fetcher.data?.error && (
          <s-box padding="base" margin-block-end="base" background="critical-subdued" borderRadius="base">
            <s-text color="critical" weight="bold">✗ Error: {fetcher.data.error}</s-text>
          </s-box>
        )}

        {/* Result Card */}
        {fetcher.data?.success && fetcher.data.draftOrder && (
          <s-box padding="base" margin-block-end="base" background="success-subdued" borderRadius="base" borderWidth="base">
            <s-heading level="2">🎉 Draft Order Created: {fetcher.data.draftOrder.name}</s-heading>
            <div style={{ marginTop: "12px", fontSize: "14px", lineHeight: "1.6" }}>
              <p><strong>Customer:</strong> {fetcher.data.draftOrder.customer?.email || email}</p>
              <p><strong>Subtotal Price:</strong> ${fetcher.data.draftOrder.subtotalPrice}</p>
              {fetcher.data.discountApplied && (
                <p style={{ color: "#116f3c", fontWeight: "bold" }}>
                  ✓ 10% Discount Applied! (${fetcher.data.draftOrder.appliedDiscount?.amountSet?.shopMoney?.amount || "Discounted"})
                </p>
              )}
              <p><strong>Total Price:</strong> ${fetcher.data.draftOrder.totalPrice}</p>
              
              <div style={{ marginTop: "16px" }}>
                <a
                  href={fetcher.data.draftOrder.invoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "10px 18px",
                    backgroundColor: "#008060",
                    color: "#fff",
                    textDecoration: "none",
                    borderRadius: "6px",
                    fontWeight: "bold",
                  }}
                >
                  🔗 View & Pay Invoice
                </a>
              </div>
            </div>
          </s-box>
        )}

        {/* Draft Order Form */}
        <fetcher.Form method="post" style={{ maxWidth: "560px", marginTop: "16px" }}>
          <input type="hidden" name="price" value={selectedVariantPrice} />

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "14px" }}>
              Select Product Variant:
            </label>
            <select
              name="variantId"
              value={selectedVariantId}
              onChange={handleVariantChange}
              required
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                fontSize: "14px",
              }}
            >
              <option value="">-- Choose a product variant --</option>
              {allVariants.map((v) => (
                <option key={v.variantId} value={v.variantId}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "14px" }}>
              Quantity:
            </label>
            <input
              type="number"
              name="quantity"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              required
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                fontSize: "14px",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "14px" }}>
              Customer Email:
            </label>
            <input
              type="email"
              name="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                fontSize: "14px",
              }}
            />
          </div>

          {/* Subtotal Calculation Box */}
          <s-box padding="base" margin-block-end="base" background="subdued" borderRadius="base">
            <s-text size="small" color="subdued">Estimated Order Subtotal:</s-text>
            <div style={{ fontSize: "20px", fontWeight: "bold", marginTop: "4px" }}>
              ${estimatedTotal}
            </div>
            {willGetDiscount ? (
              <s-text color="success" size="small" weight="bold">
                🎉 Eligible for 10% Discount (Subtotal &gt; $100)!
              </s-text>
            ) : (
              <s-text color="subdued" size="small">
                Add ${(100.01 - parseFloat(estimatedTotal)).toFixed(2)} more to unlock 10% discount.
              </s-text>
            )}
          </s-box>

          <s-button
            type="submit"
            variant="primary"
            {...(isSubmitting ? { loading: true } : {})}
          >
            Create Draft Order &amp; Generate Invoice
          </s-button>
        </fetcher.Form>
      </s-section>
    </s-page>
  );
}
