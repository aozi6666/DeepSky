function deepClone(obj, map = new WeakObj()){

    // 1) 基本数据类型，直接返回
    if(typeof obj !== 'object' || obj === null) return;

    // 自身引用
    if(map.has(obj)) {
        return map.get(obj);
    }

    // 2) 创建 新对象/数组
    const newObj = Array.isArray ? [] : {};

    // 3) 
    map.set(obj, newObj);

    // 递归循环 深拷贝
    for(let key in map){
        if(Object.prototype.hasOwnProperty.call(obj, key)) {
            newObj[key] = deepClone(obj[key], map);
        }
    }

    // 返回新对象
    return newObj;
}

const obj = {
  key: '我是key属性',
  name: 'Tom'
};
const key = 'name'

console.log(obj.key); // 我是key属性
console.log(obj[key]); 