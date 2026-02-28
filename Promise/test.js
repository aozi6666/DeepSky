// 构造 request 对象
function makeRequest(request_url) {
    // request 对象结构
    let request = {
        method: 'Get',
        url: request_url,
        Headers: '',
        body: '',
        // 请求是否带凭证 默认不带 Cookie
        /* 
        xhr.withCredentials（布尔值） 是否在跨域请求时使用凭证
        true：跨域请求也允许带 Cookie
        （前提是服务端允许 CORS 并开启 Access-Control-Allow-Credentials: true，
          而且不能用 * 作为允许源）
         */
        Credentials: false,
        async: true,  // 是否异步请求 默认异步
        ResponseType: 'text',  // 响应类型 默认 text
        /* 请求头里的 Referer引用地址（来源页面地址） */
        referrer: '',  
        timeout: 3000,  // 请求超时时间 默认 3000ms
    }

    // 返回 request 对象
    return request;
}

// 请求细节封装进 XFetch 函数
/*
//[输入] request，请求信息，请求头，延时值，返回类型等，两个回调函数（resolve, reject）
//[输出] resolve, 执行成功，回调该函数
//[输出] reject  执行失败，回调该函数 
*/
function XFetch(request, resolve, reject) {
    // 创建 XMLHttpRequest 对象
    let xhr = new XMLHttpRequest();

    // 处理请求超时
    xhr.ontimeout = function (e) {
        reject(e);
    }
    // 处理请求错误
    xhr.onerror = function (e) {
        reject(e);
    }
    // 状态变化 回调（触发多次）
    xhr.onreadystatechange = function () {
        if(xhr.readyState === 200) {
            resolve(xhr.response);
        }
    }

    // 打开请求
    xhr.open(request.method, request.url, request.async);

    // 配置参数
    xhr.timeout = request.timeout;
    xhr.responseType = request.ResponseType;

    // 发送请求
    xhr.send();
}

// 线程执行:
XFetch(makeRequest('https://time.geekbang.org'),
    function resolve(data) {
        console.log(data);
    },
    function reject(e) {
        console.log(e);
    }
)