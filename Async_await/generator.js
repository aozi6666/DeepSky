// 构造器函数
function* genDemo() {
    // yield 关键字会暂停函数的执行
    // 填入 IteratorResult 迭代结果对象 的 value 值
    console.log(" 开始执行第一段 ");
    yield '第一次 yield';  

    console.log(" 开始执行第二段 ");
    yield '第二次 yield';

    console.log(" 开始执行第三段 ");
    yield '第三次 yield';

    console.log(" 执行结束 ");
    return 'generator end';
}

console.log('start');

// 生成 可迭代对象 generator
// 调用 genDemo 构造器函数并不会执行函数体
// 只会返回一个 生成器对象（iterator / iterable）
let gen = genDemo();

// gen.next()会生成并返回一个 IteratorResult 迭代结果对象 
// { value: 任意值, done: 布尔值 }
console.log(gen.next());
console.log('第一次调用 next() 方法');
conlog.log(gen.next().value);

console.log('第二次调用 next() 方法');
console.log(gen.next().value);

console.log('第三次调用 next() 方法');
console.log(gen.next().value);

console.log('最后一次调用 next() 方法');
console.log(gen.next().value);

console.log('end');