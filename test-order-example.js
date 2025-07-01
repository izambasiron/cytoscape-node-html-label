// Test file to demonstrate the order functionality
// This would be used in a Node.js environment or similar

// Mock cytoscape for demonstration
const cytoscape = {
  nodeHtmlLabel: function(params) {
    console.log('nodeHtmlLabel called with params:', params);
    return this;
  }
};

// Example usage of the order feature
const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: [
    {
      group: 'nodes',
      data: { id: 'a', name: 'Node A', order: 3 }
    },
    {
      group: 'nodes', 
      data: { id: 'b', name: 'Node B', order: 1 }
    },
    {
      group: 'nodes',
      data: { id: 'c', name: 'Node C', order: 2 }
    },
    {
      group: 'nodes',
      data: { id: 'd', name: 'Node D' } // No order - should be last
    }
  ]
});

// Apply labels with order consideration
cy.nodeHtmlLabel([
  {
    query: 'node',
    tpl: function(data) {
      return '<div class="label order-' + (data.order || 'none') + '">' + 
             data.name + 
             (data.order ? ' (Order: ' + data.order + ')' : ' (No Order)') + 
             '</div>';
    }
  }
]);

console.log('Expected order in DOM: Node B (1), Node C (2), Node A (3), Node D (no order)');
