Blockly.Blocks["when_flag_clicked"] = {
  init: function () {
    this.appendDummyInput().appendField("when 🏁 clicked");
    this.appendStatementInput("DO").setCheck(null);
    this.setColour("#ffc400");
  },
};

Blockly.Blocks["project_timer"] = {
  init: function () {
    this.appendDummyInput().appendField("project timer");
    this.setOutput(true, "Number");
    this.setColour("#ffc400");
  },
};

Blockly.JavaScript.forBlock["when_flag_clicked"] = function (block, generator) {
  const branch = generator.statementToCode(block, "DO");
  return `whenFlagClicked(async () => {\n${branch}});\n`;
};

Blockly.JavaScript.forBlock["project_timer"] = function (block) {
  return ["projectTime()", Blockly.JavaScript.ORDER_NONE];
};
