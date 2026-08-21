import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

/**
 * TASK 2 Dashboard: Order Counter App
 * 
 * Requirements:
 * Show a simple dashboard page that displays:
 * 1. Total number of orders processed by the app / store.
 * 2. List of recent customers with their order count (custom.total_orders metafield).
 */

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  let totalOrdersProcessed = 0;
  let customers = [];
  let errorMsg = null;

  try {
    const response = await admin.graphql(
      `#graphql
      query getDashboardData {
        ordersCount {
          count
        }
        customers(first: 20) {
          nodes {
            id
            displayName
            email
            ordersCount
            metafield(namespace: "custom", key: "total_orders") {
              value
            }
          }
        }
      }`
    );

    const data = await response.json();
    totalOrdersProcessed = data?.data?.ordersCount?.count || 0;
    customers = data?.data?.customers?.nodes || [];
  } catch (err) {
    console.error("[Task 2 Loader Error]", err);
    errorMsg = err.message || "Failed to load dashboard data. Ensure scopes are updated.";
  }

  return { totalOrdersProcessed, customers, loaderError: errorMsg };
};

export default function OrderCounterDashboard() {
  const { totalOrdersProcessed, customers, loaderError } = useLoaderData();

  return (
    <s-page heading="Task 2: Order Counter Dashboard">
      <s-section heading="Order & Metafield Statistics">
        <s-paragraph>
          Real-time view of processed orders and customer order tracking metafields (`custom.total_orders`).
        </s-paragraph>

        {loaderError && (
          <s-box padding="base" margin-block-end="base" background="critical-subdued" borderRadius="base">
            <s-text color="critical" weight="bold">⚠️ {loaderError}</s-text>
          </s-box>
        )}

        {/* Key Metrics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <s-box padding="base" background="subdued" borderRadius="base" borderWidth="base">
            <s-text color="subdued" size="small">Total Orders in Store</s-text>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#008060", marginTop: "8px" }}>
              {totalOrdersProcessed}
            </div>
          </s-box>

          <s-box padding="base" background="subdued" borderRadius="base" borderWidth="base">
            <s-text color="subdued" size="small">Tracked Customers</s-text>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#202223", marginTop: "8px" }}>
              {customers.length}
            </div>
          </s-box>
        </div>

        {/* Customer List Table */}
        <s-heading level="2">Recent Customers & Order Count Metafield</s-heading>
        {customers.length === 0 ? (
          <s-box padding="base">
            <s-paragraph>No customer records found in store.</s-paragraph>
          </s-box>
        ) : (
          <div style={{ overflowX: "auto", marginTop: "16px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e1e3e5", backgroundColor: "#f6f6f7" }}>
                  <th style={{ padding: "12px" }}>Customer Name</th>
                  <th style={{ padding: "12px" }}>Email</th>
                  <th style={{ padding: "12px" }}>Native Orders Count</th>
                  <th style={{ padding: "12px" }}>Metafield (`custom.total_orders`)</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust) => {
                  const metafieldValue = cust.metafield?.value ?? "Not Set";
                  return (
                    <tr key={cust.id} style={{ borderBottom: "1px solid #e1e3e5" }}>
                      <td style={{ padding: "12px", fontWeight: "600" }}>{cust.displayName || "N/A"}</td>
                      <td style={{ padding: "12px" }}>{cust.email || "No email"}</td>
                      <td style={{ padding: "12px" }}>{cust.ordersCount} orders</td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            backgroundColor: cust.metafield ? "#e4f5e9" : "#f4f6f8",
                            color: cust.metafield ? "#116f3c" : "#6d7175",
                            fontWeight: "bold",
                            fontSize: "13px",
                          }}
                        >
                          {metafieldValue}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </s-section>
    </s-page>
  );
}
