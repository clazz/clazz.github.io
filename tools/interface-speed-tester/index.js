
function calc_averange(data){
    var sum = 0;
    for (var i = 0; i < data.length; i++){
        sum += data[i];
    }
    return sum / data.length;
}
function min(data){
    var m = 9999999;
    for (var i = 0; i < data.length; i++){
        m = data[i] < m ? data[i] : m;
    }
    return m;
}
function max(data){
    var m = 0;
    for (var i = 0; i < data.length; i++){
        m = data[i] > m ? data[i] : m;
    }
    return m;
}
function reportProcess(msg){
    if (append.checked){
        process_indicator.innerHTML += msg + "<br/>";
    } else {
        process_indicator.innerHTML = msg + "<br/>";
    }

}
function reportResult(msg){
    result.innerHTML += msg + "<br/>";
}
function onRequestReadyStateChange(evt){
    var xhttp = evt.currentTarget;
    var cookie = evt.currentTarget.cookie;
    var i = cookie['i'];
    var count = cookie['count'];
    var start = cookie['start'];
    reportProcess("Received request[" + i + '] status: ' + xhttp.status + " readyState: " + xhttp.readyState +
        " text: " + xhttp.responseText);
    if (xhttp.readyState == 4 && xhttp.status == 200) {
        var end = new Date();
        var delta = (end - start);
        deltas.push(delta);
        reportResult('[' + i + "] +" + delta + "(ms) : " + xhttp.responseText);
        if (deltas.length == count) {
            reportResult(" Averange: " + calc_averange(deltas) + "(ms) " +
                " Min: " + min(deltas) + "(ms) " +
                " Max: " + max(deltas) + "(ms)");
            reportProcess("ALL requests completed.");
        }
    }

}
function doRequest() {
    window.deltas = [];
    for (var i = 0; i < count.value; i++) {
        reportProcess("Make request[" + i + ']...');
        var xhttp = new XMLHttpRequest();
        var start = new Date();
        xhttp.cookie = {'i': i, 'count': count.value, 'start': start };
        xhttp.onreadystatechange = onRequestReadyStateChange;
        xhttp.open(method.value, url.value, sync.checked);
        xhttp.send();

    }
}