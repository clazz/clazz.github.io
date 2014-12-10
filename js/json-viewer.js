/**
 * Created by panchangyun on 14-11-20.
 */
(function ($, window) {
    create_json_node = function (obj) {
        var info = json_analyze(obj);
        if (info.title){
            var list = $('<dl class="json-viewer"></dl>');
            $('<dt></dt>').text(info.title).addClass(info.type).appendTo(list);
            for (var i in info.body){
                $('<dd></dd>')
                    .append($('<var></var>').text(i).addClass(info.type).attr('title', 'type: '+json_typeof(info.body)))
                    .append($('<i>:</i>'))
                    .append($('<samp></samp>').append(create_json_node(info.body[i])).addClass(info.type))
                    .appendTo(list);
            }
            return list;
        } else {
            return $('<div></div>').text(info.body);
        }
    };

    function json_typeof(something){
        var type = $.type(something);
        if (['array', 'string', 'boolean', 'null', 'object', 'number', 'undefined'].indexOf(type) >= 0){
            return type;
        }else{
            console.log("Unsupported type %o of %o.", type, something);
            return 'unknown';
        }
    }
    function json_analyze(something){
        var type = json_typeof(something);
        switch (type){
            case 'object':
                return {title:'{...}', body: something, type: type};
            case 'array':
                return {title:'[...]', body: something, type: type};
            case 'string':
                return {body: something, type: type};
            case 'null':
                return {body: 'null', type: type};
            case 'boolean':
                return { body: something+"", type: type};
            default:
                return { body: something+'', type: type};
        }
//        if ($.isArray(something)){
//            return '['+makeTitle(something+"")+']';
//        }else if(null === something){
//            return 'null';
//        }else if('string' === typeof(something)){
//            var lines = something.split("\n");
//            return lines.length > 3 ? lines[0] : (something.length > 10 ? something.substr(0, 10) + '...' : something);
//        }
    }

    function initExpander(triggers, defaultExpand){
        triggers.each(function(i, e){
            var tagName = e.tagName;
            if (!tagName.match(/^(dt|h\d*)/i)){
                console.error("Unsupported tag: %o of %o!", tagName, e);
                return;
            }
            e = $(e);
            var target = e.data('expander-target');
            if (!target){
                target = e.nextUntil(tagName);
                e.data('expander-target');
            }

            var trigger = e;
            trigger.on('expand', function(){
                target.show();
                trigger.addClass('expanded');
            });
            trigger.on('shrink', function(){
                target.hide();
                trigger.removeClass('expanded');
            })
            trigger.on('toggle-expand', function(){
                console.log("toggle-expand... %o", this);
                target.toggle();
                trigger.toggleClass('expanded');
            });
            trigger.on('click', function(){
                trigger.trigger('toggle-expand');
            });
        });
        if (!defaultExpand){
            triggers.trigger('shrink');
            $(triggers.toArray().slice(0,3)).trigger('expand');
        }
    }

    function JsonViewer(options) {
        var defaultOptions = {
            renderTo: null, // which element to render to
            json: {},
        };
        var self = this;
        self.options = $.extend(self, defaultOptions, options);
        var data = self.data = self.data || {};
        var root = self.root = create_json_node(self.json);
        root.appendTo(self.renderTo.empty());
        initExpander($('dt',self.renderTo));
        return this;
    }

    window.JsonViewer = JsonViewer;

})(window.jQuery, window);
