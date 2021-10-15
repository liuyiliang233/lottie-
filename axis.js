'use strict';
const fs = require('fs');
const md5 = require('md5');
const path = require('path');
const pify = require('pify');
const chalk = require('chalk');
const pPipe = require('p-pipe');
const rimraf = require('rimraf');
const moment = require('moment');
const globby = require('globby');
const request = require('request');
const makeDir = require('make-dir');
const fileType = require('file-type');
const zipFolder = require('zip-folder');
const replaceExt = require('replace-ext');
const imageminWebp = require('imagemin-webp');
const imageminJpegtran = require('imagemin-jpegtran');
const imageminPngquant = require('imagemin-pngquant');

const fsP = pify(fs);

function shortMd5(data, length = 6) {
  return md5(data).substring(0, length);
}

function bytesToSize(bytes, fix = 10) {
  const sizes = [ 'B', 'KB', 'MB', 'GB', 'TB' ];
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  const num = Math.round(fix * bytes / Math.pow(1024, i)) / fix;
  return `${num}${sizes[i]}`;
}

const rimrafP = path => new Promise((resolve, reject) => {
  rimraf(path, (err, res) => {
    if (err) reject(err);
    resolve(res);
  });
});

// TODO: processImage should more smart
const processImage = (input, output, { minify, smart, plugins, element, register }) => fsP.readFile(input).then(data => {
  let useMinify = minify;
  const up = element.u + element.p;
  const md5 = shortMd5(data);
  element.md5 = md5;
  register[up] = { md5 };

  if (plugins && !Array.isArray(plugins)) {
    throw new TypeError('The `plugins` option should be an `Array`');
  }

  console.log(231);

  console.log('神他妈没返回', 234, plugins, data);

  const pipe = minify ? pPipe(plugins)(data) : Promise.resolve(data);

  return pipe
    .then(buffer => {
      const ret = {
        data: buffer,
        path: (fileType(buffer) && fileType(buffer).ext === 'webp') ? replaceExt(output, '.webp') : output,
      };

      if (!output) {
        return ret;
      }

      return makeDir(path.dirname(ret.path))
        .then(() => fsP.writeFile(ret.path, ret.data))
        .then(() => {
          const preSize = fs.statSync(input).size;
          const postSize = fs.statSync(output).size;
          if (minify && smart) {
            // console.log(postSize / preSize);
            if (postSize / preSize > 0.6 && (preSize - postSize) < 10 * 1024) {
              useMinify = false;
              ret.data = data;
              return fsP.writeFile(ret.path, data)
                .then(() => ({ before: preSize, after: preSize }));
            }
          }
          return Promise.resolve({ before: preSize, after: postSize });
        })
        .then(({ before, after }) => {
          const theme1 = useMinify ? chalk.greenBright : chalk.cyan;
          const theme2 = useMinify ? chalk.blueBright : chalk.blue;
          if (plugins.length > 0) {
            console.log(
              theme1(useMinify ? '✔ 压缩' : '✗ 压缩'),
              theme1(up),
              theme2(bytesToSize(before)),
              theme1('➜ '),
              theme2(bytesToSize(after))
            );
          }
        });
    })
    .catch(error => {
      error.message = `Error in file: ${input}\n\n${error.message}`;
      throw error;
    });
});

const domain = {
  write: {
    national: 'http://write.image.uc.cn:8080',
    international: 'http://write.img.ucweb.com:8020',
  },
  read: {
    national: '//image.uc.cn/s/uae/g/1y',
    international: '//img.ucweb.com/s/uae/g/1y',
  },
  uploadToken: 'NnY2R3YWJqdGFtc2h6eWdqMjF5ZHu',
};

const zipPack = (packPath, zipFilePath) => new Promise((resolve, reject) => {
  zipFolder(packPath, zipFilePath, err => {
    if (err) {
      reject(err);
    } else {
      resolve(zipFilePath);
    }
  });
});

const postToCDN = (uploadUrl, zipFilePath) => new Promise((resolve, reject) => {
  request({
    url: uploadUrl,
    method: 'POST',
    formData: {
      file: fs.createReadStream(zipFilePath),
    },
  }, (err, res) => {
    if (err) {
      reject(err);
    } else if (res.statusCode === 200) {
      resolve(res.body);
    } else {
      reject(new Error(res.body));
    }
  });
});

function putPackToCDN({ packPath, uploadUrl, zipFilePath }) {
  return zipPack(packPath, zipFilePath)
    .then(() => postToCDN(uploadUrl, zipFilePath));
}

function processAnimate({ minify, smart, rootPath, packPath, filePath, animate, plugins, register }) {
  const { assets } = animate;

  const imageAssets = assets.filter(element => {
    const isImage = element.u && element.p;
    const processed = register[element.u + element.p];
    if (isImage && processed) {
      element.md5 = processed.md5;
      return false;
    }
    return isImage && !processed;
  });

  return Promise.all(imageAssets.map(element => {
    const input = path.resolve(rootPath, element.u, element.p);
    const output = path.resolve(packPath, element.u, element.p);
    return processImage(input, output, { minify, smart, plugins, element, register });
  })).then(() => {
    return {
      jsonPath: path.join(packPath, path.basename(filePath)),
      md5: shortMd5(JSON.stringify(animate)),
      animate,
    };
  }).catch(err => {
    console.log(err);
  });
}

module.exports = function(rootPath, { minify, smart, webp, national }) {
  const plugins = minify ? webp ? [ imageminWebp() ] : [ imageminJpegtran(), imageminPngquant() ] : [];
  const register = {};
  const packPath = path.resolve(rootPath, 'tmp');
  const month = moment().format('YYYYMM');
  const filename = 'archive';
  const zipFilePath = path.join(path.dirname(packPath), `${filename}.zip`);

  console.log(chalk.yellow('\n◉ 处理图片：', `minify：${minify}`, `smart：${smart}`));
  globby([ rootPath + '/*.json' ], { onlyFiles: true })
    .then(paths => Promise.all(paths.map(filePath => {
      const animate = require(filePath);
      return processAnimate({ minify, smart, rootPath, packPath, filePath, animate, plugins, register });
    })))
    .then(animates => {
      const write = national ? domain.write.national : domain.write.international;
      const read = national ? domain.read.national : domain.read.international;
      const md5s = animates.map(element => {
        return element.md5;
      }).sort();

      const md5Animates = shortMd5(JSON.stringify(md5s.join('')) + minify + webp);
      const targetDir = `animate/${month}/${md5Animates}`;

      const urlPrefix = `${read}/${targetDir}`;
      console.log(chalk.yellow('\n◉ 输出产物：'));
      animates.forEach(({ animate, jsonPath }) => {
        animate.prefix = urlPrefix;
        fs.writeFileSync(jsonPath, JSON.stringify(animate));
        console.log(chalk.greenBright(`http:${urlPrefix}/${path.basename(jsonPath)}`));
      });

      const uploadUrl = `${write}/e/uaeext/${domain.uploadToken}?op=put&name=${filename}.needunziparchive&dir=${targetDir}`;
      return putPackToCDN({
        packPath,
        uploadUrl,
        zipFilePath,
      });
    })
    .then(() => {
      return Promise.all([ rimrafP(packPath), rimrafP(zipFilePath) ])
        .then(() => {
          console.log(chalk.yellow('\n◉ 完成：'));
          console.log(chalk.gray('clear up build stage and exit'));
        });
    });
};
