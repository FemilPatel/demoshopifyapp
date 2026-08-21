# Task 4: GraphQL Operations Reference Guide

Copy-paste ready GraphQL Admin API queries and mutations for GraphiQL, Postman, or Node.js / Remix / React Router code.

---

## 1. Get Products with Variants + Inventory (with Pagination)

### GraphQL Query
```graphql
query GetProductsWithPagination($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    edges {
      cursor
      node {
        id
        title
        handle
        status
        variants(first: 10) {
          edges {
            node {
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
    }
  }
}
```

### Variables
```json
{
  "first": 10,
  "after": null
}
```

---

## 2. Create a New Product with 2 Variants

### Step 2A: Create Product (`productCreate`)
```graphql
mutation CreateProduct($input: ProductInput!) {
  productCreate(input: $input) {
    product {
      id
      title
      handle
    }
    userErrors {
      field
      message
    }
  }
}
```

#### Variables
```json
{
  "input": {
    "title": "Custom Performance Jacket",
    "descriptionHtml": "<p>High performance winter jacket.</p>",
    "vendor": "My Store",
    "productType": "Apparel"
  }
}
```

### Step 2B: Add 2 Variants (`productVariantsBulkCreate`)
```graphql
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
}
```

#### Variables
```json
{
  "productId": "gid://shopify/Product/YOUR_PRODUCT_ID",
  "variants": [
    {
      "optionValues": [{ "name": "Size", "value": "Small" }],
      "price": "89.99",
      "sku": "JKT-S"
    },
    {
      "optionValues": [{ "name": "Size", "value": "Large" }],
      "price": "99.99",
      "sku": "JKT-L"
    }
  ]
}
```

---

## 3. Update Inventory of a Specific Variant (`inventoryAdjustQuantities`)

### GraphQL Mutation
```graphql
mutation AdjustVariantInventory($input: InventoryAdjustQuantitiesInput!) {
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
}
```

### Variables
```json
{
  "input": {
    "reason": "correction",
    "name": "available",
    "changes": [
      {
        "inventoryItemId": "gid://shopify/InventoryItem/YOUR_INVENTORY_ITEM_ID",
        "locationId": "gid://shopify/Location/YOUR_LOCATION_ID",
        "delta": 15,
        "changeFromQuantity": 10
      }
    ]
  }
}
```

---

## 4. Create a Percentage Discount Code (`discountCodeBasicCreate`)

### GraphQL Mutation
```graphql
mutation CreatePercentageDiscount($basicCodeDiscount: DiscountCodeBasicInput!) {
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
            items {
              ... on AllDiscountItems {
                allOfItems
              }
            }
          }
          startsAt
          endsAt
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
```

### Variables
```json
{
  "basicCodeDiscount": {
    "title": "SUMMER15 - 15% Off All Products",
    "code": "SUMMER15",
    "startsAt": "2026-08-01T00:00:00Z",
    "customerGets": {
      "value": {
        "percentage": 0.15
      },
      "items": {
        "all": true
      }
    },
    "customerSelection": {
      "all": true
    }
  }
}
```

---

## 5. Get Customer by Email and Read Metafields

### GraphQL Query
```graphql
query GetCustomerByEmail($query: String!) {
  customers(first: 1, query: $query) {
    nodes {
      id
      firstName
      lastName
      email
      ordersCount
      totalSpent
      totalOrdersMetafield: metafield(namespace: "custom", key: "total_orders") {
        id
        value
        type
      }
    }
  }
}
```

### Variables
```json
{
  "query": "email:customer@example.com"
}
```
