/**
 * define a class
 * @param config {{construct:function,public:{},static:{}}}
 * @returns {*}
 */
function defClass(config){
    var constructor = config.construct || function(){ return this; };

    if (config.public){
        $.extend(constructor.prototype, config.public);
    }

    if (config.static){
        $.extend(constructor, config.static);
    }

    return constructor;
}

//================================== controllers ===================================

/**
 * Control the page
 * @constructor
 */
var AjaxPageController = defClass({
    public: {
        init: function(){
            this.ui = {
                $method: $('#method'),
                $url: $('#url'),
                $param: Utils.createAceEditor('param', 'javascript'),
                $status: $('#status'),
                $response: $('#response'),
                $toggleExpand: $('#toggleExpand')
            };
            this.undoManager = new UndoManager();
            this.history = new AjaxHistoryController(this);

            // bind onReady
            $(this.onReady.bind(this));

            return this;
        },
        onReady: function(){
            // bind events
            this.bindEvents();

            // init expander
            $('h1,h2,h3,h4').initExpander(true);

            // load history
            this.history.init();
        },
        bindEvents: function(){
            var self = this;

            // bind events
            $('#sendBtn').on('click', this.actionSendRequest.bind(this));
            $('#splitUrlBtn').on('click', this.actionSplitUrl.bind(this));
            $('#decodeBtn').on('click', this.actionDecodeParams.bind(this));
            $('#encodeBtn').on('click', this.actionEncodeParams.bind(this));
            $('#formatJsonBtn').on('click', this.actionFormatJson.bind(this));
            $('#undoBtn').on('click', this.actionUndo.bind(this));
            $('#redoBtn').on('click', this.actionRedo.bind(this));
            $('#toggleExpand').on('click', this.actionToggleExpand.bind(this));

            self.ui.$param.on('change', function(){
                self.undoManager.add(self.ui.$param.val());
            });
        },
        /**
         * 点击[send]按钮，发送请求
         */
        actionSendRequest: function(){
            var self = this;
            var inputs = {
                type: this.ui.$method.val(),
                url: this.ui.$url.val().trim(),
                param: this.ui.$param.val().trim()
            };

            console.log("Create Ajax request: %o", inputs);

            var request = new AjaxRequest(inputs);

            request.send()
                .done(function(response){
                    self.history.add({ request: request, response: response });
                    new AjaxResponseView(response).renderTo(self.ui.$response.show());
                    location.hash = '#response';
                })
                .fail(function(reason){
                    console.log("Error: ajax failed -- reason: %s --- request: %s", reason, request.toObject())
                })
                .progress(function(data){
                    self._statusTemplate = (self._statusTemplate || new EJS({url: 'ajax-status.ejs'}));
                    self.ui.$status.html(self._statusTemplate.render({
                        status: data.status,
                        statusText: data.statusText,
                        readyState: data.readyState,
                        readyStateText: data.readyStateText,
                        seconds: data.seconds
                    }));
                });
        },
        /**
         * 点击[split]按钮，分割URL
         */
        actionSplitUrl: function(){
            var url = this.ui.$url.val().trim();
            var parts = url.split('?');
            if (parts.length > 1){
                this.ui.$url.val(parts[0]);
                this.updateParam(parts[1]);
            }
        },
        /**
         * 解码
         */
        actionDecodeParams: function(){
            var param = new AutoParam(this.ui.$param.val().trim());
            this.updateParam(param.toPrettyString());
        },
        /**
         * 编码
         */
        actionEncodeParams: function(){
            var param = new AutoParam(this.ui.$param.val().trim());
            this.updateParam(param.serialize());
        },
        /**
         * 格式化JSON
         */
        actionFormatJson: function(){
            var param = this.ui.$param.val().trim();
            try {
                this.updateParam(Utils.formatJson(Utils.parseJson(param, {throws: true})));
            } catch (e){
                Utils.notice(e.message);
            }
        },
        /**
         * 撤销修改
         */
        actionUndo: function(){
            this.ui.$param.val(this.undoManager.undo());
        },
        /**
         * 重做修改
         */
        actionRedo: function(){
            this.ui.$param.val(this.undoManager.redo());
        },
        actionToggleExpand: (function(){
            var isExpanded = false;
            return function(){
                if (isExpanded){
                    this.ui.$param.css('height', 'auto');
                    this.ui.$toggleExpand.text('v').removeClass('to-shrink').addClass('to-expand');
                } else {
                    this.ui.$param.css('height', '80vh');
                    this.ui.$toggleExpand.text('^').removeClass('to-expand').addClass('to-shrink');
                }

                isExpanded = !isExpanded;
                return false;
            };
        })(),
        /**
         * 填充请求
         * @param request {AjaxRequest}
         */
        actionFillRequest: function(request){
            this.undoManager.add(this.ui.$param.val());
            this.ui.$method.val(request.getType());
            this.ui.$url.val(request.getUrl());
            this.updateParam(request.getParamStr());
        },
        /**
         * Update the param textarea
         * @param param
         */
        updateParam: function(param){
            this.ui.$param.val(param);
            this.undoManager.add(param);
        }
    }
});

/**
 * Control the history
 * @type {*}
 */
var AjaxHistoryController = defClass({
    construct: function(page){
        this.page = page;
    },
    public:{
        // init after ready
        init: function(){
            this.ui = {
                $content: $('#historyContent'),
                $detail: $('#historyDetail'),
                $import: $('#importHistory'),
                $export: $('#exportHistory'),
                $download: $('#downloadHistory')
            };
            this.db = new IdBasedDbStore('log');
            this.bindEvents();
            this.loadHistory();
        },
        bindEvents: function(){
            var self = this;

            // content -> detail
            self.ui.$content.on('click', 'li a', function(){
                var $item = $(this).closest('li');
                var id = $item.data('target');

                $item.siblings().removeClass('active');
                $item.addClass('active');

                if ($('#'+id).size() > 0){
                    window.location.hash = id;
                    return false;
                }

                self.db.find(id).done(function(data){
                    var historyItem = AjaxHistoryItem.unserialize(data);
                    new AjaxHistoryItemView(historyItem).renderTo(self.ui.$detail);
                    window.location.hash = id;
                }).fail(function(reason, detail){
                    console.log("Load #" + id + " failed: %s:%o", reason, detail);
                    Utils.notice("Load #" + id + " failed:" + reason);
                });

                return false;
            });

            // delete
            self.ui.$detail.on('click', '.delBtn', function(){
                var $item = $(this).closest('.ajax-history-item');
                var id = $item.attr('id');

                if (!window.confirm('Are you sure to remove #' + id + '? \nNote: This operation cannot be undone.')){
                    return false;
                }

                self.db.deleteById(id).done(function(){
                    console.log("#" + id + " removed.");
                    $item.remove();
                    self.ui.$content.find('[data-target="' + id + '"]').remove();
                }).fail(function(reason, detail){
                    console.log("#" + id + " removal failed: %s:%o", reason, detail);
                    Utils.notice("#" + id + " removal failed:" + reason);
                });

                return false;
            });

            // delete from content
            self.ui.$content.on('click', '.btn-remove', function(){
                var $contentItem = $(this).closest('li');
                var id = $contentItem.data('target');

                self.db.deleteById(id).done(function(){
                    console.log("#" + id + " removed.");
                    $contentItem.remove();
                    $('#' + id).remove();
                }).fail(function(reason, detail){
                    console.log("#" + id + " removal failed: %s:%o", reason, detail);
                    Utils.notice("#" + id + " removal failed:" + reason);
                });

                return false;
            });

            // close
            self.ui.$detail.on('click', '.closeBtn', function(){
                $(this).closest('.ajax-history-item').remove();
                return false;
            });

            // refill & resend
            self.ui.$detail.on('click', '.refillBtn, .resendBtn', function(){
                var $item = $(this).closest('.ajax-history-item');
                var id = $item.attr('id');
                var isToResend = $(this).is('.resendBtn');

                self.db.find(id).done(function(data){
                    var historyItem = AjaxHistoryItem.unserialize(data);
                    self.page.actionFillRequest(historyItem.getRequest());
                    if (isToResend){
                        self.page.actionSendRequest();
                    }
                    window.location.hash = '#';
                }).fail(function(reason, detail){
                    console.log("refill #" + id + " failed: %s:%o", reason, detail);
                    Utils.notice("Refill #" + id + " failed:" + reason);
                    window.location.hash = '#';
                });

                return false;
            });

            // export:
            self.ui.$export.on('click', function(){
                self.actionExportJson();
                return false;
            });

            // import:
            self.ui.$import.on('click', function(){
                var $file = $('<input type="file" style="visibility: hidden;display: inline-block; height: 1px; width: 1px;" />');
                $file.appendTo('body');
                $file.on('change', function(){
                    console.log($file[0].files);
                    var file = $file[0].files[0];
                    var fileReader = new FileReader();
                    fileReader.onloadend = function(){
                        var historyItemList = Utils.jsonDecode(this.result);
                        if (!historyItemList){
                            Utils.notice("The imported file's format is incorrect!");
                            return;
                        }

                        var i = 0;
                        var len = historyItemList.length;
                        var successCount = 0;
                        var failCount = 0;

                        var importNext = function(){
                            console.log('import ' + i + '/' + len);
                            if (i >= len){
                                Utils.notice("Imported " + len + " item(s). " + successCount + ' succeeded. ' + failCount + ' failed.');
                                return;
                            }

                            var item = historyItemList[i];

                            if (item.request && item.response){
                                self.add({
                                    request: AjaxRequest.unserialize(item.request),
                                    response: AjaxResponse.unserialize(item.response)
                                }).done(function(){
                                    successCount++;
                                    importNext();
                                }).fail(function(reason){
                                    failCount++;
                                    Utils.notice('#' + i + ' import failed: ' + reason);
                                    importNext();
                                });
                            } else {
                                Utils.notice("#" + i + " is invalid! Ignored.");
                            }

                            i++;
                        };

                        importNext();
                    };
                    fileReader.readAsText(file);
                });
                $file.trigger('click');
            });
        },
        actionExportJson: function(){
            var self = this;
            var data = [];

            self.ui.$download.hide();

            self.db.each(function(historyItemData){
                historyItemData = historyItemData || {};
                historyItemData.request = historyItemData.request || {};
                historyItemData.response = historyItemData.response || {};
                data.push({
                    id: historyItemData.id,
                    request: {
                        type: historyItemData.request.type,
                        url: historyItemData.request.url,
                        param: historyItemData.request.param,
                    },
                    response: {
                        raw: historyItemData.response.raw,
                        elapsedTimeInSeconds: historyItemData.response.elapsedTimeInSeconds
                    }
                });
            }).done(function(){
                var blob = new Blob([JSON.stringify(data)]);
                var url = window.URL.createObjectURL(blob);
                self.ui.$download.attr('href', url).show();
            });
        },
        /**
         * load history
         */
        loadHistory: function(){
            var self = this;
            self.db.each(function(historyItemData){
                var historyItem = AjaxHistoryItem.unserialize(historyItemData);
                new AjaxHistoryContentItemView(historyItem).renderTo(self.ui.$content);
            });
        },
        /**
         * add a ajax request & response
         * @param ajax {{request:AjaxRequest, response:AjaxResponse}}
         */
        add: function(ajax) {
            var self = this;
            var historyItem = new AjaxHistoryItem(ajax);
            return self.db.insert(historyItem.serialize())
                .done(function(item, id, addTime){
                    historyItem.setId(id);
                    new AjaxHistoryContentItemView(historyItem).renderTo(self.ui.$content);
                })
                .fail(function(reason, detail){
                    console.log('add ajax request & response failed: ' + reason + ': %o', detail);
                    Utils.notice('add ajax request & response failed: ' + reason);
                });
        }
    }
});

//================================= views ========================================
/**
 * Define a EJS view render
 * @params instance {templateUrl, init, renderTo}
 * @returns {Function}
 */
function defEjsView(instance){
    var clazz = defClass({
        construct: function(model){
            this.data = instance.init(model);
            return this;
        },
        public: {
            renderTo : function($container){
                clazz._template = (clazz._template || new EJS({url: instance.templateUrl}));
                return instance.renderTo.call(this, $container, clazz._template, this.data);
            }
        }
    });

    return clazz;
}

/**
 * To view an object
 * @type {Function}
 */
var ObjectView = defEjsView({
    templateUrl: 'object.ejs',
    init: function(object){
        return {
            raw: object.raw,
            base64Decoded: object.base64Decoded,
            jsonObject: object.jsonObject,
            jsonPretty: object.jsonPretty || Utils.formatJson(object.jsonObject)
        };
    },
    renderTo: function($container, template, data){
        var $view = $(template.render(data));

        $view.on('click', 'a', function(){
            var $a = $(this);
            var $li = $a.closest('li');
            var $wrapper = $li.closest('.object-wrapper');
            var $target = $wrapper.find('.format.' + $li.data('target'));
            if ($li.is('.active')){
                return false;
            }

            $li.siblings().removeClass('active');
            $target.siblings().removeClass('active');

            $li.addClass('active');
            $target.addClass('active');

            return false;
        });

        if (data.jsonObject){
            new JsonViewer({
                renderTo: $view.find('.object'),
                json: data.jsonObject
            });

            $view.find('li[data-target="object"] a').click();
        } else {
            $view.find('li[data-target="raw"] a').click();
        }

        return $view.appendTo($container.empty());
    }
});

/**
 * Ajax response view
 * @param response {AjaxResponse}
 * @type {Function}
 */
var AjaxResponseView = defEjsView({
    templateUrl: 'ajax-response.ejs',
    init:  function(response){
        return {
            obj: response.toObj(),
            status: response.getStatus(),
            statusText: response.getStatusText(),
            elapsedTimeInSeconds: response.getElapsedTimeInSeconds()
        };
    },
    renderTo: function ($container, template, data){
        var $view = $(template.render(data));

        // sub-view: object
        new ObjectView(data.obj).renderTo($view.find('.response'));

        // expander init
        $view.find('h3').initExpander(true);

        return $view.appendTo($container.empty());
    }
});

/**
 * Ajax的历史记录渲染器
 * @type {*}
 */
var AjaxHistoryItemView = defEjsView({
    templateUrl: 'ajax-history-item.ejs',
    /**
     * @param historyItem {AjaxHistoryItem}
     * @returns {jsonObject}
     */
    init: function(historyItem){
        return {
            id: historyItem.getId(),
            request: {
                type: historyItem.getRequestType(),
                url: historyItem.getRequestUrl(),
                param: historyItem.getRequestParamObj()
            },
            response: historyItem.getResponse()
        };
    },
    /**
     * @param $container {jQuery}
     * @param template {EJS}
     * @param data {{}}
     * @returns {*|jQuery}
     */
    renderTo: function($container, template, data){
        var $view = $(template.render(data));

        $view.find('h2,h3').initExpander(true);

        new ObjectView(data.request.param).renderTo($view.find('.request .param-obj'));
        new AjaxResponseView(data.response).renderTo($view.find('.response'));

        return $view.prependTo($container);
    }
});

/**
 * Ajax历史记录的目录
 * @type {Function}
 */
var AjaxHistoryContentItemView = defEjsView({
    templateUrl: 'ajax-history-content-item.ejs',
    /**
     * @param historyItem {AjaxHistoryItem}
     * @returns {Object}
     */
    init: function(historyItem){
        return {
            id: historyItem.getId(),
            type: historyItem.getRequestType(),
            url: historyItem.getRequestUrl()
        };
    },
    /**
     * @param $container {jQuery}
     * @param template {EJS}
     * @param data {{}}
     * @returns {*|jQuery}
     */
    renderTo: function($container, template, data){
        return $(template.render(data)).prependTo($container);
    }
});


//================================= models =======================================
/**
 * 自动解析参数
 * @type {*}
 */
var AutoParam = defClass({
    construct: function (param) {
        this.raw = param;
        this.format = 'RAW';
        this.jsonObject = null;

        if (this.jsonObject = Utils.jsonDecode(this.raw)) {
            this.format = 'JSON';
        } else if (this.jsonObject = Utils.parseBase64Json(this.raw)) {
            this.format = 'JSON+BASE64';
        }

        return this;
    },
    public: {
        /**
         * 序列化为字符串
         * @returns String
         */
        serialize: function () {
            if (this.jsonObject) {
                return Utils.base64Encode(Utils.jsonEncode(this.jsonObject));
            } else {
                return this.raw;
            }
        },
        /**
         * 转换为格式良好的字符串
         * @returns String
         */
        toPrettyString: function () {
            if (this.jsonObject) {
                return Utils.formatJson(this.jsonObject, {pretty: true});
            } else {
                return this.raw;
            }
        },
        toObj: function () {
            return {
                raw: this.raw,
                base64Decoded: Utils.base64Decode(this.raw),
                jsonPretty: Utils.formatJson(this.jsonObject, {pretty: true}),
                jsonObject: this.jsonObject
            };
        }
    },
    static: {
        unserialize: function(data){
            return new AutoParam(data);
        }
    }
});

/**
 * @constructor
 */
var AjaxRequest = defClass({
    /**
     * @param data {{type,url,param}}
     * @returns {AjaxRequest}
     */
    construct: function(data){
        this.type = (data.type + '').toUpperCase() || 'GET';
        this.url = data.url;
        if (data.param instanceof AutoParam){
            this.param = data.param;
        } else {
            this.param = new AutoParam(data.param);
        }

        return this;
    },
    public: {
        /**
         * send an Ajax request
         */
        send: function(){
            var self = this;
            var type = this.type.toLowerCase();
            var url = this.url;
            var data = this.param.serialize();

            // prepare data
            if (data && type == 'get'){
                url += '?' + data;
                data = '';
            }

            return $.Deferred(function(dfd){
                var xhr = new XMLHttpRequest();
                var startTime = new Date();
                var progressTimerId = setInterval(notifyProgress, 100);

                xhr.onreadystatechange = function(){
                    notifyProgress();
                    if (4 == xhr.readyState){
                        clearInterval(progressTimerId);
                        dfd.resolve(new AjaxResponse({
                            raw: xhr.responseText,
                            status: xhr.status,
                            statusText: xhr.statusText,
                            elapsedTimeInSeconds: +(new Date() - startTime) / 1000
                        }));
                    }
                };

                xhr.onerror = function(){
                    console.error("OnError: %o", arguments);
                    console.error(JSON.stringify(arguments, null, ' '));
                    Utils.notice('Ajax请求失败，可能是由于以下情况：\n' +
                                '    1. 网络故障；\n' +
                                '    2. 服务器未返回应答；\n' +
                                '    3. 服务器不支持跨域请求。\n' +
                                '详细错误信息如下：\n'+
                                JSON.stringify(arguments, null, ' '));
                };

                try {
                    xhr.open(type, url, true);
                    xhr.send(data);
                } catch (e){
                    console.error(e.message);
                    console.error(e.stack);
                }

                function notifyProgress(){
                    dfd.notify({
                        status: xhr.status,
                        statusText: xhr.statusText,
                        readyState: xhr.readyState,
                        readyStateText: Utils.humanizeXhrReadyState(xhr.readyState),
                        seconds: ((+(new Date() - startTime) / 1000) + '').replace(/(\.\d)\d*/,'$1')
                    });
                }
            }).promise();
        },
        getType: function(){
            return this.type;
        },
        getUrl: function(){
            return this.url;
        },
        getParamObj: function(){
            return this.param.toObj();
        },
        getParamStr: function(){
            return this.param.toPrettyString();
        },
        serialize: function(){
            return {
                class: 'AjaxRequest',
                version: 1,
                type: this.getType(),
                url: this.getUrl(),
                param: this.param.serialize()
            }
        }
    },
    static: {
        unserialize: function(data){
            return new AjaxRequest({
                type: data.type,
                url: data.url,
                param: AutoParam.unserialize(data.param)
            });
        }
    }
});

/**
 * Response to Ajax request
 * @constructor
 */
var AjaxResponse = defClass({
    construct: function(data){
        this.raw = data.raw;
        this.status = data.status || 200;
        this.statusText = data.statusText || 'OK';
        this.elapsedTimeInSeconds = data.elapsedTimeInSeconds;

        this._tryParseResponse();

        return this;
    },
    public: {
        _tryParseResponse: function(){
            this.jsonObject = Utils.jsonDecode(this.base64Decoded = Utils.base64Decode(this.raw));
            if (this.jsonObject){
                this.format = 'JSON-BASE64';
                return;
            }

            this.jsonObject = Utils.jsonDecode(this.raw);
            if (!this.jsonObject) {
                this.format = 'RAW';
                return;
            }

            this.format = 'JSON';
            if (typeof this.jsonObject !== 'string'){
                return;
            }

            // in case that object is string, maybe should try parse again

            var obj, base64;
            obj = Utils.jsonDecode(base64 = Utils.base64Decode(this.jsonObject));
            if (obj){
                this.format = 'JSON-BASE74-JSON';
                this.jsonObject = obj;
                this.base64Decoded = base64;
                return;
            }

            obj = Utils.jsonDecode(this.jsonObject);
            if (obj){
                this.format = 'JSON-JSON';
                this.jsonObject = obj;
            }

        },
        getRaw: function(){
            return this.raw;
        },
        getBase64Decoded: function(){
            return this.base64Decoded;
        },
        getJsonObject: function(){
            return this.jsonObject;
        },
        getJsonPretty: function(){
            return Utils.formatJson(this.jsonObject, {pretty: true});
        },
        getStatus: function(){
            return this.status;
        },
        getStatusText: function(){
            return this.statusText;
        },
        getElapsedTimeInSeconds: function(){
            return this.elapsedTimeInSeconds;
        },
        toObj: function(){
            return {
                raw: this.getRaw(),
                base64Decoded: this.getBase64Decoded(),
                jsonPretty: this.getJsonPretty(),
                jsonObject: this.getJsonObject(),
                format: this.format
            };
        },
        serialize: function(){
            return {
                class: "AjaxResponse",
                version: 1,
                raw: this.getRaw(),
                status: this.status,
                statusText: this.statusText,
                elapsedTimeInSeconds: this.getElapsedTimeInSeconds()
            };
        }
    },
    static: {
        unserialize: function(data){
            return new AjaxResponse({
                raw: data.raw,
                status: data.status,
                statusText: data.statusText,
                elapsedTimeInSeconds: data.elapsedTimeInSeconds
            });
        }
    }
});

/**
 * @param ajax {{request:AjaxRequest, response:AjaxResponse}}
 * @type {Function}
 * @constructor
 */
var AjaxHistoryItem = defClass({
    construct: function(ajax){
        this.id = ajax.id;
        this.request = ajax.request;
        this.response = ajax.response;
        return this;
    },
    public: {
        getId: function(){
            return this.id;
        },
        setId: function(id){
            this.id = id;
            return this;
        },
        getRequest: function(){
            return this.request;
        },
        getRequestType: function(){
            return this.request.getType();
        },
        getRequestUrl: function(){
            return this.request.getUrl();
        },
        getRequestParamObj: function(){
            return this.request.getParamObj();
        },
        getResponse: function(){
            return this.response;
        },
        getResponseElapsedTimeInSeconds: function(){
            return this.response.getElapsedTimeInSeconds();
        },
        getResponseObj: function(){
            return this.response.toObj();
        },
        getResponseStatus: function(){
            return this.response.getStatus();
        },
        getResponseStatusText: function(){
            return this.response.getStatusText();
        },
        /**
         * Serialize to plain object
         * @returns {{id: *, request: (String|*), response: (String|*)}}
         */
        serialize: function(){
            return {
                class: 'AjaxHistoryItem', // for future use
                version: 1, // for future use
                id: this.id,
                request: this.request.serialize(),
                response: this.response.serialize()
            };
        }
    },
    static: {
        /**
         * Unserialize from plain object
         * @param data {{}}
         * @returns {AjaxHistoryItem}
         */
        unserialize: function(data){
            return new AjaxHistoryItem({
                id: data.id,
                request: AjaxRequest.unserialize(data.request),
                response: AjaxResponse.unserialize(data.response)
            });
        }
    }
});

/**
 * @returns {UndoManager}
 * @type function
 * @constructor
 */
var UndoManager = defClass({
    construct: function(){
        this.data = { name: 'UndoManager', history: [''], current: 0};
        return this;
    },
    public: {
        add: function(text){
            if (this.data.history[this.data.current] == text){
                return;
            }

            this.data.current++;

            if (this.data.current >= this.data.history.length){
                this.data.history.push(text);
            } else {
                this.data.history[this.data.current] = text;
            }
        },
        undo: function(){
            if (this.data.current > 0){
                this.data.current--;
            }
            return this.data.history[this.data.current];
        },
        redo: function(){
            if (this.data.current < this.data.history.length - 1){
                this.data.current++;
            }
            return this.data.history[this.data.current];
        }
    }
});


/**
 * Object
 * @type {*}
 */
var Utils = {
    /**
     * parse a JSON text to an object
     * @param text
     * @param opt
     * @returns {*}
     */
    parseJson: function(text, opt){
        opt = $.extend({}, { throws: false }, opt);

        if (opt.throws){
            return evalJson(text);
        }

        try{
            return evalJson(text);
        } catch (e){
            return null;
        }

        function evalJson(code){
            eval('function json_eval_function(){ return ' + code + ';}');
            return json_eval_function();
        }
    },
    /**
     * parse a base64 encoded JSON
     * @param text
     * @param opt
     * @returns {*}
     */
    parseBase64Json: function(text, opt){
        return Utils.parseJson(Utils.base64Decode(text), opt);
    },
    /**
     * format JSON object to readable text
     * @param obj
     * @param opt
     * @returns {*}
     */
    formatJson: function(obj, opt){
        opt = $.extend({}, {pretty: true}, opt);
        if (opt.pretty){
            return JSON.stringify(obj, null, '  ');
        } else {
            return JSON.stringify(obj);
        }
    },
    /**
     * encode JSON object to text
     * @param obj
     * @param opt
     * @returns {*}
     */
    jsonEncode: function(obj, opt){
        return Utils.formatJson(obj, {pretty: false});
    },
    /**
     * decode JSON text to object
     * @param text
     * @param opt
     * @returns {*}
     */
    jsonDecode: function(text, opt){
        return Utils.parseJson(text, {throws: false});
    },
    /**
     * using base64 encoding
     * @param text
     * @returns {*}
     */
    base64Encode: function(text){
        return Base64.encode(text);
    },
    /**
     * decode base64 encoded text
     * @param encoded
     * @returns String
     */
    base64Decode: function(encoded, opt){
        opt = $.extend({}, {throws: false}, opt);

        if (opt.throws){
            return Base64.decode(encoded);
        }

        try{
            return Base64.decode(encoded);
        } catch (e){
            return '';
        }
    },
    /**
     * show a notice
     * @param msg
     * @param opt
     */
    notice: function (msg, opt){
        opt = $.extend({}, { clearPrevious: true  }, opt);

        if (opt.clearPrevious){
            $('.notice-wrapper').remove();
        }

        var notice = $('<div class="notice-wrapper"><div class="notice"><div class="msg" ></div><button class="close-btn">X</button></div></div>').prependTo('body').fadeIn();
        notice.find('.msg').text(msg);
        notice.find('.close-btn').on('click', function(){
            notice.remove();
            return false;
        });

        window.scrollTo(0, 0);
    },
    /**
     * 将xhr的readyState转换为人类可读的文字
     * @param readyState
     * @returns {string}
     */
    humanizeXhrReadyState: function(readyState){
        switch (readyState){
            case 0: return 'UNSET';
            case 1: return 'OPENED';
            case 2: return 'HEADERS_RECEIVED';
            case 3: return 'LOADING';
            case 4: return 'DONE';
            default:
                return '' + readyState;
        }
    },
    /**
     * Create an ACE editor, returning some jQuery style adapter
     * @param elemId
     * @param lang
     * @returns {{on: on, focus: focus, val: val}}
     */
    createAceEditor: function (elemId, lang){
        var editor = ace.edit(elemId);
        editor.setTheme('ace/theme/textmate');
        editor.getSession().setMode('ace/mode/' + lang);
        return {
            on: function(event, callback){
                if (event === 'change'){
                    editor.getSession().on('change', Utils.debounce(callback, 3000));
                } else {
                    console.error('Error: Invalid event for ACE editor: ' + event);
                }
                return this;
            },
            focus: function(){
                editor.focus();
                return this;
            },
            val: function(value){
                if (value === undefined){
                    return editor.getValue();
                } else {
                    editor.setValue(value);
                    return this;
                }
            },
            css: function(attr, value){
                $('#' + elemId).css(attr, value);
                if (attr === 'height' || attr === 'width'){
                    editor.resize();
                } else {
                    console.error('Error: Invalid css attribute for ACE editor: ' + attr);
                }
                return this;
            }
        };
    },
    /**
     * debounce it
     * @param callback {Function}
     * @param timeout {Number}
     * @returns {Function}
     */
    debounce: function(callback, timeout){
        var enable = true;
        return function (){
            if (!enable){
                return false;
            }

            enable = false;
            setTimeout(function(){
                enable = true;
            }, timeout || 500);

            return callback.apply(this, arguments);
        };
    }
};

/**
 * 数据库
 * @param dbName
 * @param storeName
 * @returns {IdBasedDbStore}
 * @constructor
 */
function IdBasedDbStore(dbName, storeName){
    dbName = dbName || '__default__';
    storeName = storeName || '__default__';

    var self = this, ID = 'id';
    var db = self.db = $.indexedDB(dbName, {
        "schema": {
            "1": function (versionTransaction) {
                versionTransaction.createObjectStore(storeName);
            }
        }
    });

    /**
     * find by id
     * @param id {Number}
     * @returns $.Deferred done(item, id, addTime))
     */
    self.find = function(id){
        return $.Deferred(function(dfd){
            if (isNaN(id)){
                dfd.reject('ID should be a number: ' + id);
                return;
            }

            id = Number(id);

            db.objectStore(storeName).get(id)
                .done(function(value){
                    if (value && value.addTime){
                        dfd.resolve(value.data, id, value.addTime);
                    } else {
                        console.log('invalid data or data format: id=' + id + ' value: %o', value);
                        dfd.reject('invalid data or data format: id=' + id, arguments);
                    }
                })
                .fail(function(){
                    dfd.reject('failed to find by id: ' + id, arguments);
                });
        });
    };

    /**
     * find next ID
     * @returns $.Deferred done(nextId)
     */
    self.findNextId = function(){
        return $.Deferred(function(dfd){
            db.objectStore(storeName).get(ID)
                .done(function(id){
                    dfd.resolve((Number(id) || 0) + 1);
                })
                .fail(function(){
                    dfd.resolve(1);
                });
        });
    };

    /**
     * Insert an item
     * @param item Object
     * @return $.Deferred done(item, id, addTime)
     */
    self.insert = function(item){
        return $.Deferred(function(dfd){
            var record = {
                data: item,
                addTime: new Date()
            };

            self.findNextId().done(function(nextId){
                item.id = nextId;
                record.id = nextId;

                db.transaction([storeName])
                    .progress(function(t){
                        var store = t.objectStore(storeName);
                        store.delete(ID).done(function(){
                            store.add(nextId, ID).fail(function(){
                                dfd.reject('Set ID to ' + nextId + ' failed', arguments);
                            });
                        }).fail(function(){
                            dfd.reject('Delete ID failed', arguments);
                        });

                        store.add(record, nextId).done(function(){
                            dfd.resolve(item, nextId, record.addTime);
                        }).fail(function(){
                            dfd.reject('Add record #'+nextId+' failed', arguments);
                        });
                    })
                    .fail(function(){
                        dfd.reject('Transaction failed', arguments);
                    })
                    .done(function(){
                        dfd.resolve(item, nextId, record.addTime);
                    });
            }).fail(function(){
                dfd.reject('Failed to find next ID', arguments);
            });
        });
    };

    /**
     * Delete an item by ID
     * @param id {Number}
     * @returns $.Deferred done(id)
     */
    self.deleteById = function(id){
        id = isNaN(id) ? id : Number(id);
        return $.Deferred(function(dfd){
            db.transaction([storeName])
                .progress(function(t){
                    t.objectStore(storeName).delete(id);
                }).done(function() {
                    dfd.resolve(id);
                }).fail(function() {
                    dfd.reject("Transaction aborted", arguments);
                });
            return dfd.promise();
        });
    };

    /**
     * walk though all items
     * @param iterator (data, id, addTime)
     * @returns $.Deferred done(??)
     */
    self.each = function(iterator){
        return db.objectStore(storeName).each(function(record){
            if (record.key != 'id'){
                iterator(record.value.data, Number(record.key) || record.key, record.value.addTime);
            }
        });
    };

    /**
     * count all items
     * @returns $.Deferred done(count, event)
     */
    self.count = function(){
        return db.objectStore(storeName).count();
    };

    return this;
}

// ///////// test db:
function print(msg){
    return function(){
        console.log(msg + ": %o", arguments);
    };
}
function testDfd(msg, dfd){
    return dfd.progress(print(msg + ' progress'))
        .done(print(msg + ' done'))
        .fail(print(msg + ' fail'));
}

//var db = new IdBasedDbStore('test');
//testDfd('count', db.count()).done(function () {
//    testDfd('insert data1', db.insert({a: 1, b: 2})).done(function () {
//        testDfd('insert data2', db.insert({a: 3, b: 4})).done(function () {
//            testDfd('each1', db.each(print('iter'))).done(function () {
//                testDfd('delete', db.deleteById(1)).done(function () {
//                    testDfd('each2', db.each(print('iter')));
//                });
//            });
//        });
//    });
//});

/////////////////////////////////////////////////////////////////////////////
// utils
/////////////////////////////////////////////////////////////////////////////
/**
 * [TemplateHelper]
 * @param html
 * @returns {string}
 */
function escape_html(html){
    var e = document.createElement('div');
    e.textContent = html;
    e.innerText = html;
    return e.innerHTML;
}

/**
 * [TemplateHelper]
 * @param htmlAttr {string}
 * @returns {string|*}
 */
function escape_html_attr(htmlAttr){
    return escape_html(htmlAttr).replace(/\\|'|"/g, function(match){
        return '\\' + match;
    });
}

/**
 * clone an object
 * @param obj
 * @returns {*}
 */
function clone(obj){
    return $.extend({}, obj || {});
}

/**
 * Notice
 * @returns {*}
 */
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


//=================== run =====================
var page = new AjaxPageController().init();

//==================== web ====================
$(function(){
    if (!localStorage.hasShownNotice){
        showNotice().done(function(){
            localStorage.hasShownNotice = true;
        });
    }
    
    if (/\.net/i.test(navigator.appVersion)){
        window.alert('I bet you must be using IE. Arn\'t you? Chrome and firefox are recommended for you to get the best browsing experience.');
    }
});
