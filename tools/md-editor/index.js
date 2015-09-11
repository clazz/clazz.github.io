

function preventCtrlS(e){
    if ((e.keyCode == 83) && e.ctrlKey){ // CTRL + S:
        // prevent default saving
        e.cancelBubble = true;
        e.preventDefault();
        return false;
    }
}

$(function(){
    $(document.body).on('keydown', preventCtrlS);
});

function beforeToHtml(){
    $('[name=markdown]').val(aceEditor.getValue());
}
window.onhashchange = function(){
    window.location.reload();
}
var CONTENT = 'content_';
$(function(){
    function getNoteName(){
        var hash = location.hash.substring(1);
        return CONTENT + ( hash || 'default');
    }

    if (location.hash.substring(1) == 'list'){
        var list = $('<ul class="note-list" style="width: 20em"></ul>');
        for (var i in localStorage){
            if (i.indexOf(CONTENT) == 0){
                (function(){
                    var item = i.substring(CONTENT.length);
                    var li = $('<li><a href="#'+item+'">'+ item+'</a></li>');
                    $('<a href="javascript:void(0)" style="float: right">DELETE</a>').on('click', function(){
                        if (window.confirm("Are you sure to delete "+item+" ? This operation can NOT be undone!")){
                            localStorage.removeItem(CONTENT + item);
                            li.remove();
                        }
                    }).appendTo(li);
                    li.appendTo(list);
                })();
            }
        }
        list.append(
            $('<li></li>').append($('<input type="text" />')).append($('<input type="button" value="ADD" />').on('click', function(){
                var item = $(this).prev(':text').val();
                if (item){
                    window.location.hash = '#'+item;
                }
            }))
        );
        list.appendTo('body');
        $('pre, form').remove();
        return;
    }

    // load editor content
    $("#editor").text(localStorage[getNoteName()]);

    // init ace editor
    var aceEditor = ace.edit("editor");
    aceEditor.setTheme("ace/theme/textmate");
    aceEditor.getSession().setMode("ace/mode/markdown");
    window.aceEditor = aceEditor;

    // set auto saving
//    setInterval(function(){
//        localStorage[getNoteName()] = aceEditor.getValue();
//        var noty = $('<div class="noty"></div>').text('saved').hide().prependTo('body').fadeIn();
//        setTimeout(function(){ noty.fadeOut().remove(); }, 1500);
//    }, 3000);

});