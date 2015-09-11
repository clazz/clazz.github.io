window.ImageViewer = function(url, alt, title){
    var img = $('<img />').attr('src', url).attr('alt', title).css({
        display: 'inline-block',
        'max-width': '90vw',
        'max-height': '90vh'
    });
    var a = $('<a></a>').attr('target', '_blank')
        .attr('title', title)
        .attr('href', url)
        .css({
            display: 'inline-block',
            height: '100%'
        })
        .append(img);
    var close_it = function(){
        overlay.remove();
        container.remove();
    };
    var closeBtn = $('<a class="icon-remove-sign"></a>').css({
        color: 'red',
        'font-size': 'x-large',
        'margin-left': '-0.1em'
    }).bind('click', close_it);
    var closeWrapper = $('<div></div>').css({
        height: '100%',
        width: '2em',
        'text-align': 'left',
        'display': 'inline-block',
        'vertical-algin': 'top',
        'margin-top': '-0.6em',
        'float': 'right'
    }).append(closeBtn);
    var container = $('<div></div>').append(
            $('<div></div>').css({
                margin: '5vh 1vw',
                display: 'inline-block',
                'vertical-align': 'top'
            }).append(a).append(closeWrapper))
        .css({
            'z-index': 30000000,
            'position': 'fixed',
            'padding': 0,
            'margin': 0,
            'width': '100vw',
            'height': '100vh',
            'top': 0,
            'left': 0,
            'text-align': 'center',
            'cursor': 'default',
            'vertical-align': 'middle'
        })
        .bind('click',close_it)
        .appendTo('body');
    var overlay = $('<div class="blockUI blockMsg blockPage">').css({
        'z-index': 9999,
        'position': 'fixed',
        padding: 0,
        margin: 0,
        width: '100vw',
        height: '100vh',
        top: '0vh',
        left: '0vw',
        'text-align': 'center',
        'cursor': 'default',
        'vertical-align': 'middle',
        'background-color': 'gray',
        'opacity': '0.4'
    }).bind('click', close_it).appendTo('body');

    this.close = close_it;
    return this;
}