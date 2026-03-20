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
const useCounterStore = create<CounterStore>((set) => ({
  // 状态
  count: 0,

  // actions 修改方法
  increment: () =>
    set((state) => ({
      count: state.count + 1,
    })),

  decrement: () =>
    set((state) => ({
      count: state.count - 1,
    })),
}));

export default useCounterStore;