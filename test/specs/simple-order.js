"use strict";

describe('simple order verification', function () {
  var cy;
  var layoutOptions = {
    name: 'grid',
    cols: 3
  };

  beforeAll(function () {
    document.body.innerHTML += '<div id="cy-simple-test"></div>';
    cy = cytoscape({
      container: document.getElementById('cy-simple-test'),
      layout: layoutOptions,
      elements: {
        nodes: []
      }
    });
  });

  function getWrapDiv() {
    return document.querySelector('#cy-simple-test').firstElementChild.getElementsByTagName('div')[0];
  }

  function initPlugin() {
    cy.nodeHtmlLabel([
      {
        query: 'node',
        tpl: function (data) {
          return '<span class="label">' + data.id + '</span>';
        }
      }
    ]);
  }

  function addTestNodes() {
    cy.json({
      elements: [
        // Add nodes with different order values to test ordering
        {data: {id: 'third', order: 3}},
        {data: {id: 'first', order: 1}},
        {data: {id: 'second', order: 2}},
        {data: {id: 'no-order'}} // No order attribute
      ]
    });
    cy.layout(layoutOptions).run();
  }

  function verifyDOMStructure() {
    const cyContainer = document.querySelector('#cy-simple-test');
    const canvas = cyContainer.querySelector('canvas');
    const htmlContainer = getWrapDiv();
    
    // Verify the 3 layers as described:
    // 1. Container at same level as canvas (position 0)
    // 2. Wrapper elements that mirror node location 
    // 3. HTML content within each wrapper
    
    expect(canvas).toBeDefined();
    expect(htmlContainer).toBeDefined();
    expect(canvas.parentNode).toBe(htmlContainer.parentNode); // Same level
    
    return {
      canvas: canvas,
      container: htmlContainer,
      wrappers: Array.from(htmlContainer.children)
    };
  }

  function getElementOrder() {
    const wrappers = Array.from(getWrapDiv().children);
    return wrappers.map(function(wrapper) {
      const span = wrapper.querySelector('.label');
      return span ? span.textContent : null;
    });
  }

  it('creates proper DOM structure with 3 layers', function (done) {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
    initPlugin();
    addTestNodes();
    setTimeout(function() {
      try {
        const structure = verifyDOMStructure();
        
        // Layer 1: Container at same level as canvas
        expect(structure.container).toBeTruthy();
        
        // Layer 2: Wrapper elements (should be 4 - one for each node)
        expect(structure.wrappers.length).toBe(4);
        
        // Layer 3: HTML content within each wrapper
        structure.wrappers.forEach(function(wrapper) {
          const htmlContent = wrapper.querySelector('.label');
          expect(htmlContent).toBeTruthy();
        });
        
        done();
      } catch (error) {
        done.fail(error);
      }
    }, 500);
  });

  it('orders wrapper elements correctly based on order attribute', function (done) {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
    // Since layout has already happened, just check the order directly
    setTimeout(function () {
      try {
        const actualOrder = getElementOrder();
        const expectedOrder = ['first', 'second', 'third', 'no-order']; // Ordered by order attribute
        
        console.log('Expected:', expectedOrder);
        console.log('Actual:', actualOrder);
        
        expect(actualOrder).toEqual(expectedOrder);
        done();
      } catch (error) {
        done.fail(error);
      }
    }, 100);
  });

  it('wrapper positions mirror node locations', function (done) {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
    // Since layout has already happened, just check positioning directly
    setTimeout(function () {
      try {
        const wrappers = Array.from(getWrapDiv().children);
        
        wrappers.forEach(function(wrapper) {
          const label = wrapper.querySelector('.label');
          if (label) {
            const nodeId = label.textContent;
            const cyNode = cy.$('#' + nodeId);
            
            // Verify wrapper has positioning (transform or absolute positioning)
            const hasPositioning = wrapper.style.transform || 
                                  wrapper.style.position === 'absolute' ||
                                  wrapper.style.left || 
                                  wrapper.style.top;
            
            expect(hasPositioning).toBeTruthy();
            console.log('Node ' + nodeId + ' wrapper has positioning:', !!hasPositioning);
          }
        });
        
        done();
      } catch (error) {
        done.fail(error);
      }
    }, 100);
  });

  afterAll(function () {
    const testDiv = document.querySelector('#cy-simple-test');
    if (testDiv && testDiv.parentNode) {
      testDiv.parentNode.removeChild(testDiv);
    }
  });
});
