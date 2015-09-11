
/**
 * 简单数据库
 * @param dbName string  数据库名
 * @param storeName string 数据仓库名
 * @returns {SimpleDatabase}
 * @constructor
 * @note provided by IndexedDB
 */
function SimpleDatabase(dbName, storeName){
    var self = this;
    dbName = dbName || '__default__';
    storeName = storeName || '__default__';
    var _db = self._db = $.indexedDB(dbName, {
        "schema": {
            "1": function (versionTransaction) {
                versionTransaction.createObjectStore(storeName);
            }
        }
    });

    var isLogEnabled = false;

    /**
     * 在使能日志功能时记录日志，同console.log
     */
    function log(){
        if (isLogEnabled){
            console.log.apply(console, arguments);
        }
    }

    /**
     * 使能日志功能
     * @param toEnable bool 是否使能
     */
    self.enableLog = function(toEnable){
        isLogEnabled = (toEnable === undefined ? true : toEnable);
    }

    /**
     * 添加一个key-value的数据
     * @param key
     * @param value
     * @returns $.Deferred
     */
    self.add = function(key, value){
        return _db.transaction([storeName]).then(function () {
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

    /**
     * 基于key删除数据
     * @param key
     * @returns $.Deferred
     */
    self.remove = function(key){
        return _db.transaction([storeName]).then(function () {
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

    /**
     * 删除所有数据
     * @type $.Deferred
     */
    self.removeAll = self.clear = function(){
        return _db.transaction([storeName]).then(function () {
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

    /**
     * 更新一个数据
     * @type {update}
     */
    self.set = self.update = function(key, value){
        self.remove(key);
        return self.add(key, value);
    };

    self.find = function(key){
        return _db.objectStore(storeName).get(key).then(function (value) {
            log("Data got %o", arguments);
        }, function () {
            log("Error getting data");
        });
    }

    self.each = function(iterator){
        return _db.transaction([storeName]).then(function () {
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
        return _db.transaction([storeName]).then(function () {
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
        return _db.objectStore(storeName).count();
    }

    return this;
}