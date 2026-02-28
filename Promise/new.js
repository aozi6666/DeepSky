/**
 * - 用 XMLHttpRequest 发请求
 * - 再用 Promise 把“异步结果”包装起来：成功走 resolve，失败走 reject
 * - 这样外部就可以用 then/catch（以及链式 then）来写更清晰的异步流程
 */

// 构造 request 对象（把请求的各种配置放到一个对象里）
function makeRequest(request_url) {
    // request 对象结构：这里的字段是“自定义的配置”，不是浏览器内置标准
    let request = {
        method: 'Get',
        url: request_url,
        Headers: '',
        body: '',
        // 请求是否带凭证：默认不带 Cookie
        /* 
        xhr.withCredentials（布尔值） 是否在跨域请求时使用凭证
        true：跨域请求也允许带 Cookie
        （前提是服务端允许 CORS 并开启 Access-Control-Allow-Credentials: true，
          而且不能用 * 作为允许源）
         */
        Credentials: false,
        async: true,  // 是否异步请求：默认异步（XHR 的 open 第三个参数也对应 async）
        ResponseType: 'text',  // 希望的响应类型：默认 text（此字段需你在代码里真正设置到 xhr.responseType 才生效）
        /* 来源页面地址（请求头里的 Referer） */
        referrer: '',  
        timeout: 3000,  // 请求超时时间：默认 3000ms（此字段需你在代码里真正设置到 xhr.timeout 才生效）
    }

    // 返回 request 对象
    return request;
}

function XFetch(request) {
    /**
     * XFetch 的目标：返回一个 Promise，让外部可以：XFetch(...).then(...).catch(...)
     * - Promise 构造函数会立刻执行 executor，并把 resolve/reject 传进来
     * - 你只需要在“请求成功/失败/超时/异常”时调用 resolve/reject
     */

    // 执行器函数：由 Promise 立即调用，resolve/reject 用来“通知 Promise 结果”
    function executor(resolve, reject) {
        // 创建 XHR 实例（真正发网络请求的对象）
        let xhr = new XMLHttpRequest();

        // 超时处理：到时间还没完成，就当失败
        xhr.ontimeout = function(e) {
            reject(e);
        }
        // 网络错误处理：比如断网、DNS 失败等（注意：HTTP 404/500 不会触发 onerror）
        xhr.onerror = function(e) {
            reject(e);
        }

        // readyState 变化：请求过程中会多次触发，最终完成时 readyState === 4
        xhr.onreadystatechange = function() {
            // this.readyState === 4 等价于 xhr.readyState === 4（这里用普通函数，所以 this 指向 xhr）
            if(this.readyState === 4) {
                if(this.status === 200) {
                    // HTTP 200：把“成功结果”交给 Promise（触发 then）
                    resolve(this.responseText)
                } else {
                    // 非 200：把“失败原因”交给 Promise（触发 catch 或 then 的第二个参数）
                    let error ={
                        code: this.status,
                        response: this.response
                    }
                    // reject 接收第一个参数作为 reason
                    reject(error);
                }
            }
        }

        // 打开连接：method / url / async
        xhr.open('GET',request.url,true);

        // 发送请求：GET 一般不需要 body
        xhr.send();
    }

    // 创建并返回 Promise 对象：new Promise(executor) 会立刻执行 executor
    return new Promise(executor);
}

// ========================
// 实际业务代码（使用示例）
// ========================
function onSuccess(data) {
    console.log('成功拿到数据：', data)
}
  
function onFail(err) {
    console.log('失败了：', err)
}

const p = XFetch(request)
// then：成功回调；catch：失败回调（语义上等价于 then(null, onFail)）
p.then(onSuccess).catch(onFail)
// 这行会先输出，因为 XHR 是异步的（Promise 只是“承诺未来给结果”，不会阻塞当前线程）
console.log('A')


// 例子：链式调用
// - then 里 return 一个新的 Promise（这里是再次请求）
// - 下一次 then 会等待这个 Promise 完成后再执行
let x1 = XFetch(makeRequest('https://time.geekbang.org/?category'));

let x2 = x1.then(value => {
    console.log(value);
    return XFetch(makeRequest('https://www.geekbang.org/column'))
})

let x3 = x2.then(value => {
    console.log(value);
    return XFetch(makeRequest('https://time.geekbang.org'))
})

// 链式末尾统一处理错误：任意一个环节 reject，都会走到这里
x3.catch(error => { 
    console.log(error);
})
