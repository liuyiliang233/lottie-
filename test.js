const JSZip = require('jszip');
const fs = require('fs');
const axios = require('axios');
const child_process = require('child_process');
const publish = require('./axis');

const zip = new JSZip();

const url = 'http://' + 'www.baidu.com';

// create a file
// zip.file("hello.txt", "Hello World\n");

// read a zip file
// NODE环境， 本地文件
new JSZip.external.Promise(function (resolve, reject) {
  fs.readFile("dh.zip", function(err, data) {
      if (err) {
          reject(e);
      } else {
          resolve(data);
      }
  });
}).then(function (data) {
  return zip.loadAsync(data, {createFolders: true});
}).then(arrayBuffer => {
  const base = zip.file('动画/data.json').async('arraybuffer');
  base.then(text => {
    const jsonData = new Uint8Array(text);
    const str = String.fromCharCode.apply(null, jsonData);
    const res = JSON.parse(str);

    // console.log("jsonData", res);

    publish('./animations', {minify: true, smart: true, webp: false, national: true});

    // if (process.platform == 'wind32') {
    //   cmd = 'start "%ProgramFiles%\Internet Explorer\iexplore.exe"';
    // } else if (process.platform == 'linux') {
    //   cmd = 'xdg-open';
    // } else if (process.platform == 'darwin') {
    //   cmd = 'open';
    // }
    // child_process.exec(`${cmd} "${url}"`);
  })      
})

// 线上环境，链接
// axios('https://g.alicdn.com/eva-assets/2e41285f4800445234d6dae597aee67c/0.0.1/tmp/4d51f/d89386e5-4c03-4657-a5c2-d4f2dee0a97e.zip')
//   .then(function (response) { 
//     console.log('123', response);                  
//       if (response.status === 200 || response.status === 0) {
//           return Promise.resolve(response.data);
//       } else {
//           return Promise.reject(new Error(response.statusText));
//       }
//   })
//   .then((data) => {
//         return JSZip.loadAsync(data);
//    })                      
//   .then(function (zip) {
//       console.log(7777, zip);
//       return zip.file("data.json").async("string"); 
//   })
//   .then(function success(text) {    
//     console.log('2323', text);    
//     JSZip.file('data.json').name;          
//     JSZip.file('data.json').async('string');          
//     JSZip.file('data.json').dir;          
//   }, function error(e) {
//     console.log('4444', e);  
//   });
