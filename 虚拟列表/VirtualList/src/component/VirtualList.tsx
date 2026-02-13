import React from "react";
import { useRef } from "react";
import { useState } from "react";
import { useMemo } from "react";
import { useLayoutEffect } from "react";


export type VirtualListItem = {
  uid: string | number;
  value: React.ReactNode;
};

type VirtualListProps<T extends VirtualListItem> = {
  listData: T[]; 
  itemSize: number; // 每项固定高度(px)
  height: number; // 容器可视高度(px)
  overscan?: number; // 上下多渲染几条，避免快速滚动白屏
  renderItem?: (item: T, index: number) => React.ReactNode;
};

export function VirtualList<T extends VirtualListItem>({
  listData,  // 完整数据数组
  itemSize,  // 每条固定高度(px)
  height,  // 容器 可视高度(px)
  overscan = 3,  // 上下多渲染几条（3~5）
  renderItem,  // 自定义渲染函数（可选）
}: VirtualListProps<T>) {
  // 获取 容器 DOM 元素
  const containerRef = useRef<HTMLDivElement | null>(null);
  // 记录用户滚动 距离 （多少px）
  const [scrollTop, setScrollTop] = useState(0);

  // 1) 占位总高度：让滚动条“看起来像完整列表”
  

  // 2) 可视区最多能显示多少条
  

  // 3) 根据 scrollTop 算 startIndex / endIndex
  

  // 加 overscan缓冲区域，滚动更顺滑（可选但非常推荐）
  

  // 4) 需要渲染的数据切片
  

  // 5) 偏移量：让“这段切片”出现在它该出现的位置
  

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // 如果你希望外部高度变化时也能对齐，可以在这里强制读取一次
  useLayoutEffect(() => {
    // no-op：保留位置，未来可扩展为读取真实 clientHeight
    void containerRef.current;
  }, [height]);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{
        position: "relative",
        overflow: "auto",
        height,
        border: "1px solid #ddd",
      }}
    >
      {/* 占位元素：撑出总高度 */}
      <div style={{ height: containerHeight }} />

      {/* 渲染层：整体下移 offset */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          transform: `translate3d(0, ${offset}px, 0)`,
          willChange: "transform",
        }}
      >
        {renderedItems.map((item, i) => {
          const realIndex = safeStart + i;
          return (
            <div
              key={item.uid}
              style={{
                height: itemSize,
                boxSizing: "border-box",
                borderBottom: "1px solid #eee",
                display: "flex",
                alignItems: "center",
                padding: "0 12px",
                background: "white",
              }}
            >
              {renderItem ? renderItem(item, realIndex) : item.value}
            </div>
          );
        })}
      </div>
    </div>
  );
}
