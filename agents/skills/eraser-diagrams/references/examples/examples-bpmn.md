# BPMN Example

## Order Fulfillment
A business process for handling online orders.

```eraser
// Global Styles
colorMode pastel
styleMode shadow

// Pools and Lanes
Order Fulfillment {
  Sales {
    Receive Order [type: event, icon: mail]
    Validate Order [type: activity]
  }
  
  Warehouse {
    Check Stock [type: gateway]
    Ship Item [type: activity, icon: truck]
    Restock [type: activity]
  }
}

// Connections
Receive Order > Validate Order
Validate Order > Check Stock

Check Stock > Ship Item: In Stock
Check Stock > Restock: Out of Stock
```
