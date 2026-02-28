// ✅ mini-async：用 Generator + Promise 手写一个“像 async/await 的执行器”
function run(genFn) {
    // 1) 调用 generator 函数，得到生成器对象（迭代器）
    const gen = genFn()
  
    // 2) 返回一个 Promise，让 run(...) 本身也像 async 函数一样可 then/await
    return new Promise((resolve, reject) => {
      // 3) 这是“自动驾驶”的关键：不断推进 generator
      function step(type, arg) {
        let result
        try {
          // 4) 根据 type 决定是 next 还是 throw
          //    - next(arg): 把 arg 作为“上一个 yield 表达式的结果”塞回 generator
          //    - throw(arg): 把错误抛回 generator，让它能被 try/catch 捕获
          result = type === 'next' ? gen.next(arg) : gen.throw(arg)
        } catch (err) {
          // 5) generator 内部如果没处理错误，这里就会抛出来，直接 reject
          reject(err)
          return
        }
  
        const { value, done } = result
        // 6) done=true：说明 generator 执行完了（遇到 return），收尾 resolve
        if (done) {
          resolve(value)
          return
        }
  
        // 7) done=false：说明停在某个 yield 上
        //    这里约定：yield 出来的是 Promise（或普通值也行，我们用 Promise.resolve 包一层）
        Promise.resolve(value).then(
          // 8) Promise 成功：把结果塞回 generator，让它从 yield 后继续跑
          (val) => step('next', val),
          // 9) Promise 失败：把错误塞回 generator（等价于在 yield 那行抛异常）
          (err) => step('throw', err)
        )
      }
  
      // 10) 第一次启动：相当于 gen.next()，让 generator 先跑到第一个 yield
      step('next')
    })
  }
  
  /* ------------------ 用法演示 ------------------ */
  
  // 你写的“看起来同步”的异步流程（像 await 一样）
  function* foo() {
    try {
      // A) 第一次 yield：把 fetch 返回的 Promise 交出去，暂停
      const response1 = yield fetch('https://www.geekbang.org')
      console.log('response1:', response1)
  
      // B) 第二次 yield：继续下一次异步
      const response2 = yield fetch('https://www.geekbang.org/test')
      console.log('response2:', response2)
  
      // C) return 会成为 run(foo) 最终 resolve 的值
      return 'all done'
    } catch (e) {
      // 如果某个 Promise reject，就会走到这里（因为我们用 gen.throw(err) 丢回来了）
      console.error('caught inside generator:', e)
      throw e
    }
  }
  
  // run(foo) 像 async 函数一样：返回 Promise
  run(foo).then(
    (finalVal) => console.log('final:', finalVal),
    (err) => console.log('run failed:', err)
  )
  