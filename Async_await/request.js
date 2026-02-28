// Promise 访问方式
fetch('https://time.geekbang.org/')
    .then((response) => {
        console.log(response);
        return fetch('https://time.geekbang.org/test')
    }).then((response) => {
        console.log(response);
    }).catch((error) => {
        console.log(error);
    });


// Async/await 访问方式
async function foo() {
    try {
        // 等待 fetch 请求完成
        let response1 = await fetch('https://time.geekbang.org/');
        console.log('response1:', response1);

        // 等待 fetch 请求完成
        let response2 = await fetch('https://time.geekbang.org/test');
        console.log('response2:', response2);
    } catch (error) {
        console.log('error:', error);
    }
}
foo();