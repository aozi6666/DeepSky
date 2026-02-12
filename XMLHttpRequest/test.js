function GetWebData(URL) {
    const xhr = new XMLHttpRequest();
  
    xhr.onreadystatechange = function () {
      switch (xhr.readyState) {
        case 0:
          console.log("0: UNSENT（刚创建，还没 open）");
          break;
        case 1:
          console.log("1: OPENED（已 open）");
          break;
        case 2:
          console.log("2: HEADERS_RECEIVED（响应头到）");
          break;
        case 3:
          console.log("3: LOADING（响应体下载中）");
          break;
        case 4:
          console.log("4: DONE（完成）");
          if (xhr.status === 200 || xhr.status === 304) {
            console.log("响应内容：", xhr.responseText);
          } else {
            console.log("请求失败，status=", xhr.status);
          }
          break;
      }
    };
  
    xhr.ontimeout = function () {
      console.log("请求超时");
    };
  
    xhr.onerror = function () {
      console.log("网络错误/被浏览器拦截（可能跨域）");
    };
  
    xhr.open("GET", URL, true);
    xhr.timeout = 3000;
    xhr.responseType = "text";
    xhr.setRequestHeader("X_TEST", "time.geekbang");
  
    xhr.send();
  }
  