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

function XFetch(requset) {
    // 执行器函数:把 resolve/reject “交给 Promise 管”
    function executor(resolve, reject) {
        // XML实例
        let xhr = new XMLHttpRequest();

        // 超时处理
        xhr.ontimeout = function(e) {
            reject(e);
        }
        // 错误处理
        xhr.onerror = function(e) {
            reject(e);
        }

        // 状态变化
        xhr.onreadystatechange = function() {
            // this.readyState === 4 等价于 xhr.readyState === 4 (箭头函数不用this)
            if(this.readyState === 4) {
                if(this.status === 200) {
                    resolve(this.responseText)
                } else {
                    // 
                    let error ={
                        code: this.status,
                        response: this.response
                    }
                    reject(error, this);
                }
            }
        }

        // 打开 
        xhr.open('GET',request.url,true);

        // 发送请求 
        xhr.send();
    }

    // 创建并返回 Promise 对象,立即执行 executor
    return new Promise(executor);
}


// 实际业务代码
let x1 = XFetch(makeRequest('https://time.geekbang.org/?category'));

let x2 = x1.then(value => {
    console.log(value);
    return XFetch(makeRequest('https://www.geekbang.org/column'))
})

let x3 = x2.then(value => {
    console.log(value);
    return XFetch(makeRequest('https://time.geekbang.org'))
})

x3.catch(error => { 
    console.log(error);
})

// 业务代码
let demo = XFetch(request);

