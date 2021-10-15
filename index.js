class ExeJSZip {
  // 用于获取url地址对应的文件内容
  getBinaryContent(url, progressFn = () => {}) {
    return new Promise((resolve, reject) => {
      // if (typeof url !== "string" || !/https?:/.test(url))
      //   reject(new Error("url 参数不合法"));
        fetch({
          method: 'get',
          url: zipUrl,
        }).then(res => {
          console.log(66, res);
          resolve(res);
        });
      // JSZipUtils.getBinaryContent(url, { // JSZipUtils来自于jszip-utils这个库
      //   progress: progressFn,
      //   callback: (err, data) => {
      //     if (err) {
      //       reject(err);
      //     } else {
      //       resolve(data);
      //     }
      //   },
      // });
    });
  }
  
  // 遍历Zip文件
  async iterateZipFile(data, iterationFn) {
    if (typeof iterationFn !== "function") {
      throw new Error("iterationFn 不是函数类型");
    }
    let zip;
    try {
      zip = await JSZip.loadAsync(data); // JSZip来自于jszip这个库
      zip.forEach(iterationFn);
      return zip;
    } catch (error) {
      throw new error();
    }
  }
}

const zipUrlEle = document.querySelector("#zipUrl");
const statusEle = document.querySelector("#status");
const fileList = document.querySelector("#fileList");
const exeJSZip = new ExeJSZip();

// 执行在线解压操作
async function unzipOnline() {
  fileList.innerHTML = "";
  statusEle.innerText = "开始下载文件...";
  const data = await exeJSZip.getBinaryContent(
    zipUrlEle.value,
    handleProgress
  );
  let items = "";
  await exeJSZip.iterateZipFile(data, (relativePath, zipEntry) => {
    items += `<li class=${zipEntry.dir ? "caret" : "indent"}>
      ${zipEntry.name}</li>`;
  });
  statusEle.innerText = "ZIP文件解压成功";
  fileList.innerHTML = items;
}

// 处理下载进度
function handleProgress(progressData) {
  const { percent, loaded, total } = progressData;
  if (loaded === total) {
    statusEle.innerText = "文件已下载，努力解压中";
  }
}

