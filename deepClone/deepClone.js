/* 
    对象/数组 深拷贝:
     - obj：你要拷贝的对象
     - new WeakMap()：一个“记录表”:记录“哪个 旧对象 已经对应拷贝成 哪个新对象了”
     - WeakMap： 键key-值value对 容器，但是 键必须是 Object对象
                 用来记录“旧对象和新对象的对应关系”
                 - map.set(旧对象, 新对象)
                 - map.get(旧对象) // 拿到对应的新对象
*/
function deepClone(obj, map = new WeakMap()) {
    // 不是对象 or 是 null，直接返回，
    // 基本类型不处理： 字符串 数字 布尔值 undefined null
    // JS中： typeof null === 'object'
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    // 处理循环引用：obj 之前已经拷贝过了
    if (map.has(obj)) {
        // 直接返回 之前拷好的那个新对象（避免重新拷贝）
        return map.get(obj);
    }

    // 创建 新对象/新数组 （数组也是对象）
    const newObj = Array.isArray(obj) ? [] : {};

    // 递归拷贝之前，先把“旧对象 -> 新对象”的对应关系存起来，避免递归死循环
    map.set(obj, newObj);

    // 遍历对象自身属性
    // for ... in ... 遍历 obj 里所有可枚举属性名（默认包括原型链上的对象）
    for (const key in obj) {
        /*
            - key: 属性名; obj[key]: 属性值
            - hasOwnProperty()函数： 判断 某个属性 是不是对象“自己本身的”
                                   （不是 原型链 继承下来的）
            - Object.prototype.hasOwnProperty（）：
                            借用“对象原型”上那个 原装 hasOwnProperty函数 来判断 obj
            - call(obj, key)： 把这个方法借给 obj 用一下，并传入参数 key,检查 obj 有没有 key 这个属性
            - .call: 让某个函数以 指定对象作为“this” 来执行
        */
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // 递归: 拷贝每个属性
            // 取出obj某个key属性，它对应的值 obj[key]，深拷贝后放到新对象 newObj[key] 值里
            newObj[key] = deepClone(obj[key], map);
        }
    }

    return newObj;
}

// ========= 对象的 属性定义值 (包括self) ========= // 
const obj = {
    name: 'Tom',
    age: 18,
    info: {
        city: 'Beijing'
    },
    hobby: ['code', 'music']
};

obj.self = obj; // 循环引用
// ========= 对象的 属性定义值 (包括self) ========= // 

// ========= 调用深拷贝函数 ========= // 
const copy = deepClone(obj);
// ========= 调用深拷贝函数 ========= // 

// ========= 赋值验证是否深拷贝成功 ========= // 
copy.info.city = 'Shanghai';
copy.hobby[0] = 'game';

console.log(obj.info.city);   // Beijing
console.log(obj.hobby[0]);    // code
console.log(copy.self === copy); // true
// ========= 赋值验证是否深拷贝成功 ========= // 