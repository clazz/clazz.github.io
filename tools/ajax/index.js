function EncodeDecodeHistory(){
    var self = this;
    self.data = { name: 'EncodeDecodeHistory', history: [] };

    self.save = function(){
        var data = JSON.stringify(self.data);
    };
    return this;
}

function UndoManager(){
    var self = this;
    self.data = { name: 'UndoManager', history: []};
    self.add = function(text){
        self.data.history.push(text);
        self.data.current = self.data.history.length - 1;
    };
    self.undo = function(){
        if (self.data.current > 0){
            self.data.current--;
        }
        return self.data.history[self.data.current];
    }
    self.redo = function(){
        if (self.data.current < self.data.history.length - 1){
            self.data.current++;
        }
        return  self.data.history[self.data.current];
    }
    return this;
}

$(function(){
    window.undoManager = new UndoManager();
    window.set_param = function(text){
        undoManager.add(text);
        $("#param").val(text);
    }
    $("#param").on('change', function(){
        undoManager.add($(this).val());
    });
});

function undo_it(){
    $('#param').val(undoManager.undo());
}
function redo_it(){
    $('#param').val(undoManager.redo());
}

function auto_expand(textArea){
    var value = $(textArea).val();
    var lines = value.split("\n") || [];
    if (lines.length > 10){
        $(textArea).css('height', Math.min(lines.length * 1.14, 30) + 'em');
    }
}
function split_url(){
    var url = $("#url").val();
    var a = url.split("?");
    if (a.length>1){
        $("#url").val(a[0]);
        set_param(a[1]);
    }
}
function decode_param(){
    var param = $("#param").val().trim();
    if (param){
        var base64 = Base64.decode(param);
        base64 = base64 || param;
        var output = formatJson(base64);
        output = output || base64;
        set_param(output);
    }
}
function encode_param(){
    var param = $("#param").val().trim();
    if (param){
        var jsonParam = parseJson(param);
        console.log("Param json object: %o", jsonParam);
        if (!!jsonParam){
            var base64 = Base64.encode(JSON.stringify(jsonParam));
        } else {
            var base64 = Base64.encode(param);
        }
        set_param(base64);
    }
}
function format_json(){
    var param = $("#param").val().trim();
    if (param){
        try {
            var jsonParam = parseJson(param, true);
            if (jsonParam) {
                set_param(JSON.stringify(jsonParam, null, '  '));
            } else {
                notice('JSON对象为空！');
            }
        } catch(e){
            notice(e.message);
        }
    }
}
function notice(msg, clearPrevious){
    clearPrevious = (clearPrevious === undefined) ? true : !!clearPrevious;
    if (clearPrevious){
        $('.notice-wrapper').remove();
    }

    var notice = $('<div class="notice-wrapper"><div class="notice"><div class="msg" ></div><button class="close-btn">X</button></div></div>').prependTo('body').fadeIn();
    notice.find('.msg').text(msg);
    notice.find('.close-btn').on('click', function(){ notice.remove(); });
}
function parseJson(code, throws){
    try{
        code = ' function json_eval_function(){ return ' + code + ';}';
        eval(code);
        return json_eval_function();
    }catch(e){
        console.log(" Parse json failed: %o", e);
        if (throws){
            throw e;
        }
        return null;
    }
}
function send_request(){
    var ajaxOptions = {
        type: $("#method").val()
    };
    var url = $("#url").val();
    var param = $("#param").val().trim();
    if (param){
        var jsonParam = parseJson(param);
        console.log("Param json object: %o", jsonParam);
        if (!!jsonParam){
            var jsonPretty = JSON.stringify(jsonParam, null, '    ');
            param = Base64.encode(JSON.stringify(jsonParam));
        } else {
            try{
                var jsonPretty = JSON.stringify(parseJson(Base64.decode(param)), null, '    ');
            }catch(e){}
            param = param;
        }
        if ($("#method").val() == 'GET'){
            ajaxOptions.url = url + "?" + param;
        }else{
            ajaxOptions.url = url;
            ajaxOptions.data = param;
            ajaxOptions.dataType = 'text';
        }
    } else {
        ajaxOptions.url = url;
    }

    console.log(" Start Ajax request. URL: %o with params: %o", url, ajaxOptions);

    do_ajax(ajaxOptions, function(text, elapsedTimeInSeconds){
        if (text){
            on_got_output({
                text: text,
                elapsedTimeInSeconds: elapsedTimeInSeconds
            }, {
                url: url,
                param: param,
                type: ajaxOptions.type,
                jsonPretty: jsonPretty
            });
            location.hash='#output';
        }
    });
}

function do_ajax(opt, done){
    var $status = $('#status');
    var statusTemplate = (do_ajax.statusTemplate = (do_ajax.statusTemplate || new EJS({url: 'ajax-status.ejs'})));
    var xhr = new XMLHttpRequest();
    var startTime = new Date();

    if (do_ajax.timerId){
        clearInterval(do_ajax.timerId);
    }

    do_ajax.timerId = setInterval(function(){
        report_status();
    }, 100);

    xhr.onreadystatechange = function(){
        report_status();
        if (4 == xhr.readyState && 200 == xhr.status){
            clearInterval(do_ajax.timerId);
            done && done.call && done(xhr.responseText, +(new Date() - startTime) / 1000);
        }
    };

    xhr.open(opt.type.toLowerCase(), opt.url, true);
    xhr.send(opt.data);

    function report_status(){
        $status.html(statusTemplate.render({
            readyState: xhr.readyState,
            readyStateText: humanize_xhr_ready_state(xhr.readyState),
            status: xhr.status,
            statusText: xhr.statusText,
            seconds: ((+(new Date() - startTime) / 1000) + '').replace(/(\.\d)\d*/,'$1')
        }));
    }
}

function humanize_xhr_ready_state(readyState){
    switch (readyState){
        case 0: return 'UNSET';
        case 1: return 'OPENED';
        case 2: return 'HEADERS_RECEIVED';
        case 3: return 'LOADING';
        case 4: return 'DONE';
    }
}

function on_got_output(response, request){
    var base64 = null, json = null, jsonPretty = null;
    console.log("Raw output:: %o", {output: response.text});
    try{
        base64 = Base64.decode(response.text);
        console.log("Base64 decoded: %o", {base64: base64});
        try{
            json = parseJson(base64);
            console.log("JSON: %o", {json: json});
            jsonPretty = JSON.stringify(json, null, ' ');
        }catch(e){
            console.log("Failed to decode json: %o", e);
            console.log(e.stack);
        }

        if (!json){
            try{
                json = parseJson(response.text);
                console.log("JSON: %o", {json: json});
                jsonPretty = JSON.stringify(json, null, ' ');
            }catch(e){
                console.log("Failed to decode json: %o", e);
                console.log(e.stack);
            }
        }
    }catch(e){
        console.log("Failed to decode base64: %o", e);
        console.log(e.stack);
    }

    log_it({
        base64: base64,
        json: json,
        jsonPretty: jsonPretty,
        raw: response.text,
        elapsedTimeInSeconds: response.elapsedTimeInSeconds
    }, request);

    $('#output').empty().append($('#log .log-item:first .response').clone(true, true)).show();
}

/**
 * 渲染并追加日志
 * @param data
 * @param opt object {jump: true}
 */
function render_and_prepend_log(data, opt) {
    var uiLogItemId = 'log-' + data.id;
    var $logItem = $(new EJS({url:'log-item.ejs'}).render(data)).attr('id', uiLogItemId);

    if ($.type(data.response.json) == 'object'){
        new JsonViewer({
            renderTo: $logItem.find('.response .jsonNormal'),
            json: data.response.json
        });
    }

    $logItem.find('.delBtn').on('click', function(){
        logItemDb.remove(data);
        $logItem.remove();
        return false;
    });

    $logItem.find('.refillBtn').on('click', function(){
        $('#method').val(data.request.type);
        $('#url').val(data.request.url);
        set_param(data.request.jsonPretty);
        window.location.hash = '#url';
        try{ $('#url')[0].scrollIntoView(); }catch(e){}
        return false;
    });

    $logItem.find('.resendBtn').on('click', function(){
        $logItem.find('.refillBtn').click();
        send_request();
    });

    $logItem.prependTo('#log');
    $logItem.find('h3,h4').initExpander(true);
    $logItem.find('.response h4:not(:eq(1))').trigger('shrink');

    if (opt && opt.jump){
        location.hash = '#' + uiLogItemId;
    }
}

function log_it(response, request){
    var data = {
        request: request,
        response: response
    };

    logItemDb.add(data);
    render_and_prepend_log(data, {jump: true});
}

function load_log_items(){
    logItemDb.each(function(item){
        render_and_prepend_log(item);
    });
}

$(function(){
    load_log_items();
});

function LogItemDb(){
    var self = this;
    var db = self.db = new MyDbStore('log');
    self.id = 0;

    db.find('id').done(function(id){  self.id = (id || 0); });

    self.add = function(item){
        self.id = self.id || 0;
        var id = ++self.id;
        item.id = id;
        var value = { addTime: new Date(), data: item };
        db.put('id', self.id);
        return db.add(id, value);
    };

    self.remove = function(item){
        return db.remove(item.id);
    };

    self.each = function(iterator){
        return db.each(function(item){
            if (item.key != 'id'){
                iterator(item.value.data, item.value.addTime);
            }
        });
    }

    return this;
}
window.logItemDb = new LogItemDb();


/**
 * 数据库
 * @param dbName
 * @param storeName
 * @returns {MyDbStore}
 * @constructor
 */
function MyDbStore(dbName, storeName){
    var self = this;
    dbName = dbName || '__default__';
    storeName = storeName || '__default__';
    var db = self.db = $.indexedDB(dbName, {
        "schema": {
            "1": function (versionTransaction) {
                versionTransaction.createObjectStore(storeName);
            }
        }
    });

    var isLogEnabled = false;

    function log(){
        if (isLogEnabled){
            console.log.apply(console, arguments);
        }
    }

    self.enableLog = function(toEnable){
        isLogEnabled = (toEnable === undefined ? true : toEnable);
    }

    self.add = function(key, value){
        return db.transaction([storeName]).then(function () {
            log("Transaction completed");
        }, function () {
            log("Transaction aborted");
        }, function (t) {
            log("Transaction in progress");
            t.objectStore(storeName).add(value, key).then(function () {
                log("Data added");
            }, function () {
                log("Error adding data");
            });
        });
    };

    self.remove = function(key){
        return db.transaction([storeName]).then(function () {
            log("Transaction completed");
        }, function () {
            log("Transaction aborted");
        }, function (t) {
            log("Transaction in progress");
            t.objectStore(storeName).delete(key).then(function () {
                log("Data deleted");
            }, function () {
                log("Error deleting data");
            });
        });
    };

    self.removeAll = self.clear = function(){
        return db.transaction([storeName]).then(function () {
            log("Transaction completed");
        }, function () {
            log("Transaction aborted");
        }, function (t) {
            log("Transaction in progress");
            t.objectStore(storeName).clear().then(function () {
                log("Data cleared");
            }, function () {
                log("Error clearing data");
            });
        });
    }

    self.set = self.update = function(key, value){
        self.remove(key);
        return self.add(key, value);
    };

    self.find = function(key){
        var dfd = $.Deferred();
        db.objectStore(storeName).get(key).then(function (value) {
            log("Data got %o", arguments);
            dfd.resolve(value);
        }, function (e) {
            log("Error getting data");
            dfd.reject(e);
        });
        return dfd.promise();
    };

    self.each = function(iterator){
        return db.transaction([storeName]).then(function () {
            log("Transaction completed");
        }, function () {
            log("Transaction aborted");
        }, function (t) {
            log("Transaction in progress");
            t.objectStore(storeName).each(iterator).then(function () {
                log("Data iterated");
            }, function () {
                log("Error getting data");
            });
        });
    };

    self.put = function(key, value){
        return db.transaction([storeName]).then(function () {
            log("Transaction completed");
        }, function () {
            log("Transaction aborted");
        }, function (t) {
            log("Transaction in progress");
            t.objectStore(storeName).put(value, key).then(function (value) {
                log("Data put %o", arguments);
            }, function () {
                log("Error putting data");
            });
        });
    }

    // count().done(function(){ console.log(arguments)})
    // => [100, event]
    self.count = function(){
        return db.objectStore(storeName).count();
    }

    return this;
}

function escape_html(html){
    var e = document.createElement('div');
    e.textContent = html;
    e.innerText = html;
    return e.innerHTML;
}

$(function(){
    // init expander
    $('h1,h2,h3,h4,h').initExpander(true);

    // bind events
    $('#sendBtn').on('click', send_request);
    $('#splitUrlBtn').on('click', split_url);
    $('#decodeBtn').on('click', decode_param);
    $('#encodeBtn').on('click', encode_param);
    $('#formatJsonBtn').on('click', format_json);
    $('#undoBtn').on('click', undo_it);
    $('#redoBtn').on('click', redo_it);
    $('#noticeBtn').on('click', showNotice);

    if (!localStorage.hasShownNotice){
        showNotice().done(function(){
            localStorage.hasShownNotice = true;
        });
    }
});

function showNotice(){
    var notice = new EJS({url: 'notice.ejs'});
    var $dialog = $(notice.render({}));
    var dfd = $.Deferred();

    $dialog.on('click', '.btn-ok', function(){
        $dialog.remove();
        dfd.resolve('ok');
        return false;
    });

    $dialog.appendTo('body').show();

    return dfd.promise();
}


