
function view_json(){
    var obj = parseJson($("#param").val());
    var viewer = new JsonViewer({
        renderTo: $('<div></div>').prependTo($("#json-viewer")),
        json: obj
    });
    window.viewer = viewer;
}

function decode_param(){
    var param = $("#param").val().trim();
    if (param){
        var base64 = Base64.decode(param);
        base64 = base64 || param;
        var output = formatJson(base64);
        output = output || base64;
        $("#param").val(output);
    }
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