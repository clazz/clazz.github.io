

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
        type: $("#method").val(),
        complete: function(){
            console.log("complete: %o", arguments);
        }
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
    }
    console.log(" URL: " + url);
    console.log(" Ajax params: %o", ajaxOptions);
    clear_output();
    $.ajax(ajaxOptions).done(function(data){
        on_got_output(data, { url: url, param: param, type: ajaxOptions.type, jsonPretty: jsonPretty });
        location.hash='#output';
    }).fail(function(jqXHR, error, msg){
        if (jqXHR && jqXHR.responseText){  // 有的时候根据返回的application/type解析会出错，但是实际上已经返回值了的。
            on_got_output(jqXHR.responseText, { url: url, param: param, type: ajaxOptions.type, jsonPretty: jsonPretty });
            location.hash='#output';
            return;
        }
        console.log(" Ajax failed: %o, %o (%o)", msg, this, arguments);
        $("#raw-output").text(" Ajax failed: " + msg);
    }).progress(function(){
        console.log('progress: %o', arguments);
    });
}
function clear_output(){
    $("#raw-output, #base64-output, #json-output").empty();
}

function on_got_output(output, request){
    console.log("Raw output:: %o", {output: output});
    $("#raw-output").text(output);
    try{
        var base64 = Base64.decode(output);
        console.log("Base64 decoded: %o", {base64: base64});
        $("#base64-output").text(base64);
        try{
            var json = parseJson(base64);
            console.log("JSON: %o", {json: json});
            var jsonPretty = formatJson(base64);
            $("#json-output").text(jsonPretty);
        }catch(e){
            console.log("Failed to decode json: %o", e);
            console.log(e.stack);
            $("#json-output").text("Invalid JSON!");
        }
    }catch(e){
        console.log("Failed to decode base64: %o", e);
        console.log(e.stack);
        $("#base64-output").text("Invalid base64!");
    }
    log_it({ base64: base64, json: json, jsonPretty: jsonPretty, raw: output }, request);
}

function render_and_prepend_log(data, noJumpToNewLogItem) {
    var uiLogItemId = 'log-' + data.id;
    var logItem = $('#log-item-template').clone().removeAttr('id').attr('id', uiLogItemId);
    logItem.find('.request .type').text(data.request.type);
    logItem.find('.request .url').text(data.request.url);
    logItem.find('.request .param').text(data.request.param);
    logItem.find('.request .jsonPretty').text(data.request.jsonPretty);
    logItem.find('.response .base64').text(data.response.base64);
    if ($.type(data.response.json) == 'object'){
        new JsonViewer({
            renderTo: logItem.find('.response .jsonNormal'),
            json: data.response.json
        });
    }else{
        logItem.find('.response .jsonNormal').text(data.response.json);
    }
    logItem.find('.response .jsonPretty').text(data.response.jsonPretty);
    logItem.find('.response .raw').text(data.response.raw);
    logItem.find('.id').text(data.id);
    logItem.find('.delBtn').on('click', function(){
        logItemDb.remove(data);
        logItem.remove();
    });
    logItem.prependTo('#log');
    if (!noJumpToNewLogItem){
        location.hash = '#' + uiLogItemId;
    }
    logItem.find('h3,h4').initExpander(true);
}
function log_it(response, request){
    var data = {
        request: request,
        response: response
    };

    logItemDb.add(data);
    render_and_prepend_log(data);
}

function load_log_items(){
    logItemDb.each(function(item){
        render_and_prepend_log(item, true);
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

    var isLogEnabled = true;

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
    }

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


$(function(){
    $('h1,h2,h3,h4,h').initExpander(true);
});
