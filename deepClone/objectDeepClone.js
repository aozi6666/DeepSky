function deepClone(obj, map = new WeakMap()){
    // 1. 基础数据类型，直接返回（包括Null）
    if(typeof obj !== 'object' || obj === null){
        return obj;
    }

    // 2. 处理循环引用
    if(map.has(obj)){
        return map.get(obj);
    }


    //3.新建 对象，用于拷贝
    const newObj = Array.isArray(obj) ? [] : {};

    // 4. 遍历自身属性
    for(let key in obj){
         // 使用原型链上的方法,进行赋值
         if(Onject.prototype.hasOwnPrototype.call(obj, key)){
            // 递归赋值
            new[key] = deepClone(obj[key], map);
         }
    }

    // 5. 返回
    return newObj;

}

const obj = {
  key: '我是key属性',
  name: 'Tom'
};
const key = 'name'

console.log(obj.key); // 我是key属性
console.log(obj[key]); 