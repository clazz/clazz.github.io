var ToolsBasePath = getCurrentScriptPath() + '/..';
var ToolsCfg = getCurrentScriptConfig({
    header: true,
    footer: true
});

// load js, if needed
if (!window.$){
    (function(){
        var jQuery = includeJs(ToolsBasePath + '/../js/jquery.js');
        window.$ = function(onLoad){
            jQuery.onload = onLoad;
        };
    })();
}

$(function(){
    includeCss(ToolsBasePath + '/common/common.css');
    includeHtml(ToolsBasePath + '/common/layout.html').done(function(html){
        var $body = $('body');
        var $layout = $(html);
        var $header = $layout.find('header');
        var $footer = $layout.find('footer');
        $layout.find('a').each(function(){
            var $this = $(this);
            $this.attr('href', ToolsBasePath + '/common/' + $this.attr('href'));
        });
        if ($body.find('.content').size() > 0){
            ToolsCfg.header && $header.prependTo($body);
            ToolsCfg.footer && $footer.appendTo($body);
        } else {
            $body.addClass('content');
            ToolsCfg.header && $header.insertBefore($body);
            ToolsCfg.footer && $footer.insertAfter($body);
        }

        if (ToolsCfg.header){
            setTimeout(function(){
                if (!window.scrollY){
                    window.scrollBy(0, $header.height());
                }
            },100);
        }
    });
});

function includeJs(src){
    var script = document.createElement('script');
    script.setAttribute('src', src);
    document.body.appendChild(script);
    return script;
}

function includeCss(src){
    var link = document.createElement('link');
    var head = document.getElementsByTagName('head')[0];
    link.setAttribute('rel','stylesheet');
    link.setAttribute('href',src);
    link.setAttribute('type','text/css');
    head.appendChild(link);
    return link;
}

function includeHtml(src, callbacks){
    return $.get(src);
}

function getCurrentScriptData(key){
    var dataSet = (document.currentScript || {}).dataset || {};
    return dataSet[(key||'').toLowerCase()];
}

function getCurrentScriptConfig(defaultCfg){
    var data = {};
    var cfgStr = getCurrentScriptData('cfg');
    if (cfgStr){
        try{
            data = JSON.parse(cfgStr);
        }catch(e){
            try{
                eval('data = ' + cfgStr + ';');
            }catch(e){}
        }
    }

    data = data || {};

    if (defaultCfg){
        for (var i in defaultCfg){
            if (!(i in data)){
                data[i] = defaultCfg[i];
            }
        }
    }

    return data;
}

function getCurrentScriptPath(){
    return (document.currentScript || {}).src + "/.."
}


// google analytics:
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
    (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-67468647-1', 'auto');
ga('send', 'pageview');


