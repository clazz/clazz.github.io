$(function(){
    var $javascript = createEditor('javascript', 'javascript');
    var $css = createEditor('css', 'css');
    var $html = createEditor('html', 'html').focus();

    var $result = $('#result');
    var $refreshBtn = $('#refreshBtn');
    var $download = $('#download');
    var $newWindow = $('#newWindow');
    var $updateIndicator = $('.update-indicator');
    var resultTemplate = new EJS({url: 'result.ejs'});
    var idleTimerId = 0;

    $javascript.on('input', refreshResultOnIdle);
    $css.on('input', refreshResultOnIdle);
    $html.on('input', refreshResultOnIdle);
    $refreshBtn.on('click', refreshResult);

    function refreshResult(){
        var resultHtml = resultTemplate.render({
            javascript: $javascript.val(),
            css: $css.val(),
            html: $html.val()
        });

        var resultUrl = URL.createObjectURL(new Blob([resultHtml], {type:'text/html'}));
        $download[0].href = resultUrl;
        $newWindow[0].href = resultUrl;
        $result[0].contentWindow.location = resultUrl;

        $updateIndicator.removeClass('dirty').addClass('updated');
    }

    function refreshResultOnIdle(){
        $updateIndicator.removeClass('dirty');
        setTimeout(function(){
            $updateIndicator.addClass('dirty').removeClass('updated');
        });

        if (idleTimerId){
            clearTimeout(idleTimerId);
        }

        idleTimerId = setTimeout(refreshResult, 800);
    }

    function createEditor(elemId, lang){
        var editor = ace.edit(elemId);
        editor.setTheme('ace/theme/textmate');
        editor.getSession().setMode('ace/mode/' + lang);
        return {
            on: function(event, callback){
                editor.getSession().on('change', callback);
                return this;
            },
            focus: function(){
                editor.focus()
                return this;
            },
            val: function(value){
                if (value === undefined){
                    return editor.getValue();
                } else {
                    editor.setValue(value);
                    return this;
                }
            }
        };
    }

    function bindDragDrop(draggables, dropHolder){
        $.each(draggables, function(i, draggable){
            draggable.draggable = true;
            draggable.ondragstart = function(e){
                var data = {
                    x: e.x,
                    y: e.y,
                    id: e.target.id
                };
                e.dataTransfer.setData('Text', JSON.stringify(data));
            };
        });

        dropHolder.ondragover = function(e){
            e.preventDefault();
        }

        dropHolder.ondrop = function(e){
            var data = JSON.parse(e.dataTransfer.getData('Text'));
            var delta = {
                x: e.x - data.x,
                y: e.y - data.y
            };
            var $elem = $('#' + data.id);
            var pos = $elem.position();
            $elem.css({
                position: 'absolute',
                top: pos.top + delta.y,
                left: pos.left + delta.x
            });
        }
    }

});



