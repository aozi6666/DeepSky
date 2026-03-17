const url = 'ws://localhost:8080';

const ws = new WebSocket(url);


// 连接状态
/*  - CONNECTING：正在连接
    - OPEN：已打开
    - CLOSING：正在关闭
    - CLOSED：已关闭
*/
ws.CONNECTING
ws.OPEN
ws.CLOSED
ws.CLOSING
if (!ws || ws.readyState !== WebSocket.OPEN) 

// 事件
// 1. 连接打开时触发（网络层连通）
ws.on('open', () => {
    console.log('WebSocket连接成功！');
});

/* 
 2. 收到消息时触发（对方发来一条消息）
   - 解析 JSON
   - 判断 响应 or 事件event
   - 更新 UI 
   - resolve Promised对象
*/
ws.on('message', (data) => {
    console.log('收到消息:', data.toString());
})

/*
  3. 连接关闭时触发
    - 修改状态
    - 清理资源
    - 尝试重连
*/
ws.on('close', () => {
    console.log('连接关闭')
})

ws.on('error', (err) => {
    console.log('ws连接错误:', err)
})


// 实例方法
/* 
   - 发送消息: 这条连接上写一条消息给对方。
*/
ws.send(JSON.stringify({
    type: 'req',
    id: '123',
    method: 'chat.send',
    params: { message: '你好' }
}));

// 主动关闭
ws.close();  



