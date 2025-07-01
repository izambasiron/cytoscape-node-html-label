"use strict";

describe('order feature verification', function () {
  var cy;

  beforeAll(function () {
    document.body.innerHTML += '<div id="cy-order-feature"></div>';
    cy = cytoscape({
      container: document.getElementById('cy-order-feature'),
      layout: { name: 'grid', cols: 3 },
      elements: { nodes: [] }
    });
  });

  function getHtmlContainer() {
    // The container is at the same level as the canvas (position 0)
    const cyContainer = document.querySelector('#cy-order-feature');
    return cyContainer.firstElementChild.getElementsByTagName('div')[0];
  }

  function setup() {
    // Initialize the plugin
    cy.nodeHtmlLabel([{
      query: 'node',
      tpl: function (data) {
        return '<span class="node-label">' + data.id + '</span>';
      }
    }]);

    // Add nodes with specific order values
    cy.json({
      elements: [
        {data: {id: 'node-z', order: 3}}, // Should be 3rd
        {data: {id: 'node-a', order: 1}}, // Should be 1st  
        {data: {id: 'node-m', order: 2}}, // Should be 2nd
        {data: {id: 'node-x'}} // No order, should be last
      ]
    });
    cy.layout({ name: 'grid', cols: 2 }).run();
  }

  it('verifies the 3-element structure exists', function (done) {
    setup();
    
    setTimeout(function () {
      const cyContainer = document.querySelector('#cy-order-feature');
      const canvas = cyContainer.querySelector('canvas');
      const htmlContainer = getHtmlContainer();
      
      // 1. Canvas exists
      expect(canvas).toBeTruthy();
      
      // 2. HTML container exists at same level as canvas (position 0)
      expect(htmlContainer).toBeTruthy();
      expect(canvas.parentNode).toBe(htmlContainer.parentNode);
      
      // 3. Wrapper elements exist (that mirror node locations)
      const wrappers = Array.from(htmlContainer.children);
      expect(wrappers.length).toBe(4);
      
      // 4. Each wrapper contains HTML content
      wrappers.forEach(function(wrapper) {
        const content = wrapper.querySelector('.node-label');
        expect(content).toBeTruthy();
      });
      
      console.log('✓ 3-layer structure verified: Canvas + Container + Wrappers with HTML content');
      done();
    }, 300);
  });

  it('verifies wrapper order matches data order attribute', function (done) {
    setTimeout(function () {
      const wrappers = Array.from(getHtmlContainer().children);
      const actualOrder = wrappers.map(function(wrapper) {
        const label = wrapper.querySelector('.node-label');
        return label ? label.textContent : null;
      });
      
      // Expected order based on order attribute: 1, 2, 3, undefined
      const expectedOrder = ['node-a', 'node-m', 'node-z', 'node-x'];
      
      console.log('Expected order:', expectedOrder);
      console.log('Actual order:', actualOrder);
      
      expect(actualOrder).toEqual(expectedOrder);
      
      console.log('✓ Wrapper order verification passed');
      done();
    }, 300);
  });

  it('verifies wrappers mirror node positions', function (done) {
    setTimeout(function () {
      const wrappers = Array.from(getHtmlContainer().children);
      let positionedCount = 0;
      
      wrappers.forEach(function(wrapper) {
        // Each wrapper should have positioning styles to mirror its node
        const hasTransform = wrapper.style.transform && wrapper.style.transform !== 'none';
        const hasAbsolutePos = wrapper.style.position === 'absolute';
        const hasCoordinates = wrapper.style.left || wrapper.style.top;
        
        if (hasTransform || hasAbsolutePos || hasCoordinates) {
          positionedCount++;
        }
      });
      
      // All wrappers should have positioning
      expect(positionedCount).toBe(wrappers.length);
      
      console.log('✓ All ' + positionedCount + ' wrappers have positioning to mirror nodes');
      done();
    }, 300);
  });

  afterAll(function () {
    const testDiv = document.querySelector('#cy-order-feature');
    if (testDiv && testDiv.parentNode) {
      testDiv.parentNode.removeChild(testDiv);
    }
  });
});
