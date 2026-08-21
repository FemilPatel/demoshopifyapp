import { authenticate } from "../shopify.server";

/**
 * TASK 2: Webhook Endpoint - orders/create
 * 
 * Requirements:
 * 1. Register orders/create webhook.
 * 2. When a new order is created:
 *    - Extract customer ID.
 *    - Fetch current customer metafield custom.total_orders.
 *    - Increase custom.total_orders by 1 using GraphQL Admin API.
 */

export const action = async ({ request }) => {
  const { topic, shop, session, admin, payload } = await authenticate.webhook(request);

  console.log(`[Webhook Received] Topic: ${topic} for shop: ${shop}`);

  if (!payload || !payload.customer || !payload.customer.id) {
    console.log("[Webhook] No customer attached to this order. Skipping metafield update.");
    return new Response("No customer on order", { status: 200 });
  }

  const customerGid = `gid://shopify/Customer/${payload.customer.id}`;

  try {
    // 1. Fetch current custom.total_orders metafield for customer
    const customerResponse = await admin.graphql(
      `#graphql
      query getCustomerOrderCount($id: ID!) {
        customer(id: $id) {
          id
          email
          firstName
          lastName
          metafield(namespace: "custom", key: "total_orders") {
            id
            value
          }
        }
      }`,
      {
        variables: { id: customerGid },
      }
    );

    const customerData = await customerResponse.json();
    const currentMetafield = customerData?.data?.customer?.metafield;
    const currentCount = currentMetafield ? parseInt(currentMetafield.value, 10) || 0 : 0;
    const newCount = currentCount + 1;

    // 2. Set updated total_orders metafield on customer
    const mutationResponse = await admin.graphql(
      `#graphql
      mutation updateCustomerTotalOrders($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            value
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          metafields: [
            {
              ownerId: customerGid,
              namespace: "custom",
              key: "total_orders",
              value: newCount.toString(),
              type: "integer",
            },
          ],
        },
      }
    );

    const mutationData = await mutationResponse.json();
    const userErrors = mutationData?.data?.metafieldsSet?.userErrors || [];

    if (userErrors.length > 0) {
      console.error("[Webhook Error] Failed to set customer metafield:", userErrors);
    } else {
      console.log(`[Webhook Success] Updated customer ${customerGid} custom.total_orders to ${newCount}`);
    }
  } catch (error) {
    console.error("[Webhook Exception] Error processing order webhook:", error);
  }

  return new Response("Webhook processed successfully", { status: 200 });
};
