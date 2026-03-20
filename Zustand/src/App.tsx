// 使用 store
import useCounterStore from './store/useConterStore'

import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'


function App() {
  // 使用“逐个 selector”避免每次返回新对象导致的重复订阅/更新。
  // 使用 useCounterStore 获取 store 中的状态和方法
  // state 👉 是 Zustand 自动传进来的， 整个 store 对象（包含 state、actions）
  // state.count 👉 是 store 中的状态
  const count = useCounterStore((state) => state.count);
  // state.increment 👉 是 store 中的方法
  const increment = useCounterStore((state) => state.increment);
  // state.decrement 👉 是 store 中的方法
  const decrement = useCounterStore((state) => state.decrement);

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <hr />
        {/* 组件中使用 Zustand 状态管理 */}
        <h2>Zustand 状态管理中的 count 值为：{count}</h2>
        <button onClick={increment}>+1</button>
        <button onClick={decrement}>-1</button>
        <hr />
      </section>
    </>
  );
}

export default App;
