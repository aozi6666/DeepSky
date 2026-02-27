import XMLHttpRequest from 'xmlhttprequest';

// 执行状态
// 成功状态 回调 
function onResolve(response) {
    console.log(response);
}
// 失败状态 回调
function onReject(error) {
    console.log(error);
}

// 构造 XML 实例对象
let xhr = new XMLHttpRequest();
// 超时状态 回调
xhr.ontimeout = function(e) {
    onReject(e);
}
// 错误状态 回调
xhr.onerror = function(e) {
    onReject(e);
}
// 读取状态 回调
xhr.onreadystatechange = function(e) {
    onResolve(xhr.response);
}

// 设置请求类型 'Get' 、请求的 URL 地址 、是否同步信息
let URL = 'https://time.geekbang.com'
xhr.open('Get', URL, true);

// 设置参数
xhr.timeout = 3000; // 设置超时时间
xhr.responseType = 'text'; // 设置响应类型
// 设置请求头
xhr.setRequestHeader("X_TEST","time.geekbang")

// 发送请求
xhr.send();
