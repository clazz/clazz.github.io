class BasicEditor




class MdEditor extends BasicEditor
  constructor: (@target, options) ->
    super(@target, $.extend({}, {}, options))




# exports:
window.MdEditor = MdEditor

