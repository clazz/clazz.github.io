/**
 * JsonViewer - a util to view JSON
 */
(function ($, window) {
    window.JsonViewer = JsonViewer;

    /**
     * make expander of something
     * @param defaultExpand
     * @returns {*}
     */
    $.fn.initExpander = function (defaultExpand) {
        return initExpander(this, defaultExpand);
    };

    /**
     * construct a JsonViewer
     * @param options
     * @returns {JsonViewer}
     * @constructor
     */
    function JsonViewer(options) {
        var defaultOptions = {
            renderTo: null, // which element to render to
            json: {} // json data
        };
        var self = this;
        self.options = $.extend(self, defaultOptions, options);
        self.$root = $('<div></div>').append(createJsonNode(self.json));
        self.$root.addClass('json-viewer').appendTo(self.renderTo.empty());
        self.$root.find('.object-end:last').text('}');
        bindJsonExpander(self.$root);
        return this;
    }

    /**
     * init expander
     * @param triggers $('dt,hX')
     * @param defaultExpand bool initial expanded
     * @events expand, shrink, toggle-expand
     */
    function initExpander(triggers, defaultExpand) {
        triggers.each(function (i, e) {
            var tagName = e.tagName;
            if (!tagName.match(/^(dt|h\d*)/i)) {
                console.error("Unsupported tag: %o of %o!", tagName, e);
                return;
            }
            e = $(e);
            var target = e.data('expander-target');
            if (!target) {
                target = e.nextUntil(tagName);
                e.data('expander-target', target);
            }

            if (target.size() <= 0){
                return;
            }

            var trigger = e;
            if (trigger.children('.icon-expander').size() == 0) {
                trigger.prepend('<i class="icon icon-expander"></i>');
            }
            trigger.on('expand', function () {
                target.show();
                trigger.addClass('expanded');
            });
            trigger.on('shrink', function () {
                target.hide();
                trigger.removeClass('expanded');
            });
            trigger.on('toggle-expand', function () {
                trigger.trigger(target.is(':visible') ? 'shrink' : 'expand');
            });
            trigger.on('click', function () {
                trigger.trigger('toggle-expand');
            });
            trigger.css({cursor: 'pointer'});
        });

        if (!defaultExpand) {
            triggers.trigger('shrink');
            $(triggers.toArray().slice(0, 3)).trigger('expand');
        } else {
            triggers.trigger('expand');
        }
    }

    function createJsonNode(obj) {
        var info = rebuild(obj);
        if (info.title) {
            if (info.type == 'array'){
                var $list = $('<div class="array"></div>');
                $('<div class="array-begin expanded">[</div>').appendTo($list);
                $.each(obj, function(i, v){
                   $('<div class="array-item"></div>').append(createJsonNode(v)).appendTo($list);
                });
                $('<div class="array-end">],<div>').appendTo($list);
                return $list;
            } else { // object
                var $list = $('<div class="object"></div>');
                $('<div class="object-begin expanded">{</div>').appendTo($list);
                $.each(obj, function(k, v){
                    var valType = getTypeOf(v);
                    if (valType == 'object' || valType == 'array'){
                        var $val = createJsonNode(v);
                        var $valBegin = $val.find(valType == 'object' ? '.object-begin:first' : '.array-begin:first');
                        $valBegin.prepend('<span class="key">' + k + '</span><span class="delimiter">: </span>');
                        $('<div class="object-item"></div>').append($val).appendTo($list);
                    } else {
                        $('<div class="object-item"></div>')
                            .append('<span class="key">' + k + '</span><span class="delimiter">: </span>')
                            .append($('<span class="value"></span>').text(JSON.stringify(v)).addClass(valType))
                            .append(',')
                            .appendTo($list);
                    }

                });
                $('<div class="object-end">},</div>').appendTo($list);
                return $list;
            }
        } else {
            return $("<div><div>").append($('<span></span>').text(info.body).attr('title', 'type: ' + info.type).attr('class', info.type)).append(',');
        }
    }

    function bindJsonExpander($container){
        $container.on('click', '.array-begin, .object-begin', function(){
            var $this = $(this);
            var $end = $this.siblings($this.is('.array-begin') ? '.array-end' : '.object-end');
            $this.trigger($end.is(':visible') ? 'shrink' : 'expand');
        }).on('shrink', '.array-begin, .object-begin', function(){
            var $this = $(this);
            var $end = $this.siblings($this.is('.array-begin') ? '.array-end' : '.object-end');
            $this.data('original-html', $this.html());
            $this.append('...' + $end.text() + '<span class="comment"> //' + ($this.siblings().size() - 1) + ' item(s)</span>').removeClass('expanded');
            $this.siblings().hide();
        }).on('expand', '.array-begin, .object-begin', function(){
            var $this = $(this);
            $this.html($this.data('original-html')).addClass('expanded');
            $this.siblings().show();
        });
    }

    function getTypeOf(something) {
        var type = $.type(something);
        if (['array', 'string', 'boolean', 'null', 'object', 'number', 'undefined'].indexOf(type) >= 0) {
            return type;
        } else {
            console.error("Unsupported type %o of %o.", type, something);
            return 'unknown';
        }
    }

    function rebuild(something) {
        var type = getTypeOf(something);
        switch (type) {
            case 'object':
                return {title: isEmptyObject(something) ? '{}' : '{...}', body: something, type: type};
            case 'array':
                return {title: isEmptyArray(something) ? '[]' : '[...]', body: something, type: type};
            case 'string':
                return {body: JSON.stringify(something), type: type};
            case 'null':
                return {body: 'null', type: type};
            case 'boolean':
                return { body: something + "", type: type};
            default:
                return { body: JSON.stringify(something), type: type};
        }
    }

    function isEmptyArray(arr){
        return arr.length == 0;
    }

    function isEmptyObject(obj){
        for (var key in obj){
            return false;
        }
        return true;
    }

})(window.jQuery, window);