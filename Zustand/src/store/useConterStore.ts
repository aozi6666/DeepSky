/* 
    👉 Zustand:
    创建一个“全局状态对象”
        -1. 定义状态（state）
        -2. 定义 actions 修改方法（actions）
        -3. 创建 store（create）
        -4. 导出 store（export default useCounterStore）
    导出一个函数: useCounterStore, 组件可以 去“取里面的东西”（state、actions）
*/
import { create } from "zustand";

type CounterState = {
  count: number;
};

type CounterActions = {
  increment: () => void;
  decrement: () => void;
};

type CounterStore = CounterState & CounterActions;

// 创建 store
// 1. set： Zustand 给的“修改状态的方法”，修改 store 状态的唯一入口
//       类似于：✅ 全局版的 setState
// 👉 创建一个全局仓库，并拿到修改工具 set（类似 useState 的 setState）
const useCounterStore = create<CounterStore>((set) => ({
  // 状态
  count: 0,

  // actions 修改方法： set(某个函数)
  // 这个函数可以 “拿到当前 state → 返回新的 state”
  // state： Zustand 自动传进来的“当前状态”
  increment: () =>
    set((state) => ({
      count: state.count + 1,
    })),

  decrement: () =>
    set((state) => ({
      count: state.count - 1,
    })),
}));

// 导出一个函数: useCounterStore, 组件可以 去“取里面的东西”（state、actions）
export default useCounterStore;