// Generated by CoffeeScript 1.8.0
(function() {
  var BasicEditor, MdEditor,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  BasicEditor = (function() {
    function BasicEditor() {}

    return BasicEditor;

  })();

  MdEditor = (function(_super) {
    __extends(MdEditor, _super);

    function MdEditor(target, options) {
      this.target = target;
      MdEditor.__super__.constructor.call(this, this.target, $.extend({}, {}, options));
    }

    return MdEditor;

  })(BasicEditor);

  window.MdEditor = MdEditor;

}).call(this);
