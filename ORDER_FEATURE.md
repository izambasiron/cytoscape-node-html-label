# Order Attribute Feature

This document describes the new `order` attribute feature added to cytoscape-node-html-label.

## Overview

The `order` attribute allows you to control the insertion order of HTML label elements in the DOM. This is useful when you need to maintain a specific ordering of labels regardless of when they are added or updated.

## How it Works

When adding or updating a node's HTML label, the plugin now checks if the node's data contains an `order` attribute:

- If `order` is a number, the label element will be inserted at the appropriate position to maintain numerical order
- If `order` is not provided or not a number, the label element will be appended at the end (default behavior)
- When updating an existing element, if the `order` value changes, the element will be repositioned accordingly
- **Multiple elements with the same order value**: Elements with identical order values maintain their insertion order (stable sort). For example, if you have elements with orders [0, 0, 0, 1, 1, 2], they will appear in that exact sequence.

## Usage Example

```javascript
// Create cytoscape instance with nodes that have order attributes
var cy = cytoscape({
  container: document.getElementById('cy'),
  elements: [
    { 
      group: 'nodes', 
      data: { id: 'node1', name: 'Third', order: 3 }
    },
    { 
      group: 'nodes', 
      data: { id: 'node2', name: 'First', order: 1 }
    },
    { 
      group: 'nodes', 
      data: { id: 'node3', name: 'Second', order: 2 }
    },
    { 
      group: 'nodes', 
      data: { id: 'node4', name: 'No Order' } // Will appear last
    }
  ]
});

// Apply node HTML labels
cy.nodeHtmlLabel([{
  query: 'node',
  tpl: function(data) {
    return '<div class="label">' + data.name + '</div>';
  }
}]);
```

In this example, the labels will appear in the DOM in the following order:
1. "First" (order: 1)
2. "Second" (order: 2)  
3. "Third" (order: 3)
4. "No Order" (no order attribute)

### Example with Duplicate Order Values

```javascript
var cy = cytoscape({
  elements: [
    { group: 'nodes', data: { id: 'A', name: 'A', order: 0 }},
    { group: 'nodes', data: { id: 'B', name: 'B', order: 0 }},
    { group: 'nodes', data: { id: 'C', name: 'C', order: 0 }},
    { group: 'nodes', data: { id: 'D', name: 'D', order: 1 }},
    { group: 'nodes', data: { id: 'E', name: 'E', order: 1 }},
    { group: 'nodes', data: { id: 'F', name: 'F', order: 2 }},
    { group: 'nodes', data: { id: 'G', name: 'G' }} // no order
  ]
});
```

Result: A, B, C, D, E, F, G (elements with same order maintain insertion order)

## Dynamic Updates

The order is also maintained when node data is updated:

```javascript
// Change the order of an existing node
cy.getElementById('node1').data('order', 0);

// The label will be repositioned to appear first
```

## Implementation Details

### LabelElement Class Changes
- Added `_data` property to store node data reference
- Added `getData()` method to retrieve stored data
- Modified `updateData()` method to update stored data reference

### LabelContainer Class Changes
- Added `_insertElementAtOrder()` method to handle ordered insertion
- Added `_getElementIdByNode()` helper method
- Added `_getElementData()` helper method  
- Modified `addOrUpdateElem()` method to:
  - Check for order attribute on new elements
  - Handle order changes on existing elements
  - Reposition elements when order changes

### Algorithm
The insertion algorithm works as follows:
1. When inserting a new element with an order:
   - Iterate through existing child elements
   - Find the first element with a higher order value
   - Insert the new element before that position
   - If no higher order is found, append to the end

2. When updating an existing element:
   - Compare old and new order values
   - If different, remove the element and reinsert at correct position

## Backward Compatibility

This feature is fully backward compatible:
- Existing code without order attributes will work unchanged
- Elements without order attributes are appended at the end as before
- No breaking changes to the existing API

## Performance Considerations

- The ordering algorithm has O(n) complexity where n is the number of existing elements
- For typical use cases with moderate numbers of labels, performance impact is negligible
- Order checking only occurs when elements are added or when order values change

## Edge Cases and Behavior

### Duplicate Order Values
- Elements with identical order values maintain their insertion order (stable sort)
- Example: Elements with orders [0, 0, 0, 1, 1, 2] will appear in that exact sequence

### Non-Numeric Order Values
- Only numeric values are considered valid orders
- `null`, `undefined`, strings, objects, etc. are treated as "no order"
- Elements with invalid orders are appended at the end

### Mixed Scenarios
```javascript
// Example with mixed order types
{ data: { order: 1 }},        // appears first
{ data: { order: "2" }},      // treated as no order - appears at end
{ data: { order: 2 }},        // appears second  
{ data: { order: null }},     // treated as no order - appears at end
{ data: { order: 0 }},        // appears before order: 1
{ data: {} }                  // no order - appears at end
```

Result order: order:0, order:1, order:2, order:"2", order:null, no order
