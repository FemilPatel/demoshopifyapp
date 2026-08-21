import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * TASK 1: Simple Product Inventory Manager App
 * 
 * Requirements:
 * 1. Fetch first 20 products using GraphQL Admin API.
 * 2. Display Title, Price, Inventory Quantity.
 * 3. Add form/button next to each product to update inventory (increase/decrease by delta).
 * 4. Show success/error message.
 * 5. Bonus: Search by product title.
 */

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get("q") || "";

  let products = [];
  let location = null;
  let errorMsg = null;

  try {
    const response = await admin.graphql(
      `#graphql
      query getProductsWithInventory($query: String) {
        products(first: 20, query: $query) {
          nodes {
            id
            title
            featuredImage {
              url
            }
            variants(first: 5) {
              nodes {
                id
                title
                price
                inventoryQuantity
                inventoryItem {
                  id
                  tracked
                }
              }
            }
          }
        }
        locations(first: 1) {
          nodes {
            id
            name
          }
        }
      }`,
      {
        variables: {
          query: searchQuery ? `title:*${searchQuery}*` : null,
        },
      }
    );

    const data = await response.json();
    products = data?.data?.products?.nodes || [];
    location = data?.data?.locations?.nodes?.[0] || null;
  } catch (err) {
    console.error("[Task 1 Loader Error]", err);
    errorMsg = err.message || "Failed to load products/locations. Ensure scopes are updated.";
  }

  return { products, location, searchQuery, loaderError: errorMsg };
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const inventoryItemId = formData.get("inventoryItemId");
  const locationId = formData.get("locationId");
  const delta = parseInt(formData.get("delta"), 10);
  const currentQuantity = parseInt(formData.get("currentQuantity"), 10) || 0;

  if (!inventoryItemId || !locationId || isNaN(delta)) {
    return { success: false, error: "Missing required fields or invalid delta quantity." };
  }

  const targetQuantity = Math.max(0, currentQuantity + delta);

  const response = await admin.graphql(
    `#graphql
    mutation setInventory($input: InventorySetQuantitiesInput!) @idempotent {
      inventorySetQuantities(input: $input) {
        inventoryAdjustmentGroup {
          reason
          changes {
            name
            delta
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
        input: {
          reason: "correction",
          name: "available",
          quantities: [
            {
              inventoryItemId,
              locationId,
              quantity: targetQuantity,
              changeFromQuantity: currentQuantity,
            },
          ],
        },
      },
    }
  );

  const data = await response.json();
  const userErrors = data?.data?.inventorySetQuantities?.userErrors || [];

  if (userErrors.length > 0) {
    return { success: false, error: userErrors.map((e) => e.message).join(", ") };
  }

  return { success: true, message: `Successfully updated inventory to ${targetQuantity} units (${delta > 0 ? `+${delta}` : delta})!` };
};

export default function InventoryManagerTask() {
  const { products, location, searchQuery, loaderError } = useLoaderData();
  const fetcher = useFetcher();
  const [searchTerm, setSearchTerm] = useState(searchQuery || "");
  const [adjustAmounts, setAdjustAmounts] = useState({});

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const url = new URL(window.location.href);
    if (searchTerm) {
      url.searchParams.set("q", searchTerm);
    } else {
      url.searchParams.delete("q");
    }
    window.location.href = url.toString();
  };

  const handleAmountChange = (variantId, value) => {
    setAdjustAmounts((prev) => ({ ...prev, [variantId]: value }));
  };

  const isSubmitting = fetcher.state !== "idle";

  return (
    <s-page heading="Task 1: Simple Product Inventory Manager">
      <s-section heading="Product Inventory List">
        <s-paragraph>
          Search and update inventory quantities across your products using GraphQL Admin API.
        </s-paragraph>

        {loaderError && (
          <s-box padding="base" margin-block-end="base" background="critical-subdued" borderRadius="base">
            <s-text color="critical" weight="bold">⚠️ {loaderError}</s-text>
          </s-box>
        )}

        {/* Action Result Feedback */}
        {fetcher.data?.success && (
          <s-box padding="base" margin-block-end="base" background="success-subdued" borderRadius="base">
            <s-text color="success" weight="bold">✓ {fetcher.data.message}</s-text>
          </s-box>
        )}
        {fetcher.data?.error && (
          <s-box padding="base" margin-block-end="base" background="critical-subdued" borderRadius="base">
            <s-text color="critical" weight="bold">✗ Error: {fetcher.data.error}</s-text>
          </s-box>
        )}

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{ marginBottom: "20px" }}>
          <s-stack direction="inline" gap="base" align="center">
            <input
              type="text"
              placeholder="Search products by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                minWidth: "260px",
                fontSize: "14px",
              }}
            />
            <s-button type="submit" variant="primary">Search</s-button>
            {searchQuery && (
              <s-button
                type="button"
                onClick={() => (window.location.href = window.location.pathname)}
              >
                Clear
              </s-button>
            )}
          </s-stack>
        </form>

        {!location && (
          <s-box padding="base" background="warning-subdued" borderRadius="base">
            <s-text color="warning">Warning: No location found in Shopify store. Inventory update requires a location.</s-text>
          </s-box>
        )}

        {/* Product Table */}
        {products.length === 0 ? (
          <s-box padding="base">
            <s-paragraph>No products found.</s-paragraph>
          </s-box>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e1e3e5", backgroundColor: "#f6f6f7" }}>
                  <th style={{ padding: "12px" }}>Product</th>
                  <th style={{ padding: "12px" }}>Variant</th>
                  <th style={{ padding: "12px" }}>Price</th>
                  <th style={{ padding: "12px" }}>Current Stock</th>
                  <th style={{ padding: "12px" }}>Adjust Inventory</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) =>
                  product.variants.nodes.map((variant) => {
                    const amount = adjustAmounts[variant.id] ?? 1;
                    return (
                      <tr key={variant.id} style={{ borderBottom: "1px solid #e1e3e5" }}>
                        <td style={{ padding: "12px", fontWeight: "600" }}>
                          {product.title}
                        </td>
                        <td style={{ padding: "12px" }}>{variant.title}</td>
                        <td style={{ padding: "12px" }}>${variant.price}</td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              padding: "4px 8px",
                              borderRadius: "4px",
                              backgroundColor: variant.inventoryQuantity > 0 ? "#e4f5e9" : "#ffebe8",
                              color: variant.inventoryQuantity > 0 ? "#116f3c" : "#d72c0d",
                              fontWeight: "600",
                            }}
                          >
                            {variant.inventoryQuantity} units
                          </span>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <fetcher.Form method="post" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            <input type="hidden" name="inventoryItemId" value={variant.inventoryItem?.id || ""} />
                            <input type="hidden" name="locationId" value={location?.id || ""} />
                            <input type="hidden" name="currentQuantity" value={variant.inventoryQuantity ?? 0} />
                            
                            <input
                              type="number"
                              name="deltaInput"
                              value={amount}
                              onChange={(e) => handleAmountChange(variant.id, parseInt(e.target.value, 10) || 0)}
                              style={{ width: "60px", padding: "6px", borderRadius: "4px", border: "1px solid #ccc" }}
                            />

                            <button
                              type="submit"
                              name="delta"
                              value={amount}
                              disabled={isSubmitting || !location?.id}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#008060",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "13px",
                              }}
                            >
                              + Increase
                            </button>

                            <button
                              type="submit"
                              name="delta"
                              value={-Math.abs(amount)}
                              disabled={isSubmitting || !location?.id}
                              style={{
                                padding: "6px 12px",
                                backgroundColor: "#d72c0d",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "13px",
                              }}
                            >
                              - Decrease
                            </button>
                          </fetcher.Form>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </s-section>
    </s-page>
  );
}
