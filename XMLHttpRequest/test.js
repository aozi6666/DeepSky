function GetWebData(URL) {
    // 1. 新建 XMLHttpRequest 请求对象
    const xhr = new XMLHttpRequest();
  
    xhr.onreadystatechange = function () {
      // 2. 处理请求结果
      switch (xhr.readyState) {
        case 0:  // 请求未初始化
          console.log("0: UNSENT(刚创建，还没 open)");
          break;
        case 1: // OPENED打开
          console.log("1: OPENED(已 open)");
          break;
        case 2: // HEADERS_RECEIVED响应头接收完成
          console.log("2: HEADERS_RECEIVED(响应头到了)");
          break;
        case 3: // LOADING正在接收响应体
          console.log("3: LOADING(响应体下载中)");
          break;
        case 4: // DONE接收完成
          console.log("4: DONE(完成)");
          if (xhr.status === 200 || xhr.status === 304) {
            console.log("响应内容：", xhr.responseText);
          } else {
            console.log("请求失败,status=", xhr.status);
          }
          break;
      }
    };
  
    // 3. 处理请求超时
    xhr.ontimeout = function (e) {
      console.log("请求超时");
    };
  
    // 4. 处理请求错误
    xhr.onerror = function (e) {
      console.log("网络错误/被浏览器拦截（可能跨域）");
    };
  
    // 5. 打开请求
    xhr.open("GET", URL, true);  // 创建一个 Get 请求, 地址：URL, ture：异步

    // 6. 配置参数
    xhr.timeout = 3000;  // 设置 xhr 请求的超时时间
    xhr.responseType = "text"; // 设置响应返回的数据格式
    xhr.setRequestHeader("X_TEST", "time.geekbang"); // 设置请求头
  
    // 7. 发送请求
    xhr.send();
  }
  