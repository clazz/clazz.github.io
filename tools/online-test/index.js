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

    function init(){
        $javascript.on('input', refreshResultOnIdle);
        $css.on('input', refreshResultOnIdle);
        $html.on('input', refreshResultOnIdle);
        $refreshBtn.on('click', refreshResult);
        initTabs();
    }

    function refreshResult(){
        var data = getCurrentData();
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

    function getCurrentData(){
        return {
            javascript: $javascript.val(),
            css: $css.val(),
            html: $html.val()
        };
    }

    function setCurrentData(data){
        $css.val(data.css);
        $html.val(data.html);
        $javascript.val(data.js);
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

    function loadSavedData(callback, key){
        if (key){
            key = getSavedDataPrefix() + key;
        } else {
            key = getSavedDataKey();
        }

        if (localStorage[key]){
            try{
                var params = JSON.parse(localStorage[key]);
                params && callback && callback(params);
            }catch(e){
                console.error(e.message);
                console.error(e.stack);
            }
        }
    }

    function saveData(params, key){
        if (key){
            key = getSavedDataPrefix() + key;
        } else {
            key = getSavedDataKey();
        }

        localStorage[key] = JSON.stringify(params);
    }

    function deleteSavedData(key){
        saveData(null, key);
        localStorage.removeItem(getSavedDataPrefix() + key);
    }

    function getSavedDataKey(){
        return getSavedDataPrefix() + getActiveTabKey();
    }

    function getSavedDataPrefix(){
        return 'onlineTestData_';
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
        };

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
        };
    }

    function initTabs(){
        loadTabs();
        activateTab(location.hash);

        $('.tabs').on('click', 'a.name', function(){
            activateTab($(this).closest('.tab'));
        }).on('dblclick', 'a.name', function(){
            try{
                var $tab = renameTab($(this).closest('.tab'));
                activateTab($tab);
            } catch(e){
                e.message && alert(e.message);
            }
        }).on('click', 'a.close', function(){
            var $tab = $(this).closest('.tab'), $nextTab = $tab.next('.tab');
            closeTab($tab);

            if (!$('.tab.active').size()){
                if (!$nextTab.size()){
                    $nextTab = $('.tab:first');
                }

                if (!$nextTab.size()){
                    $nextTab = addTab('default');
                }

                activateTab($nextTab);
            }
        }).on('click', '.add-tab a', function(){
            try{
                prompt('Please input new tab name:', generateTabName()).done(function(tabName){
                    var $tab = addTab(tabName);
                    activateTab($tab);
                });
            } catch(e){
                alert(e.message);
            }
        }).on('click', '.clone-tab a', function(){
            try{
                var $tab = cloneTab(getActiveTab(), generateTabName());
                activateTab($tab);
            } catch(e){
                alert(e.message);
            }
        });
    }

    function activateTab($tab){
        var tabName = $tab || 'default';
        if (!$tab || typeof $tab === 'string'){
            if (tabName.startWith('#')){
                tabName = tabName.slice(1);
            }
            $tab = $('.tab').filter(function(){ return $(this).data('key') == tabName; });
        } else {
            tabName = $tab.data('key');
        }

        if (!$tab.size() && tabName){
            $tab = addTab(tabName);
        }

        $tab.siblings().removeClass('active');
        $tab.addClass('active');

        loadSavedData(function(data){
            setCurrentData(data);
            refreshResult();
        });

        location.hash = $tab.data('key');
    }

    var loadedTabs = {};
    function loadTabs(){
        var prefix = getSavedDataPrefix();
        for (var key in localStorage){
            if (key.startWith(prefix)){
                addTab(key.slice(prefix.length));
            }
        }

        if ($('.tabs .tab').size() <= 0){
            addTab('default');
        }
    }

    function addTab(tabName){
        if (tabName in loadedTabs){
            throw new Error('"{}" already exists! Please change a name.'.format(tabName));
        }

        var $tab = $('<li class="tab"><a class="name" href="javascript:void(0)"></a><a class="close" href="javascript:void(0)">&times;</a></li>');
        loadedTabs[tabName] = true;
        $tab.attr('data-key', tabName);
        $tab.find('a.name').text(tabName.replace(/^./, function(m){ return m.toUpperCase(); }));
        $tab.insertBefore('.clone-tab');
        return $tab;
    }

    function cloneTab($srcTab, newTabName){
        var $newTab = addTab(newTabName);

        loadSavedData(function(data){
            saveData(data, newTabName);
        }, $srcTab.data('key'));

        return $newTab;
    }

    function closeTab($tab){
        deleteSavedData($tab.data('key'));
        delete loadedTabs[$tab.data('key')];
        $tab.remove();
    }

    function renameTab($tab){
        var $newTab = null;
            prompt("Please input a new tab name:").done(function(newTabName){
            $newTab = cloneTab($tab, newTabName);
            closeTab($tab);
        });

        if ($newTab){
            return $newTab;
        } else {
            throw new Error('');
        }
    }

    function getActiveTabKey(){
        return $('.tab.active').data('key') || 'default';
    }

    function getActiveTab(){
        return $('.tab.active');
    }

    function generateTabName(){
        var d = new Date();
        return 'test@{0}-{1}-{2}_{3}:{4}:{5}'.format(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
    }

    function prompt(msg, defaultValue){
        var val = window.prompt(msg, defaultValue);
        return {
            done: function(callback){
                if (val){
                    callback(val);
                }
            }
        }
    }

    String.prototype.format = function(){
        var replacements = arguments;
        return this.replace(/\{(\d*)\}/g, function(a, m){
            return replacements[Number(m) || 0];
        });
    };

    String.prototype.startWith = function(prefix){
        return prefix && this.slice(0, prefix.length) == prefix;
    };

    // init:
    init();
});




