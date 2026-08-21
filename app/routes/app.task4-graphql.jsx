import { useState } from "react";

/**
 * TASK 4: GraphQL Heavy Operations Test
 * 
 * Interactive standalone viewer for all 5 required GraphQL Admin API queries/mutations.
 */

const GRAPHQL_QUERIES = [
  {
    id: "query1",
    title: "1. Get Products + Variants + Inventory (Paginated)",
    type: "QUERY",
    query: `query GetProductsWithPagination($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    pageInfo {
      hasNextPage
      hasPreviousPage
      endCursor
    }
    edges {
      cursor
      node {
        id
        title
        variants(first: 10) {
          edges {
            node {
              id
              title
              price
              inventoryQuantity
              inventoryItem {
                id
              }
            }
          }
        }
      }
    }
  }
}`,
    variables: `{
  "first": 10,
  "after": null
}`,
  },
  {
    id: "query2",
    title: "2. Create Product with 2 Variants (productCreate + productVariantsBulkCreate)",
    type: "MUTATION",
    query: `# Step 1: Create Base Product
mutation CreateProduct($input: ProductInput!) {
  productCreate(input: $input) {
    product {
      id
      title
    }
    userErrors {
      field
      message
    }
  }
}

# Step 2: Add 2 Variants
mutation CreateVariants($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkCreate(productId: $productId, strategy: REMOVE_STANDALONE_VARIANT, variants: $variants) {
    productVariants {
      id
      title
      price
      sku
    }
    userErrors {
      field
      message
    }
  }
}`,
    variables: `{
  "input": {
    "title": "Custom Performance Jacket",
    "vendor": "My Store",
    "productType": "Apparel"
  },
  "variants": [
    { "optionValues": [{ "name": "Size", "value": "Small" }], "price": "89.99", "sku": "JKT-S" },
    { "optionValues": [{ "name": "Size", "value": "Large" }], "price": "99.99", "sku": "JKT-L" }
  ]
}`,
  },
  {
    id: "query3",
    title: "3. Update Variant Inventory (inventoryAdjustQuantities)",
    type: "MUTATION",
    query: `mutation AdjustVariantInventory($input: InventoryAdjustQuantitiesInput!) {
  inventoryAdjustQuantities(input: $input) {
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
    variables: `{
  "input": {
    "reason": "correction",
    "name": "available",
    "changes": [
      {
        "inventoryItemId": "gid://shopify/InventoryItem/12345",
        "locationId": "gid://shopify/Location/67890",
        "delta": 15
      }
    ]
  }
}`,
  },
  {
    id: "query4",
    title: "4. Create Percentage Discount Code (discountCodeBasicCreate)",
    type: "MUTATION",
    query: `mutation CreatePercentageDiscount($basicCodeDiscount: DiscountCodeBasicInput!) {
  discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
    codeDiscountNode {
      id
      codeDiscount {
        ... on DiscountCodeBasic {
          title
          codes(first: 1) {
            nodes {
              code
            }
          }
          customerGets {
            value {
              ... on DiscountPercentage {
                percentage
              }
            }
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}`,
    variables: `{
  "basicCodeDiscount": {
    "title": "SUMMER15 - 15% Off All Products",
    "code": "SUMMER15",
    "startsAt": "2026-08-01T00:00:00Z",
    "customerGets": {
      "value": { "percentage": 0.15 },
      "items": { "all": true }
    },
    "customerSelection": { "all": true }
  }
}`,
  },
  {
    id: "query5",
    title: "5. Get Customer by Email & Read Metafields",
    type: "QUERY",
    query: `query GetCustomerByEmail($query: String!) {
  customers(first: 1, query: $query) {
    nodes {
      id
      firstName
      lastName
      email
      ordersCount
      metafield(namespace: "custom", key: "total_orders") {
        id
        value
        type
      }
    }
  }
}`,
    variables: `{
  "query": "email:customer@example.com"
}`,
  },
];

export default function GraphQLTestTask() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentOp = GRAPHQL_QUERIES[selectedIdx];

  const handleCopy = () => {
    const textToCopy = `${currentOp.query}\n\n# Variables:\n${currentOp.variables}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <s-page heading="Task 4: GraphQL Operations Reference">
      <s-section heading="Copy-Pasteable GraphQL Operations">
        <s-paragraph>
          Select an operation below to copy clean, production-ready GraphQL query &amp; variable payloads.
        </s-paragraph>

        {/* Tab Buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
          {GRAPHQL_QUERIES.map((op, idx) => (
            <button
              key={op.id}
              onClick={() => setSelectedIdx(idx)}
              style={{
                padding: "8px 14px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                backgroundColor: selectedIdx === idx ? "#008060" : "#f6f6f7",
                color: selectedIdx === idx ? "#fff" : "#202223",
                fontWeight: selectedIdx === idx ? "bold" : "normal",
                cursor: "pointer",
                fontSize: "13px",
              }}
            >
              {op.title.split(" ")[0]} {op.title.split(" ")[1]}
            </button>
          ))}
        </div>

        {/* Selected Operation Display */}
        <s-box padding="base" background="subdued" borderRadius="base" borderWidth="base">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <s-heading level="2">{currentOp.title}</s-heading>
            <button
              onClick={handleCopy}
              style={{
                padding: "6px 14px",
                backgroundColor: copied ? "#116f3c" : "#202223",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "13px",
              }}
            >
              {copied ? "✓ Copied to Clipboard!" : "📋 Copy Query + Variables"}
            </button>
          </div>

          <s-heading level="3">GraphQL Document</s-heading>
          <pre
            style={{
              backgroundColor: "#1e1e1e",
              color: "#d4d4d4",
              padding: "14px",
              borderRadius: "6px",
              overflowX: "auto",
              fontSize: "13px",
              lineHeight: "1.5",
              marginTop: "6px",
              marginBottom: "16px",
            }}
          >
            <code>{currentOp.query}</code>
          </pre>

          <s-heading level="3">Variables JSON Payload</s-heading>
          <pre
            style={{
              backgroundColor: "#1e1e1e",
              color: "#9cdcfe",
              padding: "14px",
              borderRadius: "6px",
              overflowX: "auto",
              fontSize: "13px",
              lineHeight: "1.5",
              marginTop: "6px",
            }}
          >
            <code>{currentOp.variables}</code>
          </pre>
        </s-box>
      </s-section>
    </s-page>
  );
}
