Blockly.Blocks["wait_one_frame"] = {
  init: function () {
    this.appendDummyInput().appendField("wait one frame");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#FFAB19");
  },
};

Blockly.Blocks["wait_block"] = {
  init: function () {
    this.appendValueInput("AMOUNT").setCheck("Number").appendField("wait");
    this.appendDummyInput().appendField(
      new Blockly.FieldDropdown([
        ["seconds", "1000"],
        ["milliseconds", "1"],
      ]),
      "MENU"
    );
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour("#FFAB19");
  },
};

Blockly.JavaScript.forBlock["wait_one_frame"] = function (block) {
  return `await waitOneFrame();\n`;
};

Blockly.JavaScript.forBlock["wait_block"] = function (block, generator) {
  const duration =
    generator.valueToCode(block, "AMOUNT", Blockly.JavaScript.ORDER_ATOMIC) ||
    0;
  const menu = block.getFieldValue("MENU") || 0;
  return `await wait(${duration * Number(menu)});\n`;
};
