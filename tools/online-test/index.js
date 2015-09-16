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

    loadSavedData(function(data){
        $css.val(data.css);
        $html.val(data.html);
        $javascript.val(data.js);
        refreshResult();
    });

    function refreshResult(){
        var data = {
            javascript: $javascript.val(),
            css: $css.val(),
            html: $html.val()
        };
        var resultHtml = resultTemplate.render(data);

        var resultUrl = URL.createObjectURL(new Blob([resultHtml], {type:'text/html'}));
        $download[0].href = resultUrl;
        $newWindow[0].href = resultUrl;
        $result[0].contentWindow.location = resultUrl;

        $updateIndicator.removeClass('dirty').addClass('updated');

        saveData(data);
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

    function loadSavedData(callback){
        if (localStorage[getSavedDataKey()]){
            try{
                var params = JSON.parse(localStorage[getSavedDataKey()]);
                params && callback && callback(params);
            }catch(e){
                console.error(e.message);
                console.error(e.stack);
            }
        }
    }

    function saveData(params){
        localStorage[getSavedDataKey()] = JSON.stringify(params);
    }

    function getSavedDataKey(){
        return 'onlineTestData_' + (location.hash || 'default');
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



