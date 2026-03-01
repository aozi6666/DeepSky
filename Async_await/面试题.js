async function foo() {
    console.log(1);
    let a = await 100;
    console.log(a);
    console.log(2);
}

console.log(0);
foo();
console.log(3);

// 0 1 3 100 2 

// 等价于
async function foo() {
    console.log(1);
    // let a = await 100; 相当于下面这段
    // ✅ 这段相当于 await 之后的续写（微任务）
    //  value 值 100 赋给了变量 a，然后执行 then 中的回调函数，打印出 100 和 2
    return new Promise.resolve(100).then((a) => {
        console.log(a);
        console.log(2);
    })
}