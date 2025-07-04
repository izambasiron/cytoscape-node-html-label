type IHAlign = "left" | "center" | "right";
type IVAlign = "top" | "center" | "bottom";
declare var module: any;
declare var define: any;
declare var cytoscape: any;

interface CytoscapeNodeHtmlParams {
  query?: string;
  halign?: IHAlign;
  valign?: IVAlign;
  halignBox?: IHAlign;
  valignBox?: IVAlign;
  cssClass?: string;
  tpl?: (d: any) => string;
}

interface CytoscapeContainerParams {
  enablePointerEvents?: boolean;
}

(function () {
  "use strict";
  const $$find = function <T>(arr: T[], predicate: (a: T) => boolean) {
    if (typeof predicate !== "function") {
      throw new TypeError("predicate must be a function");
    }
    const length = arr.length >>> 0;
    // eslint-disable-next-line prefer-rest-params
    const thisArg = arguments[1];
    let value;

    for (let i = 0; i < length; i++) {
      value = arr[i];
      if (predicate.call(thisArg, value, i, arr)) {
        return value;
      }
    }
    return undefined;
  };

  interface ICyEventObject {
    cy: any;
    type: string;
    target: any;
  }

  interface ICytoscapeNodeHtmlPosition {
    x: number;
    y: number;
    w: number;
    h: number;
  }

  interface ILabelElement {
    data?: any;
    position?: ICytoscapeNodeHtmlPosition;
    node: HTMLElement;
  }

  interface HashTableElements {
    [key: string]: LabelElement;
  }

  class LabelElement {
    public tpl: (d: any) => string;

    private _position: number[];
    private _node: HTMLElement;
    private _align: [number, number, number, number];
    private _data: any; // Store data reference for order checking
    private _cy: any;

    constructor({
      node,
      position = null,
      data = null
    }: ILabelElement,
      params: CytoscapeNodeHtmlParams,
      cy: any) {

      this.updateParams(params);
      this._node = node;
      this._data = data; // Store data reference
      this._cy = cy;

      this.initStyles(params.cssClass);

      if (data) {
        this.updateData(data);
      }
      if (position) {
        this.updatePosition(position);
      }
    }

    updateParams({
      tpl = () => "",
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      cssClass = null,
      halign = "center",
      valign = "center",
      halignBox = "center",
      valignBox = "center"
    }: CytoscapeNodeHtmlParams) {

      const _align = {
        "top": -.5,
        "left": -.5,
        "center": 0,
        "right": .5,
        "bottom": .5
      };

      this._align = [
        _align[halign],
        _align[valign],
        100 * (_align[halignBox] - 0.5),
        100 * (_align[valignBox] - 0.5)
      ];

      this.tpl = tpl;
    }

    updateData(data: any) {
      this._data = data; // Update stored data reference

      while (this._node.firstChild) {
        this._node.removeChild(this._node.firstChild);
      }

      const children = new DOMParser()
        .parseFromString(this.tpl(data), "text/html")
        .body.children;

      for (let i = 0; i < children.length; ++i) {
        const el = children[i];
        this._node.appendChild(el);
      }
    }

    getNode(): HTMLElement {
      return this._node;
    }

    getData(): any {
      return this._data;
    }

    updatePosition(pos: ICytoscapeNodeHtmlPosition) {
      this._renderPosition(pos);
      this._cy && this._cy.emit('htmlLabelUpdated', {
        id: this._node.id,
        isUpdate: true,
        position: pos,
        data: this._data,
        node: this._node
      });
    }

    private initStyles(cssClass: string) {
      const stl = this._node.style;
      stl.position = "absolute";
      if (cssClass && cssClass.length) {
        this._node.classList.add(cssClass);
      }
    }

    private _renderPosition(position: ICytoscapeNodeHtmlPosition) {
      const prev = this._position;
      const x = position.x + this._align[0] * position.w;
      const y = position.y + this._align[1] * position.h;

      if (!prev || prev[0] !== x || prev[1] !== y) {
        this._position = [x, y];

        const valRel = `translate(${this._align[2]}%,${this._align[3]}%) `;
        const valAbs = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) `;
        const val = valRel + valAbs;
        const stl = <any>this._node.style;
        stl.webkitTransform = val;
        stl.msTransform = val;
        stl.transform = val;
      }
    }
  }

  /**
   * LabelContainer
   * Html manipulate, find and upgrade nodes
   * it don't know about cy.
   */
  class LabelContainer {
    private _elements: HashTableElements;
    private _node: HTMLElement;
    private _cy: any;

    constructor(node: HTMLElement, cy: any) {
      this._node = node;
      this._elements = <HashTableElements>{};
      this._cy = cy;
    }

    addOrUpdateElem(id: string, param: CytoscapeNodeHtmlParams, payload: { data?: any, position?: ICytoscapeNodeHtmlPosition } = {}) {
      const cur = this._elements[id];

      if (cur) {
        const oldData = cur.getData();
        const newOrder = payload.data && typeof payload.data.order === 'number' ? payload.data.order : undefined;
        const oldOrder = oldData && typeof oldData.order === 'number' ? oldData.order : undefined;

        cur.updateParams(param);
        cur.updateData(payload.data);
        cur.updatePosition(payload.position);

        // Check if order has changed and reorder if necessary
        if (newOrder !== oldOrder) {
          const nodeElem = cur.getNode();
          this._node.removeChild(nodeElem);

          if (typeof newOrder === 'number') {
            this._insertElementAtOrder(nodeElem, newOrder);
          } else {
            this._node.appendChild(nodeElem);
          }
        }
      } else {
        const nodeElem = document.createElement("div");

        // Check if data has an order attribute to determine insertion position
        if (payload.data && typeof payload.data.order === 'number') {
          this._insertElementAtOrder(nodeElem, payload.data.order);
        } else {
          // Default behavior: append to the end
          this._node.appendChild(nodeElem);
        }

        this._elements[id] = new LabelElement({
          node: nodeElem,
          data: payload.data,
          position: payload.position
        }, param, this._cy);

        // Emit custom event
        this._cy.emit('htmlLabelUpdated', {
          id: id,
          isUpdate: false,
          data: payload.data,
          position: payload.position,
          node: this._elements[id].getNode()
        });
      }
    }

    removeElemById(id: string) {
      if (this._elements[id]) {
        this._node.removeChild(this._elements[id].getNode());
        delete this._elements[id];
      }
    }

    updateElemPosition(id: string, position?: ICytoscapeNodeHtmlPosition) {
      const ele = this._elements[id];
      if (ele) {
        ele.updatePosition(position);
      }
    }

    updatePanZoom({ pan, zoom }: { pan: { x: number, y: number }, zoom: number }) {
      const val = `translate(${pan.x}px,${pan.y}px) scale(${zoom})`;
      const stl = <any>this._node.style;
      const origin = "top left";

      stl.webkitTransform = val;
      stl.msTransform = val;
      stl.transform = val;
      stl.webkitTransformOrigin = origin;
      stl.msTransformOrigin = origin;
      stl.transformOrigin = origin;
    }

    private _insertElementAtOrder(nodeElem: HTMLElement, order: number) {
      const children = this._node.children;
      let insertIndex = children.length; // Default to end if no ordered position found

      // Find the correct insertion point based on order
      // Elements with same order value will be inserted after existing ones (stable sort)
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        const childId = this._getElementIdByNode(child);

        if (childId) {
          const childElement = this._elements[childId];
          const childData = this._getElementData(childElement);

          // Insert before the first element with a strictly higher order
          // This ensures elements with same order maintain insertion order
          if (childData && typeof childData.order === 'number' && childData.order > order) {
            insertIndex = i;
            break;
          }
        }
      }

      // Insert at the determined position
      if (insertIndex >= children.length) {
        this._node.appendChild(nodeElem);
      } else {
        this._node.insertBefore(nodeElem, children[insertIndex]);
      }
    }

    private _getElementIdByNode(node: HTMLElement): string | null {
      // Find element ID by searching through the elements hash table
      for (const id in this._elements) {
        if (this._elements[id].getNode() === node) {
          return id;
        }
      }
      return null;
    }

    private _getElementData(labelElement: LabelElement): any {
      // Access the data from a LabelElement using the getter method
      return labelElement.getData();
    }
  }

  function cyNodeHtmlLabel(_cy: any, params: CytoscapeNodeHtmlParams[], options?: CytoscapeContainerParams) {
    const _params = (!params || typeof params !== "object") ? [] : params;
    const _lc = createLabelContainer();

    _cy.one("render", (e: any) => {
      createNodesCyHandler(e);
      wrapCyHandler(e);
    });
    _cy.on("add", addCyHandler);
    _cy.on("layoutstop", layoutstopHandler);
    _cy.on("remove", removeCyHandler);
    _cy.on("data", updateDataOrStyleCyHandler);
    _cy.on("style", updateDataOrStyleCyHandler);
    _cy.on("pan zoom", wrapCyHandler);
    _cy.on("position bounds", moveCyHandler); // "bounds" - not documented event

    return _cy;

    function createLabelContainer(): LabelContainer {
      const _cyContainer = _cy.container();
      const _titlesContainer = document.createElement("div");

      const _cyCanvas = _cyContainer.querySelector("canvas");
      const cur = _cyContainer.querySelector("[class^='cy-node-html']");
      if (cur) {
        _cyCanvas.parentNode.removeChild(cur);
      }

      const stl = _titlesContainer.style;
      stl.position = 'absolute';
      (stl as any).zIndex = '10';
      stl.width = '500px';
      stl.margin = '0px';
      stl.padding = '0px';
      stl.border = '0px';
      stl.outline = '0px';
      stl.outline = '0px';

      if (options && options.enablePointerEvents !== true) {
        (stl as any).pointerEvents = 'none';
      }

      _cyCanvas.parentNode.appendChild(_titlesContainer);

      return new LabelContainer(_titlesContainer, _cy);
    }

    function createNodesCyHandler({ cy }: ICyEventObject) {
      _params.forEach(x => {
        cy.elements(x.query).forEach((d: any) => {
          if (d.isNode()) {
            _lc.addOrUpdateElem(d.id(), x, {
              position: getNodePosition(d),
              data: d.data()
            });
          }
        });
      });
    }

    function addCyHandler(ev: ICyEventObject) {
      const target = ev.target;
      const param = $$find(_params.slice().reverse(), x => target.is(x.query));
      if (param) {
        _lc.addOrUpdateElem(target.id(), param, {
          position: getNodePosition(target),
          data: target.data()
        });
      }
    }

    function layoutstopHandler({ cy }: ICyEventObject) {
      _params.forEach(x => {
        cy.elements(x.query).forEach((d: any) => {
          if (d.isNode()) {
            _lc.updateElemPosition(d.id(), getNodePosition(d));
          }
        });
      });
    }

    function removeCyHandler(ev: ICyEventObject) {
      _lc.removeElemById(ev.target.id());
    }

    function moveCyHandler(ev: ICyEventObject) {
      // console.log('moveCyHandler');
      _lc.updateElemPosition(ev.target.id(), getNodePosition(ev.target));
    }

    function updateDataOrStyleCyHandler(ev: ICyEventObject) {
      setTimeout(() => {
        const target = ev.target;
        const param = $$find(_params.slice().reverse(), x => target.is(x.query));
        if (param && !target.removed()) {
          _lc.addOrUpdateElem(target.id(), param, {
            position: getNodePosition(target),
            data: target.data()
          });
        } else {
          _lc.removeElemById(target.id());
        }
      }, 0);
    }

    function wrapCyHandler({ cy }: ICyEventObject) {
      _lc.updatePanZoom({
        pan: cy.pan(),
        zoom: cy.zoom()
      });
    }

    function getNodePosition(node: any): ICytoscapeNodeHtmlPosition {
      return {
        w: node.width(),
        h: node.height(),
        x: node.position("x"),
        y: node.position("y")
      };
    }
  }

  // registers the extension on a cytoscape lib ref
  const register = function (cy: any) {

    if (!cy) {
      return;
    } // can't register if cytoscape unspecified

    cy("core", "nodeHtmlLabel", function (optArr: any, options?: any) {
      return cyNodeHtmlLabel(this, optArr, options);
    });
  };

  if (typeof module !== "undefined" && module.exports) { // expose as a commonjs module
    module.exports = function (cy: any) {
      register(cy);
    };
  } else {
    if (typeof define !== "undefined" && define.amd) { // expose as an amd/requirejs module
      define("cytoscape-nodeHtmlLabel", function () {
        return register;
      });
    }
  }

  if (typeof cytoscape !== "undefined") { // expose to global cytoscape (i.e. window.cytoscape)
    register(cytoscape);
  }

}());
