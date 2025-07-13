class CustomConstantProvider extends Blockly.zelos.ConstantProvider {
  init() {
    super.init();
    this.OCTAGON = this.makeOctagon();
    this.CURVY = this.makeCurvy();
    this.BOWL = this.makeBowl();
    console.log(this)
  }

  makeOctagon() {
    const maxWidth = this.MAX_DYNAMIC_CONNECTION_SHAPE_WIDTH;
    const maxHeight = maxWidth * 2;

    function makeMainPath(blockHeight, up, right) {
      const remainingHeight =
        blockHeight > maxHeight ? blockHeight - maxHeight : 0;
      const height = blockHeight > maxHeight ? maxHeight : blockHeight;
      const radius = height / 4;

      const dirRight = right ? 1 : -1;
      const dirUp = up ? -1 : 1;

      return `h ${radius * dirRight} l ${radius * dirRight} ${
        radius * dirUp
      } v ${(remainingHeight + height - radius * 2) * dirUp} l ${
        radius * -dirRight
      } ${radius * dirUp} h ${radius * -dirRight}`;
    }

    return {
      type: this.SHAPES.HEXAGONAL,
      isDynamic: true,
      width(height) {
        const halfHeight = height / 2;
        return halfHeight > maxWidth ? maxWidth : halfHeight;
      },
      height(height) {
        return height;
      },
      connectionOffsetY(connectionHeight) {
        return connectionHeight / 2;
      },
      connectionOffsetX(connectionWidth) {
        return -connectionWidth;
      },
      pathDown(height) {
        return makeMainPath(height, false, false);
      },
      pathUp(height) {
        return makeMainPath(height, true, false);
      },
      pathRightDown(height) {
        return makeMainPath(height, false, true);
      },
      pathRightUp(height) {
        return makeMainPath(height, false, true);
      },
    };
  }

  makeCurvy() {
    const maxWidth = this.MAX_DYNAMIC_CONNECTION_SHAPE_WIDTH;
    const maxHeight = maxWidth * 2;

    function makeMainPath(blockHeight, up, right) {
      const remainingHeight =
        blockHeight > maxHeight ? blockHeight - maxHeight : 0;
      const height =
        (blockHeight > maxHeight ? maxHeight : blockHeight) + remainingHeight;
      const radius = height - remainingHeight;

      const dirRight = right ? 1 : -1;
      const dirUp = up ? -1 : 1;

      return `q ${radius * dirRight} ${(height / 2) * dirUp} 0 ${
        height * dirUp
      }`;
    }

    return {
      type: this.SHAPES.HEXAGONAL,
      isDynamic: true,
      width(height) {
        const halfHeight = height / 2;
        return halfHeight > maxWidth ? maxWidth : halfHeight;
      },
      height(height) {
        return height;
      },
      connectionOffsetY(connectionHeight) {
        return connectionHeight / 2;
      },
      connectionOffsetX(connectionWidth) {
        return -connectionWidth;
      },
      pathDown(height) {
        return makeMainPath(height, false, false);
      },
      pathUp(height) {
        return makeMainPath(height, true, false);
      },
      pathRightDown(height) {
        return makeMainPath(height, false, true);
      },
      pathRightUp(height) {
        return makeMainPath(height, false, true);
      },
    };
  }

  makeBowl() {
    const maxW = this.MAX_DYNAMIC_CONNECTION_SHAPE_WIDTH;
    const maxH = maxW * 2;
    const roundedCopy = this.ROUNDED;

    function makeMainPath(blockHeight, up, right) {
      const extra = blockHeight > maxH ? blockHeight - maxH : 0;
      const h_ = Math.min(blockHeight, maxH);
      const h = h_ + extra;
      const radius = h / 2;
      const radiusH = Math.min(h_ / 2, maxH);
      const dirR = right ? 1 : -1;
      const dirU = up ? -1 : 1;

      return `
        h ${radiusH * dirR}
        q ${(h_ / 4) * -dirR} ${radius * dirU} 0 ${h * dirU}
        h ${radiusH * -dirR}
      `;
    }

    return {
      type: this.SHAPES.ROUND,
      isDynamic: true,
      width(h) {
        const half = h / 2;
        return half > maxW ? maxW : half;
      },
      height(h) {
        return h;
      },
      connectionOffsetY(h) {
        return h / 2;
      },
      connectionOffsetX(w) {
        return -w;
      },
      pathDown(h) {
        return makeMainPath(h, false, false);
      },
      pathUp(h) {
        return makeMainPath(h, true, false);
      },
      pathRightDown(h) {
        return roundedCopy.pathRightDown(h);
      },
      pathRightUp(h) {
        return roundedCopy.pathRightUp(h);
      },
    };
  }

  /**
   * @param {Blockly.RenderedConnection} connection
   */
  shapeFor(connection) {
    let checks = connection.getCheck();
    if (!checks && connection.targetConnection)
      checks = connection.targetConnection.getCheck();

    if (checks && (connection.type === 1 || connection.type === 2)) {
      if (checks.includes("Array")) {
        return this.BOWL;
      }
    }

    return super.shapeFor(connection);
  }
}

class CustomRenderer extends Blockly.zelos.Renderer {
  constructor() {
    super();
  }

  makeConstants_() {
    return new CustomConstantProvider();
  }
}

Blockly.blockRendering.register("custom_zelos", CustomRenderer);
